-- Drops the retired purchases_suppliers / payments_suppliers tables (and their file tables), now
-- that supplier purchases/payments are plain expenses/payments rows (see
-- .kb/decisions/unified-expenses-payments-single-table.md). DEV only.
--
-- Two hard guards abort the transaction before dropping anything: (1) payments_suppliers or either
-- files_*_suppliers table still has rows, (2) a purchases_suppliers row has no matching expense by
-- fingerprint (supplier_id, created_at, net_amount = amount_ars), i.e. it was never migrated by
-- 01-migrate-purchases-to-expenses.sql.
--
-- Run order (after 01): expenses.sql and payments.sql (RUN PRODUCTION section, if the legacy
-- supplier tables exist), files_expenses.sql, files_payments.sql, 01,
-- cash-flow-stats/cash_flow_summary_monthly.sql (defines cash_flow_summary_monthly,
-- cash_flow_fixed_costs_monthly and cash_flow_movement_totals -- no separate 02/03 files in this
-- repo), suppliers/suppliers.sql (get_suppliers_accounts_summary block), 04, deploy the app, then
-- this file (05) once both guards pass.
--
-- Idempotent: dependency guard + DROP TABLE IF EXISTS throughout; safe to re-run (second run is a
-- no-op once everything is already dropped). Also safe when payments_suppliers and the
-- files_*_suppliers tables never existed (to_regclass guards throughout).

BEGIN;

DO $guard$
DECLARE
  v_missing          text[] := ARRAY[]::text[];
  v_fn_offenders     text[];
  v_view_offenders   text[];
  v_trigger_offenders text[];
  v_policy_offenders text[];
  v_fk_offenders     text[];
  v_offenders        text[] := ARRAY[]::text[];
