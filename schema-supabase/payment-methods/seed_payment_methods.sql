INSERT INTO public.payment_methods (name)
SELECT v.name
FROM (VALUES
  ('Efectivo'),
  ('Banco Cta Cte'),
  ('Banco Caja Ahorro'),
  ('Cheque'),
  ('Mercado Pago'),
  ('Transferencia')
) AS v(name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.payment_methods pm
  WHERE lower(trim(pm.name)) = lower(trim(v.name))
);
