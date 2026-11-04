-- Migrates purchases_suppliers rows into expenses, with no legacy column on expenses: a
-- purchase is matched to its expense by fingerprint (supplier_id, created_at, net_amount =
-- amount_ars), which also makes a re-run skip rows already migrated.

BEGIN;

-- Known limitation: run once. Migrated expenses are recognised by supplier_id + created_at +
-- net_amount, so re-running after a migrated expense's supplier or amount was edited will insert a duplicate.

DO $$
BEGIN
  IF to_regclass('public.purchases_suppliers') IS NULL THEN
    RAISE EXCEPTION 'public.purchases_suppliers does not exist -- nothing to migrate.';
  END IF;
END $$;

-- App must be paused for this migration: SHARE MODE blocks concurrent writes to purchases_suppliers
-- for the duration of the transaction, so no purchase can be inserted mid-migration and be missed.
LOCK TABLE public.purchases_suppliers IN SHARE MODE;

-- payments_suppliers is locked too, only if present, purely as an extra guard: this script never
-- writes to it, but SHARE MODE stops anyone else from doing so while we snapshot/verify it below.
DO $$
BEGIN
  IF to_regclass('public.payments_suppliers') IS NOT NULL THEN
    EXECUTE 'LOCK TABLE public.payments_suppliers IN SHARE MODE';
  END IF;
END $$;

-- Snapshot payments_suppliers (existence + count + sum) before touching anything, so the
-- verification block at the end can prove this script left it completely untouched.
CREATE TEMP TABLE _migrate01_payments_suppliers_snapshot (
  table_existed boolean,
  row_count bigint,
  amount_sum numeric
) ON COMMIT DROP;

DO $$
DECLARE
  v_exists boolean := to_regclass('public.payments_suppliers') IS NOT NULL;
  v_count bigint := 0;
  v_sum numeric := 0;
BEGIN
  IF v_exists THEN
    EXECUTE 'SELECT count(*), coalesce(sum(amount_ars), 0) FROM public.payments_suppliers'
      INTO v_count, v_sum;
  END IF;
  INSERT INTO _migrate01_payments_suppliers_snapshot VALUES (v_exists, v_count, v_sum);
END $$;

-- PREREQUISITE ASSERTIONS: expenses.sql RUN PRODUCTION block must already be applied
DO $$
DECLARE
  v_missing text[] := ARRAY[]::text[];
  v_desc_constraint_def text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'public.expenses'::regclass AND attname = 'voucher_type_id' AND attnotnull
  ) THEN
    v_missing := v_missing || 'expenses.voucher_type_id is still NOT NULL'::text;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'public.expenses'::regclass AND attname = 'supplier_id' AND attnotnull
  ) THEN
    v_missing := v_missing || 'expenses.supplier_id is still NOT NULL'::text;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'public.expenses'::regclass AND attname = 'category_id' AND attnotnull
  ) THEN
    v_missing := v_missing || 'expenses.category_id is still NOT NULL'::text;
  END IF;

  SELECT pg_get_constraintdef(oid) INTO v_desc_constraint_def
  FROM pg_constraint
  WHERE conrelid = 'public.expenses'::regclass AND conname = 'expenses_description_length_check';

  IF v_desc_constraint_def IS NULL THEN
    v_missing := v_missing || 'constraint expenses_description_length_check not found on public.expenses'::text;
  ELSIF v_desc_constraint_def NOT LIKE '%2000%' THEN
    v_missing := v_missing || format('expenses_description_length_check does not allow 2000 chars (found: %s)', v_desc_constraint_def);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.expenses'::regclass
      AND tgname = 'trg_expenses_compute_iva_and_total' AND NOT tgisinternal
  ) THEN
    v_missing := v_missing || 'trigger trg_expenses_compute_iva_and_total missing on public.expenses'::text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.expenses'::regclass AND conname = 'expenses_net_amount_decimals_check'
  ) THEN
    v_missing := v_missing || 'constraint expenses_net_amount_decimals_check missing on public.expenses'::text;
  END IF;

  IF array_length(v_missing, 1) > 0 THEN
    RAISE EXCEPTION E'Prerequisite checks failed -- run the RUN PRODUCTION block of expenses.sql before this script. Missing/unsatisfied:\n%',
      array_to_string(v_missing, E'\n');
  END IF;

  RAISE NOTICE 'Prerequisite checks passed: expenses.sql RUN PRODUCTION block is already applied.';
