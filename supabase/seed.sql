------ LOCAL SEED ------
-- Runs only on the local Supabase, after every "npm run db:reset".
-- It is never applied to develop or production.

------ STORAGE ------
-- Buckets live in the storage schema, which a schema dump of develop does not include.

insert into storage.buckets (id, name, public)
values
  ('clients', 'clients', true),
  ('modules', 'modules', false),
  ('stock_supplies', 'stock_supplies', false),
  ('suppliers-files', 'suppliers-files', false),
  ('works-files', 'works-files', false),
  ('employees', 'employees', false),
  ('checklist-gallery', 'checklist-gallery', false),
  ('kanban', 'kanban', false)
on conflict (id) do nothing;

-- Broad access for logged-in users, only so files can be tried locally.
-- The real storage policies stay as they are in develop.
drop policy if exists "Local authenticated full access" on storage.objects;
create policy "Local authenticated full access"
on storage.objects
for all
to authenticated
using (true)
with check (true);
