
INSERT INTO public.cash_flow_categories (name, kind) VALUES
  ('Alquiler oficina', 'fixed_expense'),
  ('Sueldos administración', 'fixed_expense'),
  ('Seguros', 'fixed_expense'),
  ('Servicios', 'fixed_expense'),
  ('Honorarios', 'fixed_expense'),
  ('Impuestos', 'fixed_expense'),
  ('Otros', 'fixed_expense')
ON CONFLICT (kind, lower(trim(name))) DO NOTHING;