BEGIN

  IF to_regprocedure('public.list_supplier_purchases(bigint, text, date, date, int, int)') IS NULL THEN
    v_missing := v_missing || 'function public.list_supplier_purchases(bigint, text, date, date, int, int)'::text;
  END IF;
  IF to_regprocedure('public.get_supplier_account_totals(bigint)') IS NULL THEN
    v_missing := v_missing || 'function public.get_supplier_account_totals(bigint)'::text;
  END IF;
  IF to_regprocedure('public.delete_purchase_supplier(bigint)') IS NULL THEN
    v_missing := v_missing || 'function public.delete_purchase_supplier(bigint)'::text;
  END IF;
  IF to_regprocedure('public.delete_payment_supplier(bigint)') IS NULL THEN
    v_missing := v_missing || 'function public.delete_payment_supplier(bigint)'::text;
  END IF;
  IF to_regprocedure('public.get_suppliers_accounts_summary()') IS NULL THEN
    v_missing := v_missing || 'function public.get_suppliers_accounts_summary()'::text;
  END IF;
  IF to_regprocedure('public.cash_flow_summary_monthly(int)') IS NULL THEN
    v_missing := v_missing || 'function public.cash_flow_summary_monthly(int)'::text;
  END IF;
  IF to_regprocedure('public.cash_flow_movement_totals(text, date, date)') IS NULL THEN
    v_missing := v_missing || 'function public.cash_flow_movement_totals(text, date, date)'::text;
  END IF;
  IF to_regclass('public.files_expenses') IS NULL THEN
    v_missing := v_missing || 'table public.files_expenses'::text;
  END IF;
  IF to_regclass('public.files_payments') IS NULL THEN
    v_missing := v_missing || 'table public.files_payments'::text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'expense_id'
  ) THEN
    v_missing := v_missing || 'column public.payments.expense_id'::text;
  END IF;

  IF array_length(v_missing, 1) > 0 THEN
    RAISE EXCEPTION E'ABORTADO / ABORTED: faltan objetos unificados que este script requiere antes de poder dropear las tablas legacy. / Required unified objects are missing -- run cash_flow_summary_monthly.sql and suppliers.sql (get_suppliers_accounts_summary block) first. Missing:\n%',
      array_to_string(v_missing, E'\n');
  END IF;

  SELECT array_agg(DISTINCT p.oid::regprocedure::text)
  INTO v_fn_offenders
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND (
      regexp_replace(regexp_replace(p.prosrc, '/\*.*?\*/', '', 'g'), '--[^\n]*', '', 'g') ~* 'purchases_suppliers'
      OR regexp_replace(regexp_replace(p.prosrc, '/\*.*?\*/', '', 'g'), '--[^\n]*', '', 'g') ~* 'payments_suppliers'
    );
  -- Note: "purchases_suppliers" / "payments_suppliers" as substrings also catch
  -- files_purchases_suppliers / files_payments_suppliers references.

  IF v_fn_offenders IS NOT NULL THEN
    v_offenders := v_offenders || ('FUNCIONES/FUNCTIONS que referencian tablas legacy: ' || array_to_string(v_fn_offenders, ', '))::text;
  END IF;

  -- (b) Views / materialized views on OTHER tables that depend on the legacy tables.
  WITH legacy(tbl) AS (
    VALUES ('public.purchases_suppliers'), ('public.payments_suppliers'),
           ('public.files_purchases_suppliers'), ('public.files_payments_suppliers')
  ),
  legacy_oids AS (
    SELECT to_regclass(tbl) AS oid FROM legacy WHERE to_regclass(tbl) IS NOT NULL
  )
  SELECT array_agg(DISTINCT c.oid::regclass::text || ' (' || CASE c.relkind WHEN 'm' THEN 'materialized view' ELSE 'view' END || ')')
  INTO v_view_offenders
  FROM pg_depend d
  JOIN pg_rewrite rw ON rw.oid = d.objid
  JOIN pg_class c ON c.oid = rw.ev_class
  WHERE d.classid = 'pg_rewrite'::regclass
    AND d.refclassid = 'pg_class'::regclass
    AND d.refobjid IN (SELECT oid FROM legacy_oids)
    AND c.relkind IN ('v', 'm')
    AND c.oid NOT IN (SELECT oid FROM legacy_oids);

  IF v_view_offenders IS NOT NULL THEN
    v_offenders := v_offenders || ('VISTAS/VIEWS que dependen de tablas legacy: ' || array_to_string(v_view_offenders, ', '))::text;
  END IF;

  -- (b) Triggers on OTHER tables whose trigger function body references the legacy tables.
  WITH legacy(tbl) AS (
    VALUES ('public.purchases_suppliers'), ('public.payments_suppliers'),
           ('public.files_purchases_suppliers'), ('public.files_payments_suppliers')
  ),
  legacy_oids AS (
    SELECT to_regclass(tbl) AS oid FROM legacy WHERE to_regclass(tbl) IS NOT NULL
  )
  SELECT array_agg(DISTINCT t.tgrelid::regclass::text || ' (trigger: ' || t.tgname || ')')
  INTO v_trigger_offenders
  FROM pg_trigger t
  JOIN pg_proc p ON p.oid = t.tgfoid
  WHERE NOT t.tgisinternal
    AND t.tgrelid NOT IN (SELECT oid FROM legacy_oids)
    AND (
      regexp_replace(regexp_replace(p.prosrc, '/\*.*?\*/', '', 'g'), '--[^\n]*', '', 'g') ~* 'purchases_suppliers'
      OR regexp_replace(regexp_replace(p.prosrc, '/\*.*?\*/', '', 'g'), '--[^\n]*', '', 'g') ~* 'payments_suppliers'
    );

  IF v_trigger_offenders IS NOT NULL THEN
    v_offenders := v_offenders || ('TRIGGERS en otras tablas que referencian tablas legacy: ' || array_to_string(v_trigger_offenders, ', '))::text;
  END IF;

  -- (b) RLS policies on OTHER tables whose USING/WITH CHECK expression references the legacy tables.
  SELECT array_agg(DISTINCT schemaname || '.' || tablename || ' (policy: ' || policyname || ')')
  INTO v_policy_offenders
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename NOT IN ('purchases_suppliers', 'payments_suppliers', 'files_purchases_suppliers', 'files_payments_suppliers')
    AND (coalesce(qual, '') || ' ' || coalesce(with_check, '')) ~* '(purchases_suppliers|payments_suppliers)';

  IF v_policy_offenders IS NOT NULL THEN
    v_offenders := v_offenders || ('POLICIES en otras tablas que referencian tablas legacy: ' || array_to_string(v_policy_offenders, ', '))::text;
  END IF;

  WITH legacy(tbl) AS (
    VALUES ('public.purchases_suppliers'), ('public.payments_suppliers'),
           ('public.files_purchases_suppliers'), ('public.files_payments_suppliers')
  ),
  legacy_oids AS (
    SELECT to_regclass(tbl) AS oid FROM legacy WHERE to_regclass(tbl) IS NOT NULL
  )
  SELECT array_agg(DISTINCT con.conrelid::regclass::text || ' (FK: ' || con.conname || ')')
  INTO v_fk_offenders
  FROM pg_constraint con
  WHERE con.contype = 'f'
    AND con.confrelid IN (SELECT oid FROM legacy_oids)
    AND con.conrelid NOT IN (SELECT oid FROM legacy_oids);

  IF v_fk_offenders IS NOT NULL THEN
    v_offenders := v_offenders || ('FOREIGN KEYS desde otras tablas hacia tablas legacy: ' || array_to_string(v_fk_offenders, ', '))::text;
  END IF;

  IF array_length(v_offenders, 1) > 0 THEN
    RAISE EXCEPTION E'ABORTADO / ABORTED: todavia hay objetos que referencian purchases_suppliers / payments_suppliers (o sus tablas de archivos). No se dropea nada. / Objects still reference purchases_suppliers / payments_suppliers (or their file tables). Nothing was dropped. Offenders:\n%',
      array_to_string(v_offenders, E'\n');
  END IF;

  RAISE NOTICE 'SAFETY GUARD OK: no legacy references found outside the four tables being dropped; all required unified objects exist.';
