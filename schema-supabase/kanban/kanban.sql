------- Kanban Boards Table -------

CREATE TABLE IF NOT EXISTS kanban_boards (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#4F5C4D',
    is_favorite BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    due_date_tolerance_yellow INTEGER DEFAULT 2, -- Days before due date to show yellow warning
    due_date_tolerance_red INTEGER DEFAULT 0 -- Days before due date to show red warning (0 = only on due date)
);

CREATE POLICY "kanban_boards insert"
ON public.kanban_boards
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND u.role = 'Admin'
    )
);

CREATE POLICY "kanban_boards update"
ON public.kanban_boards
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND u.role = 'Admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND u.role = 'Admin'
    )
);

CREATE POLICY "kanban_boards select"
ON public.kanban_boards
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.kanban_board_members kbm
        WHERE kbm.kanban_board_id = kanban_boards.id
          AND kbm.user_id = auth.uid()
    )
);

CREATE POLICY "kanban_boards delete"
ON public.kanban_boards
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND u.role = 'Admin'
    )
)

------ Kanban Board Members Table -------

create table public.kanban_board_members (
  id bigserial not null,
  created_at timestamp with time zone null default now(),
  board_id bigint not null,
  role character varying(20) null default 'member'::character varying,
  user_id uuid null,
  constraint kanban_board_members_pkey primary key (id),
  constraint kanban_board_members_board_id_fkey foreign KEY (board_id) references kanban_boards (id) on delete CASCADE,
  constraint kanban_board_members_user_id_fkey foreign KEY (user_id) references users (uid_user) on update CASCADE,
  constraint kanban_board_members_role_check check (
    (
      (role)::text = any (
        (
          array[
            'owner'::character varying,
            'admin'::character varying,
            'editor'::character varying,
            'viewer'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_kanban_board_members_board ON kanban_board_members(board_id);

CREATE POLICY "kanban_boards_members insert"
ON public.kanban_boards_members
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND u.role = 'Admin'
    )
);

CREATE POLICY "kanban_boards update"
ON public.kanban_boards
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND u.role = 'Admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND u.role = 'Admin'
    )
);

CREATE POLICY "kanban_boards select"
ON public.kanban_boards
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.kanban_board_members kbm
        WHERE kbm.kanban_board_id = kanban_boards.id
          AND kbm.user_id = auth.uid()
    )
);

CREATE POLICY "kanban_boards delete"
ON public.kanban_boards
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND u.role = 'Admin'
    )
)