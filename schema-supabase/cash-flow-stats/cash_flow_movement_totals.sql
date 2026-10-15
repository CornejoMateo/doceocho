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
    SELECT date AS mv_date, 'in'::text AS direction, COALESCE(amount, 0) AS amount,
           bank_account_id, payment_method_id
    FROM public.collections
    UNION ALL
    SELECT COALESCE(date, (created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date),
           'in', COALESCE(amount, 0), bank_account_id, payment_method_id
    FROM public.balance_transactions
    UNION ALL
    SELECT date, 'out', amount, bank_account_id, payment_method_id
    FROM public.payments
    UNION ALL
    SELECT paid_date, 'out', amount_ars, bank_account_id, payment_method_id
    FROM public.payments_suppliers
    UNION ALL
    SELECT paid_date, 'out', total_amount, bank_account_id, payment_method_id
    FROM public.fixed_expense_payments
  )
  SELECT
    CASE WHEN p_group_by = 'bank_account' THEN bank_account_id ELSE payment_method_id END AS group_id,
    COALESCE(SUM(amount) FILTER (WHERE direction = 'in'), 0) AS total_in,
    COALESCE(SUM(amount) FILTER (WHERE direction = 'out'), 0) AS total_out
  FROM movements
  WHERE (p_start IS NULL OR mv_date >= p_start)
    AND (p_end IS NULL OR mv_date <= p_end)
  GROUP BY CASE WHEN p_group_by = 'bank_account' THEN bank_account_id ELSE payment_method_id END;
$$;

REVOKE ALL ON FUNCTION public.cash_flow_movement_totals(text, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cash_flow_movement_totals(text, date, date) TO authenticated;
