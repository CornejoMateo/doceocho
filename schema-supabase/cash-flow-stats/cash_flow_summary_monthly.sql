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
    SELECT extract(month from date)::int AS mv_month, work_id,
           net_amount AS income_net, iva_amount AS income_iva,
           0::numeric AS expense_net, 0::numeric AS expense_iva,
           0::numeric AS collection_amount, 0::numeric AS payment_amount
    FROM public.incomes
    WHERE extract(year from date)::int = p_year
    UNION ALL
    SELECT extract(month from date)::int, work_id,
           0, 0, net_amount, iva_amount, 0, 0
    FROM public.expenses
    WHERE extract(year from date)::int = p_year
    UNION ALL
    SELECT extract(month from date)::int, work_id,
           0, 0, 0, 0, COALESCE(amount, 0), 0
    FROM public.collections
    WHERE extract(year from date)::int = p_year
    UNION ALL
    SELECT extract(month from COALESCE(date, (created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date))::int,
           work_id, 0, 0, 0, 0, COALESCE(amount, 0), 0
    FROM public.balance_transactions
    WHERE extract(year from COALESCE(date, (created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date))::int = p_year
    UNION ALL
    SELECT extract(month from date)::int, work_id, 0, 0, 0, 0, 0, amount
    FROM public.payments
    WHERE extract(year from date)::int = p_year
    UNION ALL
    SELECT extract(month from paid_date)::int, work_id, 0, 0, 0, 0, 0, amount_ars
    FROM public.payments_suppliers
    WHERE extract(year from paid_date)::int = p_year
  )
  SELECT mv_month AS month, work_id,
         SUM(income_net) AS income_net,
         SUM(income_iva) AS income_iva,
         SUM(expense_net) AS expense_net,
         SUM(expense_iva) AS expense_iva,
         SUM(collection_amount) AS collection_amount,
         SUM(payment_amount) AS payment_amount
  FROM movements
  GROUP BY mv_month, work_id;
$$;

REVOKE ALL ON FUNCTION public.cash_flow_summary_monthly(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cash_flow_summary_monthly(int) TO authenticated;

CREATE OR REPLACE FUNCTION public.cash_flow_fixed_costs_monthly(p_year int)
RETURNS TABLE (
  month int,
  net numeric,
  iva numeric,
  total numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT extract(month from paid_date)::int AS month,
         SUM(net_amount) AS net,
         SUM(iva_amount) AS iva,
         SUM(total_amount) AS total
  FROM public.fixed_expense_payments
  WHERE extract(year from paid_date)::int = p_year
  GROUP BY extract(month from paid_date)::int;
$$;

REVOKE ALL ON FUNCTION public.cash_flow_fixed_costs_monthly(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cash_flow_fixed_costs_monthly(int) TO authenticated;