END $$;

-- PRE-FLIGHT: abort before any insert if source data can't satisfy target constraints -----------
DO $$
DECLARE
  v_bad_decimals bigint;
  v_bad_category bigint;
  v_bad_payment_method bigint;
  v_bad_bank_account bigint;
  v_bad_notes bigint;
  v_dup_groups bigint;
  v_dup_rows bigint;
  v_ps_exists boolean := to_regclass('public.payments_suppliers') IS NOT NULL;
  v_ps_rows bigint := 0;
BEGIN
  SELECT count(*) INTO v_bad_decimals
  FROM public.purchases_suppliers WHERE amount_ars <> round(amount_ars, 2);
  IF v_bad_decimals > 0 THEN
    RAISE EXCEPTION 'Pre-flight failed: % purchases_suppliers rows have amount_ars with more than 2 decimals (violates expenses_net_amount_decimals_check)', v_bad_decimals;
  END IF;

  SELECT count(*) INTO v_bad_category
  FROM public.purchases_suppliers ps
  WHERE ps.category_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.cash_flow_categories c WHERE c.id = ps.category_id AND c.kind = 'expense');
  IF v_bad_category > 0 THEN
    RAISE EXCEPTION 'Pre-flight failed: % purchases_suppliers rows reference a category_id missing from cash_flow_categories (kind=expense)', v_bad_category;
  END IF;

  SELECT count(*) INTO v_bad_payment_method
  FROM public.purchases_suppliers ps
  WHERE ps.payment_method_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.payment_methods pm WHERE pm.id = ps.payment_method_id);
  IF v_bad_payment_method > 0 THEN
    RAISE EXCEPTION 'Pre-flight failed: % purchases_suppliers rows reference a missing payment_method_id', v_bad_payment_method;
  END IF;

  SELECT count(*) INTO v_bad_bank_account
  FROM public.purchases_suppliers ps
  WHERE ps.bank_account_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.bank_accounts ba WHERE ba.id = ps.bank_account_id);
  IF v_bad_bank_account > 0 THEN
    RAISE EXCEPTION 'Pre-flight failed: % purchases_suppliers rows reference a missing bank_account_id', v_bad_bank_account;
  END IF;

  SELECT count(*) INTO v_bad_notes
  FROM public.purchases_suppliers WHERE notes IS NOT NULL AND char_length(notes) > 2000;
  IF v_bad_notes > 0 THEN
    RAISE EXCEPTION 'Pre-flight failed: % purchases_suppliers rows have notes longer than 2000 chars', v_bad_notes;
  END IF;

  -- Guard: the fingerprint (supplier_id, created_at, amount_ars) must uniquely identify a
  -- purchase. If two or more rows share one, the fingerprint can't tell them apart.
  WITH dup_groups AS (
    SELECT supplier_id, created_at, amount_ars, count(*) AS c
    FROM public.purchases_suppliers
    GROUP BY supplier_id, created_at, amount_ars
    HAVING count(*) > 1
  )
  SELECT count(*), coalesce(sum(c), 0) INTO v_dup_groups, v_dup_rows FROM dup_groups;
  IF v_dup_groups > 0 THEN
    RAISE EXCEPTION 'Pre-flight failed: % purchases_suppliers row(s) across % fingerprint group(s) share the same (supplier_id, created_at, amount_ars) -- the fingerprint cannot tell them apart. Resolve the duplicates before running this migration.', v_dup_rows, v_dup_groups;
  END IF;

  -- Guard: this script migrates ONLY purchases. If payments_suppliers has rows, migrating
  -- purchases now would make them show as fully pending despite being paid in the old table.
  IF v_ps_exists THEN
    EXECUTE 'SELECT count(*) FROM public.payments_suppliers' INTO v_ps_rows;
    IF v_ps_rows > 0 THEN
      RAISE EXCEPTION 'Pre-flight failed: public.payments_suppliers has % row(s), but this script does NOT migrate supplier payments. Running it now would make every migrated purchase show as fully pending debt in the app, and (once cash_flow_movement_totals.sql/cash_flow_summary_monthly.sql are redeployed) those % payment(s) would stop counting in cash-flow totals. Migrate or clear payments_suppliers (and its files) before running this script.', v_ps_rows, v_ps_rows;
    ELSE
      RAISE NOTICE 'public.payments_suppliers exists and is empty -- safe to proceed.';
    END IF;
  ELSE
    RAISE NOTICE 'public.payments_suppliers does not exist -- safe to proceed.';
  END IF;

  RAISE NOTICE 'Pre-flight checks passed: no decimal/FK/notes-length/duplicate-fingerprint violations found, payments_suppliers has nothing to lose';
