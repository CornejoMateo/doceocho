
-- Categories are shared between Gastos and Costos fijos; this seed targets the shared 'expense' kind.
INSERT INTO public.cash_flow_categories (name, kind) VALUES
  ('Alquiler oficina', 'expense'),
  ('Sueldos administración', 'expense'),
  ('Seguros', 'expense'),
  ('Servicios', 'expense'),
  ('Honorarios', 'expense'),
  ('Impuestos', 'expense'),
  ('Otros', 'expense')
ON CONFLICT (kind, lower(trim(name))) DO NOTHING;
