------ Delete cash_boxes and transactions_box tables, their triggers, functions, policies, and constraints. ------

BEGIN;

-- 1. Unschedule the pg_cron auto-close job, if pg_cron and the job exist.
DO $$
BEGIN
  IF to_regnamespace('cron') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'close-open-cash-box') THEN
      PERFORM cron.unschedule('close-open-cash-box');
    END IF;
  END IF;
END $$;

-- 2. Drop the trigger (and its functions) that mirrors balance_transactions into transactions_box.
DO $$
BEGIN
  IF to_regclass('public.balance_transactions') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_sync_balance_transaction_to_cash_box ON public.balance_transactions;
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.sync_balance_transaction_to_cash_box();
DROP FUNCTION IF EXISTS public.close_open_cash_box();

-- 3. Drop every RLS policy on cash_boxes / transactions_box, whatever file/role created it.
DO $$
DECLARE
  pol record;
BEGIN
  IF to_regclass('public.cash_boxes') IS NOT NULL THEN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cash_boxes' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.cash_boxes', pol.policyname);
    END LOOP;
  END IF;

  IF to_regclass('public.transactions_box') IS NOT NULL THEN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'transactions_box' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.transactions_box', pol.policyname);
    END LOOP;
  END IF;
END $$;

-- 4. Drop only the FK constraints pointing at cash_boxes (from transactions_income/transactions_expense);
-- their cash_box_id columns and the tables themselves stay.
DO $$
DECLARE
  con record;
BEGIN
  IF to_regclass('public.cash_boxes') IS NOT NULL THEN
    FOR con IN
      SELECT conrelid::regclass::text AS tbl, conname
      FROM pg_constraint
      WHERE contype = 'f' AND confrelid = 'public.cash_boxes'::regclass
    LOOP
      EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I', con.tbl, con.conname);
    END LOOP;
  END IF;
END $$;

-- 5. Log row counts before dropping (informational only, does not abort).
DO $$
DECLARE
  v_cash_boxes bigint := 0;
  v_transactions_box bigint := 0;
BEGIN
  IF to_regclass('public.cash_boxes') IS NOT NULL THEN
    SELECT count(*) INTO v_cash_boxes FROM public.cash_boxes;
  END IF;
  IF to_regclass('public.transactions_box') IS NOT NULL THEN
    SELECT count(*) INTO v_transactions_box FROM public.transactions_box;
  END IF;
  RAISE NOTICE 'About to drop cash_boxes (% row(s)) and transactions_box (% row(s)).', v_cash_boxes, v_transactions_box;
END $$;

-- 6. Drop the tables. No CASCADE: any dependent object we didn't account for aborts the transaction.
DROP TABLE IF EXISTS public.transactions_box;
DROP TABLE IF EXISTS public.cash_boxes;

COMMIT;