END $$;

-- INSERT: skip purchases already migrated (an expense already exists with the same fingerprint) --
DO $$
DECLARE
  v_total bigint;
  v_inserted bigint;
BEGIN
  SELECT count(*) INTO v_total FROM public.purchases_suppliers;

  WITH ins AS (
    INSERT INTO public.expenses (
      date,
      created_at,
      voucher_number,
      voucher_type_id,
      work_id,
      supplier_id,
      category_id,
      kind,
      description,
      net_amount,
      iva_percent,
      payment_method_id,
      bank_account_id
    )
    SELECT
      (ps.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date,
      ps.created_at,
      ps.receipt_number,
      NULL::bigint,
      ps.work_id,
      ps.supplier_id,
      ps.category_id,
      'expense',
      ps.notes,
      ps.amount_ars,
      0,
      ps.payment_method_id,
      ps.bank_account_id
    FROM public.purchases_suppliers ps
    WHERE NOT EXISTS (
      SELECT 1 FROM public.expenses e
      WHERE e.supplier_id = ps.supplier_id
        AND e.created_at = ps.created_at
        AND e.net_amount = ps.amount_ars
    )
    RETURNING 1
  )
  SELECT count(*) INTO v_inserted FROM ins;

  RAISE NOTICE 'Migration insert: % purchases_suppliers row(s) total, % inserted as new expenses, % already migrated (fingerprint match) skipped',
    v_total, v_inserted, v_total - v_inserted;
END $$;

-- Verification: abort the whole migration (ROLLBACK via exception) on any mismatch --------------
DO $$
DECLARE
  v_purchases_count bigint;
  v_bad_match bigint;
  v_bad_match_ids text;
  v_purchases_sum numeric;
  v_expenses_sum numeric;
  v_row_mismatch bigint;
  v_row_mismatch_ids text;
  v_ps_existed_before boolean;
  v_ps_count_before bigint;
  v_ps_sum_before numeric;
  v_ps_exists_after boolean := to_regclass('public.payments_suppliers') IS NOT NULL;
  v_ps_count_after bigint := 0;
  v_ps_sum_after numeric := 0;
BEGIN
  SELECT count(*) INTO v_purchases_count FROM public.purchases_suppliers;

  -- Every purchase must have exactly ONE matching expense by fingerprint (no 0, no 2+).
  WITH match_counts AS (
    SELECT ps.id, count(e.id) AS match_count
    FROM public.purchases_suppliers ps
    LEFT JOIN public.expenses e
      ON e.supplier_id = ps.supplier_id
     AND e.created_at = ps.created_at
     AND e.net_amount = ps.amount_ars
    GROUP BY ps.id
  )
  SELECT
    (SELECT count(*) FROM match_counts WHERE match_count <> 1),
    (SELECT string_agg(id::text, ', ' ORDER BY id) FROM (SELECT id FROM match_counts WHERE match_count <> 1 ORDER BY id LIMIT 10) s)
  INTO v_bad_match, v_bad_match_ids;

  IF v_bad_match > 0 THEN
    RAISE EXCEPTION 'Migration mismatch: % purchases_suppliers row(s) do not have exactly one matching expense by fingerprint (supplier_id, created_at, net_amount = amount_ars). Sample ids: %', v_bad_match, v_bad_match_ids;
  END IF;

  SELECT coalesce(sum(ps.amount_ars), 0) INTO v_purchases_sum FROM public.purchases_suppliers ps;
  SELECT coalesce(sum(e.total_amount), 0) INTO v_expenses_sum
  FROM public.purchases_suppliers ps
  JOIN public.expenses e
    ON e.supplier_id = ps.supplier_id
   AND e.created_at = ps.created_at
   AND e.net_amount = ps.amount_ars;

  IF v_purchases_sum <> v_expenses_sum THEN
    RAISE EXCEPTION
      'Migration mismatch: SUM(purchases_suppliers.amount_ars)=% but SUM(matched expenses.total_amount)=%',
      v_purchases_sum, v_expenses_sum;
  END IF;

  WITH row_mismatches AS (
    SELECT ps.id
    FROM public.purchases_suppliers ps
    JOIN public.expenses e
      ON e.supplier_id = ps.supplier_id
     AND e.created_at = ps.created_at
     AND e.net_amount = ps.amount_ars
    WHERE (
      e.work_id IS DISTINCT FROM ps.work_id
      OR e.category_id IS DISTINCT FROM ps.category_id
      OR e.payment_method_id IS DISTINCT FROM ps.payment_method_id
      OR e.bank_account_id IS DISTINCT FROM ps.bank_account_id
      OR e.voucher_number IS DISTINCT FROM ps.receipt_number
      OR e.description IS DISTINCT FROM ps.notes
      OR e.date IS DISTINCT FROM (ps.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
      OR e.iva_percent <> 0
      OR e.voucher_type_id IS NOT NULL
    )
  )
  SELECT
    (SELECT count(*) FROM row_mismatches),
    (SELECT string_agg(id::text, ', ' ORDER BY id) FROM (SELECT id FROM row_mismatches ORDER BY id LIMIT 10) s)
  INTO v_row_mismatch, v_row_mismatch_ids;
  IF v_row_mismatch > 0 THEN
    RAISE EXCEPTION
      'Migration mismatch: % matched expenses have a secondary column that differs from their purchases_suppliers source row. Sample purchases_suppliers ids: %',
      v_row_mismatch, v_row_mismatch_ids;
  END IF;

  -- payments_suppliers must be byte-identical to its pre-migration snapshot: this script never
  -- writes to it.
  SELECT table_existed, row_count, amount_sum
  INTO v_ps_existed_before, v_ps_count_before, v_ps_sum_before
  FROM _migrate01_payments_suppliers_snapshot;

  IF v_ps_exists_after THEN
    EXECUTE 'SELECT count(*), coalesce(sum(amount_ars), 0) FROM public.payments_suppliers'
      INTO v_ps_count_after, v_ps_sum_after;
  END IF;

  IF v_ps_existed_before IS DISTINCT FROM v_ps_exists_after
     OR v_ps_count_before IS DISTINCT FROM v_ps_count_after
     OR v_ps_sum_before IS DISTINCT FROM v_ps_sum_after THEN
    RAISE EXCEPTION
      'Migration mismatch: public.payments_suppliers changed during this script (existed before=%, after=%; count before=%, after=%; sum before=%, after=%). This script must NEVER modify payments_suppliers.',
      v_ps_existed_before, v_ps_exists_after, v_ps_count_before, v_ps_count_after, v_ps_sum_before, v_ps_sum_after;
  END IF;

  RAISE NOTICE
    'Migration verified OK: % purchases matched 1:1 with expenses by fingerprint, payments_suppliers untouched (existed=%, rows=%)',
    v_purchases_count, v_ps_exists_after, v_ps_count_after;
END $$;

COMMIT;
