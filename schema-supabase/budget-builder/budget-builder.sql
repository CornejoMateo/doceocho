------ BUDGET BUILDER ------
-- Quotes built from a catalog of supplies and furniture types.
-- Safe to run more than once: everything is created only if missing.

------ SETTINGS ------
-- Single row (id = 1): company data shown to the client and the defaults for new budgets.

create table if not exists public.budget_builder_settings (
  id bigint not null default 1,
  updated_at timestamp with time zone not null default now(),
  -- { "name", "phone", "email", "address" }
  company jsonb not null default '{}'::jsonb,
  default_margin_percent numeric not null default 40,
  default_validity_days integer not null default 15,
  constraint budget_builder_settings_pkey primary key (id),
  constraint budget_builder_settings_single_row check (id = 1)
) TABLESPACE pg_default;

insert into public.budget_builder_settings (id, company)
values (1, '{"name": "Doce Ocho", "phone": "", "email": "", "address": ""}'::jsonb)
on conflict (id) do nothing;

------ CATALOG ------
-- Everything a job can carry, priced per unit. Text ids so furniture types can point at them.

create table if not exists public.budget_builder_catalog (
  id text not null default gen_random_uuid()::text,
  created_at timestamp with time zone not null default now(),
  name text not null default '',
  category text not null default '',
  unit text not null default 'unidad',
  price numeric not null default 0,
  position integer not null default 0,
  constraint budget_builder_catalog_pkey primary key (id),
  constraint budget_builder_catalog_unit_check check (
    unit in ('m2', 'm', 'm3', 'l', 'kg', 'unidad', 'hora')
  ),
  constraint budget_builder_catalog_price_check check (price >= 0)
) TABLESPACE pg_default;

------ FURNITURE TYPES ------
-- What a seller picks: a shape, starting measurements and the lines it carries.

create table if not exists public.budget_builder_templates (
  id text not null default gen_random_uuid()::text,
  created_at timestamp with time zone not null default now(),
  name text not null default '',
  shape text not null default 'mueble',
  -- { "width", "depth", "height", "thickness", "legs", "shelves", "doors" } in cm
  dimensions jsonb not null default '{}'::jsonb,
  -- [{ "itemId", "quantity" }], quantity being a number or a formula
  lines jsonb not null default '[]'::jsonb,
  position integer not null default 0,
  constraint budget_builder_templates_pkey primary key (id),
  constraint budget_builder_templates_shape_check check (
    shape in ('mesa', 'estanteria', 'mueble', 'bloque')
  )
) TABLESPACE pg_default;

------ BUDGETS ------

create sequence if not exists public.budget_builder_budgets_number_seq;

create table if not exists public.budget_builder_budgets (
  id uuid not null default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  -- Shown as P-0001.
  number bigint not null default nextval('public.budget_builder_budgets_number_seq'),
  client_name text not null default '',
  client_contact text not null default '',
  status text not null default 'borrador',
  margin_percent numeric not null default 40,
  validity_days integer not null default 15,
  notes text not null default '',
  -- Each piece with its shape, measurements, finish and lines; the same shape the app works with.
  items jsonb not null default '[]'::jsonb,
  -- Secret in the link the client receives; it only ever reaches the public API route.
  public_token uuid not null default gen_random_uuid(),
  client_response text null,
  client_comment text null,
  responded_at timestamp with time zone null,
  created_by uuid null,
  constraint budget_builder_budgets_pkey primary key (id),
  constraint budget_builder_budgets_number_key unique (number),
  constraint budget_builder_budgets_public_token_key unique (public_token),
  constraint budget_builder_budgets_status_check check (
    status in ('borrador', 'enviado', 'aprobado', 'rechazado')
  ),
  constraint budget_builder_budgets_client_response_check check (
    client_response is null or client_response in ('aprobado', 'rechazado')
  ),
  constraint budget_builder_budgets_created_by_fkey foreign key (created_by)
    references public.users (uid_user) on update cascade on delete set null
) TABLESPACE pg_default;

alter sequence public.budget_builder_budgets_number_seq
  owned by public.budget_builder_budgets.number;

create index if not exists budget_builder_budgets_created_at_idx
  on public.budget_builder_budgets using btree (created_at desc) TABLESPACE pg_default;

------ TRIGGERS ------

create or replace function public.set_budget_builder_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists budget_builder_budgets_set_updated_at on public.budget_builder_budgets;
create trigger budget_builder_budgets_set_updated_at
  before update on public.budget_builder_budgets
  for each row
  execute function public.set_budget_builder_updated_at();

drop trigger if exists budget_builder_settings_set_updated_at on public.budget_builder_settings;
create trigger budget_builder_settings_set_updated_at
  before update on public.budget_builder_settings
  for each row
  execute function public.set_budget_builder_updated_at();

------ RLS ------
-- Only admins build and see budgets. The client's page never touches these tables:
-- it goes through an API route with the service role that returns only final prices.

alter table public.budget_builder_settings enable row level security;
alter table public.budget_builder_catalog enable row level security;
alter table public.budget_builder_templates enable row level security;
alter table public.budget_builder_budgets enable row level security;

drop policy if exists "Budget builder settings admins" on public.budget_builder_settings;
create policy "Budget builder settings admins"
on public.budget_builder_settings
for all
to authenticated
using (
    exists (
        select 1 from public.users u
        where u.uid_user = auth.uid() and public.is_admin_role(u.role)
    )
)
with check (
    exists (
        select 1 from public.users u
        where u.uid_user = auth.uid() and public.is_admin_role(u.role)
    )
);

drop policy if exists "Budget builder catalog admins" on public.budget_builder_catalog;
create policy "Budget builder catalog admins"
on public.budget_builder_catalog
for all
to authenticated
using (
    exists (
        select 1 from public.users u
        where u.uid_user = auth.uid() and public.is_admin_role(u.role)
    )
)
with check (
    exists (
        select 1 from public.users u
        where u.uid_user = auth.uid() and public.is_admin_role(u.role)
    )
);

drop policy if exists "Budget builder templates admins" on public.budget_builder_templates;
create policy "Budget builder templates admins"
on public.budget_builder_templates
for all
to authenticated
using (
    exists (
        select 1 from public.users u
        where u.uid_user = auth.uid() and public.is_admin_role(u.role)
    )
)
with check (
    exists (
        select 1 from public.users u
        where u.uid_user = auth.uid() and public.is_admin_role(u.role)
    )
);

drop policy if exists "Budget builder budgets admins" on public.budget_builder_budgets;
create policy "Budget builder budgets admins"
on public.budget_builder_budgets
for all
to authenticated
using (
    exists (
        select 1 from public.users u
        where u.uid_user = auth.uid() and public.is_admin_role(u.role)
    )
)
with check (
    exists (
        select 1 from public.users u
        where u.uid_user = auth.uid() and public.is_admin_role(u.role)
    )
);
