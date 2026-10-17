------ CARD RELATIONS ------
-- Links a card to the client and the work it is about.
-- Until now "creating a card from a client" only copied the client's name into
-- the title, so nothing in the system knew the two were related.

alter table public.kanban_cards
  add column if not exists client_id bigint null,
  add column if not exists work_id bigint null;

-- Deleting a client or a work must not delete the task: the card keeps its
-- title and simply loses the link.
alter table public.kanban_cards
  drop constraint if exists kanban_cards_client_id_fkey,
  add constraint kanban_cards_client_id_fkey foreign key (client_id)
    references public.clients (id) on update cascade on delete set null;

alter table public.kanban_cards
  drop constraint if exists kanban_cards_work_id_fkey,
  add constraint kanban_cards_work_id_fkey foreign key (work_id)
    references public.works (id) on update cascade on delete set null;

------ INDEXES ------
-- Support "which cards belong to this client / this work".

create index if not exists idx_kanban_cards_client_id
  on public.kanban_cards using btree (client_id) TABLESPACE pg_default;

create index if not exists idx_kanban_cards_work_id
  on public.kanban_cards using btree (work_id) TABLESPACE pg_default;

------ RLS ------
-- No new policies: kanban_cards already restricts reads and writes to the
-- members of the board the card belongs to, and that still applies.