END;
$guard$;

-- HARD GUARD: abort if payments_suppliers or either files_*_suppliers table still has rows --------
DO $rowguard$
DECLARE
  v_payments_suppliers bigint := 0;
  v_files_payments_suppliers bigint := 0;
  v_files_purchases_suppliers bigint := 0;
  v_msgs text[] := ARRAY[]::text[];
BEGIN
  IF to_regclass('public.payments_suppliers') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.payments_suppliers' INTO v_payments_suppliers;
  END IF;
  IF to_regclass('public.files_payments_suppliers') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.files_payments_suppliers' INTO v_files_payments_suppliers;
  END IF;
  IF to_regclass('public.files_purchases_suppliers') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.files_purchases_suppliers' INTO v_files_purchases_suppliers;
  END IF;

  IF v_payments_suppliers > 0 THEN
    v_msgs := v_msgs || format('payments_suppliers has %s row(s)', v_payments_suppliers);
  END IF;
  IF v_files_payments_suppliers > 0 THEN
    v_msgs := v_msgs || format('files_payments_suppliers has %s row(s)', v_files_payments_suppliers);
  END IF;
  IF v_files_purchases_suppliers > 0 THEN
    v_msgs := v_msgs || format('files_purchases_suppliers has %s row(s)', v_files_purchases_suppliers);
  END IF;

  IF array_length(v_msgs, 1) > 0 THEN
    RAISE EXCEPTION 'ABORTADO / ABORTED: dropear ahora borraria pagos/archivos sin migrar para siempre. / Dropping now would permanently delete un-migrated payments/files -- %', array_to_string(v_msgs, '; ');
  END IF;

  RAISE NOTICE 'Row-count guard OK: payments_suppliers=%, files_payments_suppliers=%, files_purchases_suppliers=% (all zero/absent).',
    v_payments_suppliers, v_files_payments_suppliers, v_files_purchases_suppliers;
END $rowguard$;

-- HARD GUARD: abort if any purchases_suppliers row was never migrated (no matching expense) -------
DO $fpguard$
DECLARE
  v_unmatched bigint := 0;
BEGIN
  IF to_regclass('public.purchases_suppliers') IS NOT NULL THEN
    SELECT count(*) INTO v_unmatched
    FROM public.purchases_suppliers ps
    WHERE NOT EXISTS (
      SELECT 1 FROM public.expenses e
      WHERE e.supplier_id = ps.supplier_id
        AND e.created_at = ps.created_at
        AND e.net_amount = ps.amount_ars
    );

    IF v_unmatched > 0 THEN
      RAISE EXCEPTION 'ABORTADO / ABORTED: % purchases_suppliers row(s) have no matching expense by fingerprint (supplier_id, created_at, net_amount = amount_ars) -- run 01-migrate-purchases-to-expenses.sql first.', v_unmatched;
    END IF;

    RAISE NOTICE 'Migration guard OK: every purchases_suppliers row has a matching migrated expense.';
  ELSE
    RAISE NOTICE 'public.purchases_suppliers does not exist -- nothing to check.';
  END IF;
END $fpguard$;

DROP TABLE IF EXISTS public.files_payments_suppliers;
DROP TABLE IF EXISTS public.files_purchases_suppliers;
DROP TABLE IF EXISTS public.payments_suppliers;
DROP TABLE IF EXISTS public.purchases_suppliers;

COMMIT;
