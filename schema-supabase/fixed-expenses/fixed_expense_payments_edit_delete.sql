------ RPC: edit an existing payment and recompute is_paid for its expense ------

CREATE OR REPLACE FUNCTION public.update_fixed_expense_payment(
  p_payment_id bigint,
  p_paid_date date,
  p_period date,
  p_net_amount numeric,
  p_iva_percent numeric,
  p_payment_method_id bigint,
  p_bank_account_id bigint DEFAULT NULL
)
RETURNS SETOF public.fixed_expense_payments
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_iva_amount numeric;
  v_total_amount numeric;
  v_fixed_expense_id bigint;
  v_row public.fixed_expense_payments;
  v_current_month date := date_trunc('month', (now() AT TIME ZONE 'America/Argentina/Buenos_Aires'))::date;
BEGIN
  IF extract(day from p_period) <> 1 THEN
    RAISE EXCEPTION 'El período debe ser el primer día del mes';
  END IF;

  SELECT fep.fixed_expense_id INTO v_fixed_expense_id
  FROM public.fixed_expense_payments fep
  WHERE fep.id = p_payment_id;

  IF v_fixed_expense_id IS NULL THEN
    RAISE EXCEPTION 'No se pudo editar el pago (no existe o no tenés permisos)';
  END IF;

  v_iva_amount := round(p_net_amount * p_iva_percent / 100, 2);
  v_total_amount := p_net_amount + v_iva_amount;

  UPDATE public.fixed_expense_payments fep
  SET
    paid_date = p_paid_date,
    period = p_period,
    net_amount = p_net_amount,
    iva_percent = p_iva_percent,
    iva_amount = v_iva_amount,
    total_amount = v_total_amount,
    payment_method_id = p_payment_method_id,
    bank_account_id = p_bank_account_id
  WHERE fep.id = p_payment_id
  RETURNING fep.* INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'No se pudo editar el pago (no existe o no tenés permisos)';
  END IF;

  UPDATE public.fixed_expenses fe
  SET is_paid = EXISTS (
    SELECT 1 FROM public.fixed_expense_payments fep2
    WHERE fep2.fixed_expense_id = fe.id
      AND fep2.period = v_current_month
  )
  WHERE fe.id = v_fixed_expense_id;

  RETURN NEXT v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.update_fixed_expense_payment(bigint, date, date, numeric, numeric, bigint, bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_fixed_expense_payment(bigint, date, date, numeric, numeric, bigint, bigint) TO authenticated;

------ RPC: delete a payment and recompute is_paid for its expense ------

CREATE OR REPLACE FUNCTION public.delete_fixed_expense_payment(p_payment_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_fixed_expense_id bigint;
  v_current_month date := date_trunc('month', (now() AT TIME ZONE 'America/Argentina/Buenos_Aires'))::date;
BEGIN
  DELETE FROM public.fixed_expense_payments fep
  WHERE fep.id = p_payment_id
  RETURNING fep.fixed_expense_id INTO v_fixed_expense_id;

  IF v_fixed_expense_id IS NULL THEN
    RAISE EXCEPTION 'No se pudo eliminar el pago (no existe o no tenés permisos)';
  END IF;

  UPDATE public.fixed_expenses fe
  SET is_paid = EXISTS (
    SELECT 1 FROM public.fixed_expense_payments fep2
    WHERE fep2.fixed_expense_id = fe.id
      AND fep2.period = v_current_month
  )
  WHERE fe.id = v_fixed_expense_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_fixed_expense_payment(bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_fixed_expense_payment(bigint) TO authenticated;
