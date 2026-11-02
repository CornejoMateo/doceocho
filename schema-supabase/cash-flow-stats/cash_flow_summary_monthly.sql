CREATE OR REPLACE FUNCTION public.cash_flow_summary_monthly(p_year int)
RETURNS TABLE (
  month int,
  work_id bigint,
  income_net numeric,
  income_iva numeric,
  expense_net numeric,
  expense_iva numeric,
  collection_amount numeric,
  payment_amount numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH movements AS (
    SELECT extract(month from i.date)::int AS mv_month, i.work_id,
           i.net_amount AS income_net, i.iva_amount AS income_iva,
           0::numeric AS expense_net, 0::numeric AS expense_iva,
           0::numeric AS collection_amount, 0::numeric AS payment_amount
    FROM public.incomes i
    WHERE extract(year from i.date)::int = p_year
    UNION ALL
    SELECT extract(month from e.date)::int, e.work_id,
           0, 0, e.net_amount, e.iva_amount, 0, 0
    FROM public.expenses e
    WHERE extract(year from e.date)::int = p_year
    UNION ALL
    SELECT extract(month from c.date)::int, c.work_id,
           0, 0, 0, 0, COALESCE(c.amount, 0), 0
    FROM public.collections c
    WHERE extract(year from c.date)::int = p_year
    UNION ALL
    SELECT extract(month from COALESCE(bt.date, (bt.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date))::int,
           bt.work_id, 0, 0, 0, 0, COALESCE(bt.amount, 0), 0
    FROM public.balance_transactions bt
    WHERE extract(year from COALESCE(bt.date, (bt.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date))::int = p_year
    UNION ALL
    SELECT extract(month from p.date)::int, p.work_id, 0, 0, 0, 0, 0, p.amount
    FROM public.payments p
    WHERE extract(year from p.date)::int = p_year
    -- payments_suppliers branch removed: supplier payments are now plain `payments` rows (phase 1).
  )
  SELECT m.mv_month AS month, m.work_id,
         SUM(m.income_net) AS income_net,
         SUM(m.income_iva) AS income_iva,
         SUM(m.expense_net) AS expense_net,
         SUM(m.expense_iva) AS expense_iva,
         SUM(m.collection_amount) AS collection_amount,
         SUM(m.payment_amount) AS payment_amount
  FROM movements m
  GROUP BY m.mv_month, m.work_id;
$$;

REVOKE ALL ON FUNCTION public.cash_flow_summary_monthly(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cash_flow_summary_monthly(int) TO authenticated;

CREATE OR REPLACE FUNCTION public.cash_flow_movement_totals(
  p_group_by text,
  p_start date DEFAULT NULL,
  p_end date DEFAULT NULL
)
RETURNS TABLE (
  group_id bigint,
  total_in numeric,
  total_out numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH movements AS (
    SELECT c.date AS mv_date, 'in'::text AS direction, COALESCE(c.amount, 0) AS amount,
           c.bank_account_id, c.payment_method_id
    FROM public.collections c
    UNION ALL
    SELECT COALESCE(bt.date, (bt.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date),
           'in', COALESCE(bt.amount, 0), bt.bank_account_id, bt.payment_method_id
    FROM public.balance_transactions bt
    UNION ALL
    SELECT p.date, 'out', p.amount, p.bank_account_id, p.payment_method_id
    FROM public.payments p
    UNION ALL
    SELECT fep.paid_date, 'out', fep.total_amount, fep.bank_account_id, fep.payment_method_id
    FROM public.fixed_expense_payments fep
  )
  SELECT
    CASE WHEN p_group_by = 'bank_account' THEN m.bank_account_id ELSE m.payment_method_id END AS group_id,
    COALESCE(SUM(m.amount) FILTER (WHERE m.direction = 'in'), 0) AS total_in,
    COALESCE(SUM(m.amount) FILTER (WHERE m.direction = 'out'), 0) AS total_out
  FROM movements m
  WHERE (p_start IS NULL OR m.mv_date >= p_start)
    AND (p_end IS NULL OR m.mv_date <= p_end)
  GROUP BY CASE WHEN p_group_by = 'bank_account' THEN m.bank_account_id ELSE m.payment_method_id END;
$$;

REVOKE ALL ON FUNCTION public.cash_flow_movement_totals(text, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cash_flow_movement_totals(text, date, date) TO authenticated;
