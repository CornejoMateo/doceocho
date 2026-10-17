CREATE OR REPLACE FUNCTION public.is_admin_role(role_value text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT role_value IN ('Admin', 'Superadmin');
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin_role(role_value text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT role_value = 'Superadmin';
$$;

DROP POLICY IF EXISTS "Appointment settings select" ON public.appointment_settings;
CREATE POLICY "Appointment settings select"
ON public.appointment_settings
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.uid_user = auth.uid() AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Appointment settings update" ON public.appointment_settings;
CREATE POLICY "Appointment settings update"
ON public.appointment_settings
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.uid_user = auth.uid() AND public.is_admin_role(u.role)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.uid_user = auth.uid() AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Appointment blocked dates select" ON public.appointment_blocked_dates;
CREATE POLICY "Appointment blocked dates select"
ON public.appointment_blocked_dates
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.uid_user = auth.uid() AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Appointment blocked dates insert" ON public.appointment_blocked_dates;
CREATE POLICY "Appointment blocked dates insert"
ON public.appointment_blocked_dates
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.uid_user = auth.uid() AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Appointment blocked dates delete" ON public.appointment_blocked_dates;
CREATE POLICY "Appointment blocked dates delete"
ON public.appointment_blocked_dates
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.uid_user = auth.uid() AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Appointments select" ON public.appointments;
CREATE POLICY "Appointments select"
ON public.appointments
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.uid_user = auth.uid() AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Appointments update" ON public.appointments;
CREATE POLICY "Appointments update"
ON public.appointments
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.uid_user = auth.uid() AND public.is_admin_role(u.role)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.uid_user = auth.uid() AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Appointments delete" ON public.appointments;
CREATE POLICY "Appointments delete"
ON public.appointments
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.uid_user = auth.uid() AND public.is_admin_role(u.role)
    )
);

-- ===== From schema-supabase/attendance/attendance_settings.sql =====

DROP POLICY IF EXISTS "Attendance settings select" ON public.attendance_settings;
CREATE POLICY "Attendance settings select"
ON public.attendance_settings
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Attendance settings insert" ON public.attendance_settings;
CREATE POLICY "Attendance settings insert"
ON public.attendance_settings
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Attendance settings update" ON public.attendance_settings;
CREATE POLICY "Attendance settings update"
ON public.attendance_settings
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Attendance settings delete" ON public.attendance_settings;
CREATE POLICY "Attendance settings delete"
ON public.attendance_settings
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);



-- ===== From schema-supabase/attendance/monthly_settlements.sql =====
-- Liquidaciones now Superadmin-only (plain Admin loses visibility/write access).

DROP POLICY IF EXISTS "Monthly settlements select" ON public.monthly_settlements;
CREATE POLICY "Monthly settlements select"
ON public.monthly_settlements
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_superadmin_role(u.role)
    )
    OR user_id = auth.uid()
);

DROP POLICY IF EXISTS "Monthly settlements insert" ON public.monthly_settlements;
CREATE POLICY "Monthly settlements insert"
ON public.monthly_settlements
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_superadmin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Monthly settlements update" ON public.monthly_settlements;
CREATE POLICY "Monthly settlements update"
ON public.monthly_settlements
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_superadmin_role(u.role)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_superadmin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Monthly settlements delete" ON public.monthly_settlements;
CREATE POLICY "Monthly settlements delete"
ON public.monthly_settlements
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_superadmin_role(u.role)
    )
);



-- ===== From schema-supabase/balances/balances.sql =====

DROP POLICY IF EXISTS "Public select balances" ON public.balances;
CREATE POLICY "Public select balances"
ON public.balances
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Public insert balances" ON public.balances;
CREATE POLICY "Public insert balances"
ON public.balances
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Public delete balances" ON public.balances;
CREATE POLICY "Public delete balances"
ON public.balances
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Public update balances" ON public.balances;
CREATE POLICY "Public update balances"
ON public.balances
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Public select balance_transactions" ON public.balance_transactions;
CREATE POLICY "Public select balance_transactions"
ON public.balance_transactions
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Public insert balance_transactions" ON public.balance_transactions;
CREATE POLICY "Public insert balance_transactions"
ON public.balance_transactions
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Public delete balance_transactions" ON public.balance_transactions;
CREATE POLICY "Public delete balance_transactions"
ON public.balance_transactions
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Public update balance_transactions" ON public.balance_transactions;
CREATE POLICY "Public update balance_transactions"
ON public.balance_transactions
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);



-- ===== From schema-supabase/budgets/budget-signatures.sql =====

DROP POLICY IF EXISTS "Budget signatures select" ON public.budget_signatures;
CREATE POLICY "Budget signatures select"
ON public.budget_signatures
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Budget signatures insert" ON public.budget_signatures;
CREATE POLICY "Budget signatures insert"
ON public.budget_signatures
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Budget signatures update" ON public.budget_signatures;
CREATE POLICY "Budget signatures update"
ON public.budget_signatures
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Budget signatures delete" ON public.budget_signatures;
CREATE POLICY "Budget signatures delete"
ON public.budget_signatures
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);



-- ===== From schema-supabase/budgets/budgets.sql =====

DROP POLICY IF EXISTS "Budgets select" ON public.budgets;
CREATE POLICY "Budgets select"
ON public.budgets
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Budgets insert" ON public.budgets;
CREATE POLICY "Budgets insert"
ON public.budgets
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Budgets update" ON public.budgets;
CREATE POLICY "Budgets update"
ON public.budgets
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Budgets delete" ON public.budgets;
CREATE POLICY "Budgets delete"
ON public.budgets
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Folder budgets select" ON public.folder_budgets;
CREATE POLICY "Folder budgets select"
ON public.folder_budgets
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Folder budgets insert" ON public.folder_budgets;
CREATE POLICY "Folder budgets insert"
ON public.folder_budgets
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Folder budgets update" ON public.folder_budgets;
CREATE POLICY "Folder budgets update"
ON public.folder_budgets
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Folder budgets delete" ON public.folder_budgets;
CREATE POLICY "Folder budgets delete"
ON public.folder_budgets
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

-- ===== From schema-supabase/cashbox/cashbox.sql =====

DROP POLICY IF EXISTS "Public select bank_accounts" ON public.bank_accounts;
CREATE POLICY "Public select bank_accounts"
ON public.bank_accounts
FOR SELECT
TO authenticated
USING (
  EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.uid_user = auth.uid()
        AND public.is_admin_role(u.role)
  )
);

DROP POLICY IF EXISTS "Public insert bank_accounts" ON public.bank_accounts;
CREATE POLICY "Public insert bank_accounts"
ON public.bank_accounts
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.uid_user = auth.uid()
        AND public.is_admin_role(u.role)
  )
);

DROP POLICY IF EXISTS "Public update bank_accounts" ON public.bank_accounts;
CREATE POLICY "Public update bank_accounts"
ON public.bank_accounts
FOR UPDATE
TO authenticated
USING (
  EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.uid_user = auth.uid()
        AND public.is_admin_role(u.role)
  )
)
WITH CHECK (
  EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.uid_user = auth.uid()
        AND public.is_admin_role(u.role)
  )
);

DROP POLICY IF EXISTS "Public delete bank_accounts" ON public.bank_accounts;
CREATE POLICY "Public delete bank_accounts"
ON public.bank_accounts
FOR DELETE
TO authenticated
USING (
  EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.uid_user = auth.uid()
        AND public.is_admin_role(u.role)
  )
);

DROP POLICY IF EXISTS "Public select cash_boxes" ON public.cash_boxes;
CREATE POLICY "Public select cash_boxes"
ON public.cash_boxes
FOR SELECT
TO authenticated
USING (
  EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.uid_user = auth.uid()
        AND public.is_admin_role(u.role)
  )
);

DROP POLICY IF EXISTS "Public insert cash_boxes" ON public.cash_boxes;
CREATE POLICY "Public insert cash_boxes"
ON public.cash_boxes
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.uid_user = auth.uid()
        AND public.is_admin_role(u.role)
  )
);

DROP POLICY IF EXISTS "Public update cash_boxes" ON public.cash_boxes;
CREATE POLICY "Public update cash_boxes"
ON public.cash_boxes
FOR UPDATE
TO authenticated
USING (
  EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.uid_user = auth.uid()
        AND public.is_admin_role(u.role)
  )
) 
WITH CHECK (
  EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.uid_user = auth.uid()
        AND public.is_admin_role(u.role)
  )
);

DROP POLICY IF EXISTS "Public delete cash_boxes" ON public.cash_boxes;
CREATE POLICY "Public delete cash_boxes"
ON public.cash_boxes
FOR DELETE
TO authenticated
USING (
  EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.uid_user = auth.uid()
        AND public.is_admin_role(u.role)
  )
);

DROP POLICY IF EXISTS "Public select transactions_box" ON public.transactions_box;
CREATE POLICY "Public select transactions_box"
ON public.transactions_box
FOR SELECT
TO authenticated
USING (
  EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.uid_user = auth.uid()
        AND public.is_admin_role(u.role)
  )
);

DROP POLICY IF EXISTS "Public insert transactions_box" ON public.transactions_box;
CREATE POLICY "Public insert transactions_box"
ON public.transactions_box
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.uid_user = auth.uid()
        AND public.is_admin_role(u.role)
  )
);

DROP POLICY IF EXISTS "Public update transactions_box" ON public.transactions_box;
CREATE POLICY "Public update transactions_box"
ON public.transactions_box
FOR UPDATE
TO authenticated
USING (
  EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.uid_user = auth.uid()
        AND public.is_admin_role(u.role)
  )
);

DROP POLICY IF EXISTS "Public delete transactions_box" ON public.transactions_box;
CREATE POLICY "Public delete transactions_box"
ON public.transactions_box
FOR DELETE
TO authenticated
USING (
  EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.uid_user = auth.uid()
        AND public.is_admin_role(u.role)
  )
);

-- ===== From schema-supabase/categories/cash_flow_categories.sql =====

DROP POLICY IF EXISTS "Public select cash_flow_categories" ON public.cash_flow_categories;
CREATE POLICY "Public select cash_flow_categories"
ON public.cash_flow_categories
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Public insert cash_flow_categories" ON public.cash_flow_categories;
CREATE POLICY "Public insert cash_flow_categories"
ON public.cash_flow_categories
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Public delete cash_flow_categories" ON public.cash_flow_categories;
CREATE POLICY "Public delete cash_flow_categories"
ON public.cash_flow_categories
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Public update cash_flow_categories" ON public.cash_flow_categories;
CREATE POLICY "Public update cash_flow_categories"
ON public.cash_flow_categories
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);



-- ===== From schema-supabase/chat/chat.sql =====

DROP POLICY IF EXISTS "Channel members select" ON public.channel_members;
CREATE POLICY "Channel members select"
ON public.channel_members FOR SELECT
TO authenticated
USING (
  ((user_id = auth.uid()) OR is_channel_member(channel_id, auth.uid()) OR (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.uid_user = auth.uid()) AND (public.is_admin_role((u.role)::text))))))
);

DROP POLICY IF EXISTS "Channel members insert" ON public.channel_members;
CREATE POLICY "Channel members insert"
ON public.channel_members FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.uid_user = auth.uid() AND public.is_admin_role(u.role))
);

DROP POLICY IF EXISTS "Channel members delete" ON public.channel_members;
CREATE POLICY "Channel members delete"
ON public.channel_members FOR DELETE
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.uid_user = auth.uid() AND public.is_admin_role(u.role))
);

DROP POLICY IF EXISTS "Channel members select" ON public.channel_members;
CREATE POLICY "Channel members select"
ON public.channel_members FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR
  public.is_channel_member(channel_id, auth.uid())
  OR
  EXISTS (SELECT 1 FROM public.users u WHERE u.uid_user = auth.uid() AND public.is_admin_role(u.role))
);

DROP POLICY IF EXISTS "Channels select" ON public.channels;
CREATE POLICY "Channels select"
ON public.channels FOR SELECT
TO authenticated
USING (
  ((EXISTS ( SELECT 1
   FROM channel_members cm
  WHERE ((cm.channel_id = channels.id) AND (cm.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.uid_user = auth.uid()) AND (public.is_admin_role((u.role)::text))))))
);

DROP POLICY IF EXISTS "Channels insert" ON public.channels;
CREATE POLICY "Channels insert"
ON public.channels FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.uid_user = auth.uid() AND public.is_admin_role(u.role))
);

DROP POLICY IF EXISTS "Channels update" ON public.channels;
CREATE POLICY "Channels update"
ON public.channels FOR UPDATE
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.uid_user = auth.uid() AND public.is_admin_role(u.role))
);

DROP POLICY IF EXISTS "Channels delete" ON public.channels;
CREATE POLICY "Channels delete"
ON public.channels FOR DELETE
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.uid_user = auth.uid() AND public.is_admin_role(u.role))
);

DROP POLICY IF EXISTS "Messages select" ON public.messages;
CREATE POLICY "Messages select"
ON public.messages FOR SELECT
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.channel_members cm WHERE cm.channel_id = channel_id AND cm.user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM public.users u WHERE u.uid_user = auth.uid() AND public.is_admin_role(u.role))
);

DROP POLICY IF EXISTS "Messages delete" ON public.messages;
CREATE POLICY "Messages delete"
ON public.messages FOR DELETE
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.uid_user = auth.uid() AND public.is_admin_role(u.role))
);



-- ===== From schema-supabase/clients/clients.sql =====

DROP POLICY IF EXISTS "Clients insert" ON public.clients;
CREATE POLICY "Clients insert"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Clients update" ON public.clients;
CREATE POLICY "Clients update"
ON public.clients
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Clients delete" ON public.clients;
CREATE POLICY "Clients delete"
ON public.clients
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);



-- ===== From schema-supabase/clients/files.sql =====

DROP POLICY IF EXISTS "Public delete files_client" ON public.files_client;
CREATE POLICY "Public delete files_client"
ON public.files_client
FOR DELETE
TO authenticated
USING (
  EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.uid_user = auth.uid()
        AND public.is_admin_role(u.role)
  )
);



-- ===== From schema-supabase/collections/collections.sql =====

DROP POLICY IF EXISTS "Public select collections" ON public.collections;
CREATE POLICY "Public select collections"
ON public.collections
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Public insert collections" ON public.collections;
CREATE POLICY "Public insert collections"
ON public.collections
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Public update collections" ON public.collections;
CREATE POLICY "Public update collections"
ON public.collections
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Public delete collections" ON public.collections;
CREATE POLICY "Public delete collections"
ON public.collections
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);



-- ===== From schema-supabase/events/events.sql =====

DROP POLICY IF EXISTS "Public insert events" ON public.events;
CREATE POLICY "Public insert events"
ON public.events
FOR INSERT
TO authenticated  
WITH CHECK (
  EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.uid_user = auth.uid()
        AND public.is_admin_role(u.role)
  )
);

DROP POLICY IF EXISTS "Public delete events" ON public.events;
CREATE POLICY "Public delete events"
ON public.events
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.uid_user = auth.uid()
      AND public.is_admin_role(u.role)
  )
);

DROP POLICY IF EXISTS "Public update events" ON public.events;
CREATE POLICY "Public update events"
ON public.events
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.uid_user = auth.uid()
      AND public.is_admin_role(u.role)
  )
)
WITH CHECK (
  EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.uid_user = auth.uid()
        AND public.is_admin_role(u.role)
  )
);

DROP POLICY IF EXISTS "Public insert events_types" ON public.events_types;
CREATE POLICY "Public insert events_types"
ON public.events_types
FOR INSERT
TO authenticated  
WITH CHECK (
  EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.uid_user = auth.uid()
        AND public.is_admin_role(u.role)
  )
);

DROP POLICY IF EXISTS "Public delete events_types" ON public.events_types;
CREATE POLICY "Public delete events_types"
ON public.events_types
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Public update events_types" ON public.events_types;
CREATE POLICY "Public update events_types"
ON public.events_types
FOR UPDATE
TO authenticated
USING (
  EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.uid_user = auth.uid()
        AND public.is_admin_role(u.role)
  )
)
WITH CHECK (
  EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.uid_user = auth.uid()
        AND public.is_admin_role(u.role)
  )
);



-- ===== From schema-supabase/events/holiday-work-days.sql =====

DROP POLICY IF EXISTS "Holiday work days insert" ON public.holiday_work_days;
CREATE POLICY "Holiday work days insert"
ON public.holiday_work_days
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.uid_user = auth.uid() AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Holiday work days update" ON public.holiday_work_days;
CREATE POLICY "Holiday work days update"
ON public.holiday_work_days
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.uid_user = auth.uid() AND public.is_admin_role(u.role)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.uid_user = auth.uid() AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Holiday work days delete" ON public.holiday_work_days;
CREATE POLICY "Holiday work days delete"
ON public.holiday_work_days
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.uid_user = auth.uid() AND public.is_admin_role(u.role)
    )
);



-- ===== From schema-supabase/expenses/expenses.sql =====

DROP POLICY IF EXISTS "Public select expenses" ON public.expenses;
CREATE POLICY "Public select expenses"
ON public.expenses
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Public insert expenses" ON public.expenses;
CREATE POLICY "Public insert expenses"
ON public.expenses
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Public update expenses" ON public.expenses;
CREATE POLICY "Public update expenses"
ON public.expenses
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Public delete expenses" ON public.expenses;
CREATE POLICY "Public delete expenses"
ON public.expenses
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

-- ===== From schema-supabase/fixed-expenses/fixed_expense_payments.sql =====

DROP POLICY IF EXISTS "Public select fixed_expense_payments" ON public.fixed_expense_payments;
CREATE POLICY "Public select fixed_expense_payments"
ON public.fixed_expense_payments
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Public insert fixed_expense_payments" ON public.fixed_expense_payments;
CREATE POLICY "Public insert fixed_expense_payments"
ON public.fixed_expense_payments
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Public update fixed_expense_payments" ON public.fixed_expense_payments;
CREATE POLICY "Public update fixed_expense_payments"
ON public.fixed_expense_payments
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Public delete fixed_expense_payments" ON public.fixed_expense_payments;
CREATE POLICY "Public delete fixed_expense_payments"
ON public.fixed_expense_payments
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);



-- ===== From schema-supabase/fixed-expenses/fixed_expenses.sql =====

DROP POLICY IF EXISTS "Public select fixed_expenses" ON public.fixed_expenses;
CREATE POLICY "Public select fixed_expenses"
ON public.fixed_expenses
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Public insert fixed_expenses" ON public.fixed_expenses;
CREATE POLICY "Public insert fixed_expenses"
ON public.fixed_expenses
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Public update fixed_expenses" ON public.fixed_expenses;
CREATE POLICY "Public update fixed_expenses"
ON public.fixed_expenses
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Public delete fixed_expenses" ON public.fixed_expenses;
CREATE POLICY "Public delete fixed_expenses"
ON public.fixed_expenses
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);



-- ===== From schema-supabase/human-resources/employee-documents.sql =====

DROP POLICY IF EXISTS "Employee documents select" ON public.employee_documents;
CREATE POLICY "Employee documents select"
ON public.employee_documents
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Employee documents insert" ON public.employee_documents;
CREATE POLICY "Employee documents insert"
ON public.employee_documents
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Employee documents update" ON public.employee_documents;
CREATE POLICY "Employee documents update"
ON public.employee_documents
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Employee documents delete" ON public.employee_documents;
CREATE POLICY "Employee documents delete"
ON public.employee_documents
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "employee documents select" ON storage.objects;
CREATE POLICY "employee documents select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'employees'
    AND EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "employee documents insert" ON storage.objects;
CREATE POLICY "employee documents insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'employees'
    AND EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "employee documents delete" ON storage.objects;
CREATE POLICY "employee documents delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'employees'
    AND EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);



-- ===== From schema-supabase/human-resources/employee-evaluations.sql =====

DROP POLICY IF EXISTS "Employee evaluations select" ON public.employee_evaluations;
CREATE POLICY "Employee evaluations select"
ON public.employee_evaluations
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Employee evaluations insert" ON public.employee_evaluations;
CREATE POLICY "Employee evaluations insert"
ON public.employee_evaluations
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Employee evaluations update" ON public.employee_evaluations;
CREATE POLICY "Employee evaluations update"
ON public.employee_evaluations
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Employee evaluations delete" ON public.employee_evaluations;
CREATE POLICY "Employee evaluations delete"
ON public.employee_evaluations
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);



-- ===== From schema-supabase/human-resources/employees.sql =====

DROP POLICY IF EXISTS "Employees select" ON public.employees;
CREATE POLICY "Employees select"
ON public.employees
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Employees insert" ON public.employees;
CREATE POLICY "Employees insert"
ON public.employees
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Employees update" ON public.employees;
CREATE POLICY "Employees update"
ON public.employees
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Employees delete" ON public.employees;
CREATE POLICY "Employees delete"
ON public.employees
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

-- ===== From schema-supabase/human-resources/vacation-requests.sql =====

DROP POLICY IF EXISTS "Vacation requests select" ON public.vacation_requests;
CREATE POLICY "Vacation requests select"
ON public.vacation_requests
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Vacation requests update" ON public.vacation_requests;
CREATE POLICY "Vacation requests update"
ON public.vacation_requests
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Vacation requests delete" ON public.vacation_requests;
CREATE POLICY "Vacation requests delete"
ON public.vacation_requests
FOR DELETE
TO authenticated
USING (
    (user_id = auth.uid() AND status = 'Pendiente')
    OR EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);



-- ===== From schema-supabase/incomes/incomes.sql =====

DROP POLICY IF EXISTS "Public select incomes" ON public.incomes;
CREATE POLICY "Public select incomes"
ON public.incomes
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Public insert incomes" ON public.incomes;
CREATE POLICY "Public insert incomes"
ON public.incomes
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Public update incomes" ON public.incomes;
CREATE POLICY "Public update incomes"
ON public.incomes
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Public delete incomes" ON public.incomes;
CREATE POLICY "Public delete incomes"
ON public.incomes
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);



-- ===== From schema-supabase/kanban/kanban.sql =====

CREATE OR REPLACE FUNCTION public.create_board_with_member(
  p_name text,
  p_description text,
  p_color varchar
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_board_id bigint;
  v_user_id uuid := auth.uid();
  v_is_admin boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE uid_user = v_user_id
      AND public.is_admin_role(role)
  )
  INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'No tenés permisos para crear tableros';
  END IF;

  INSERT INTO public.kanban_boards (name, description, color)
  VALUES (p_name, p_description, p_color)
  RETURNING id INTO v_board_id;

  INSERT INTO public.kanban_board_members (board_id, user_id)
  VALUES (v_board_id, v_user_id);

  RETURN jsonb_build_object(
    'id', v_board_id,
    'name', p_name,
    'description', p_description,
    'color', p_color
  );
END;
$$;

DROP POLICY IF EXISTS "kanban_boards insert" ON public.kanban_boards;
CREATE POLICY "kanban_boards insert"
ON public.kanban_boards
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "kanban_boards update" ON public.kanban_boards;
CREATE POLICY "kanban_boards update"
ON public.kanban_boards
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "kanban_boards delete" ON public.kanban_boards;
CREATE POLICY "kanban_boards delete"
ON public.kanban_boards
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "kanban_board_members insert" ON public.kanban_board_members;
CREATE POLICY "kanban_board_members insert"
ON public.kanban_board_members
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "kanban_board_members update" ON public.kanban_board_members;
CREATE POLICY "kanban_board_members update"
ON public.kanban_board_members
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

-- NOTE: the committed schema-supabase/kanban/kanban.sql is missing the
-- terminating ";" after this policy's USING clause (line ~178), merging it
-- with the next CREATE POLICY statement in the source file. Fixed here (added
-- ";" plus the missing DROP POLICY for "kanban_board_members delete") since an
-- unterminated CREATE POLICY would fail to run as-is; flagged as a residual
-- schema bug below, independent of the Superadmin rollout.
DROP POLICY IF EXISTS "kanban_board_members select" ON public.kanban_board_members;
CREATE POLICY "kanban_board_members select"
ON public.kanban_board_members
FOR SELECT
TO authenticated
USING ((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM users u
   WHERE ((u.uid_user = auth.uid()) AND (public.is_admin_role((u.role)::text))))));

DROP POLICY IF EXISTS "kanban_board_members delete" ON public.kanban_board_members;
CREATE POLICY "kanban_board_members delete"
ON public.kanban_board_members
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "kanban_lists insert" ON public.kanban_lists;
CREATE POLICY "kanban_lists insert"
ON public.kanban_lists
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "kanban_lists delete" ON public.kanban_lists;
CREATE POLICY "kanban_lists delete"
ON public.kanban_lists
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "kanban_cards insert" ON public.kanban_cards;
CREATE POLICY "kanban_cards insert"
ON public.kanban_cards
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "kanban_cards delete" ON public.kanban_cards;
CREATE POLICY "kanban_cards delete"
ON public.kanban_cards
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "kanban_files insert" ON public.kanban_files;
CREATE POLICY "kanban_files insert"
ON public.kanban_files
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "kanban_files delete" ON public.kanban_files;
CREATE POLICY "kanban_files delete"
ON public.kanban_files
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Kanban files insert" ON storage.objects;
CREATE POLICY "Kanban files insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'kanban'
    AND EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Kanban files delete" ON storage.objects;
CREATE POLICY "Kanban files delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'kanban'
    AND EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);



-- ===== From schema-supabase/modules/bucket.sql =====

DROP POLICY IF EXISTS "Modules bucket select" ON storage.objects;
CREATE POLICY "Modules bucket select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'modules'
    AND (
        EXISTS (
            SELECT 1
            FROM public.users u
            WHERE u.uid_user = auth.uid()
              AND public.is_admin_role(u.role)
        )
        OR EXISTS (
            SELECT 1
            FROM public.modules_files mf
            JOIN public.modules m
              ON m.id = mf.module_id
            WHERE mf.storage_path = storage.objects.name
              AND m.user_id = auth.uid()
        )
    )
);

DROP POLICY IF EXISTS "Modules bucket insert" ON storage.objects;
CREATE POLICY "Modules bucket insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'modules'
    AND (
        EXISTS (
            SELECT 1
            FROM public.users u
            WHERE u.uid_user = auth.uid()
              AND public.is_admin_role(u.role)
        )
        OR EXISTS (
            SELECT 1
            FROM public.modules_files mf
            JOIN public.modules m
              ON m.id = mf.module_id
            WHERE mf.storage_path = storage.objects.name
              AND m.user_id = auth.uid()
        )
    )
);

DROP POLICY IF EXISTS "Modules bucket update" ON storage.objects;
CREATE POLICY "Modules bucket update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'modules'
    AND (
        EXISTS (
            SELECT 1
            FROM public.users u
            WHERE u.uid_user = auth.uid()
              AND public.is_admin_role(u.role)
        )
        OR EXISTS (
            SELECT 1
            FROM public.modules_files mf
            JOIN public.modules m
              ON m.id = mf.module_id
            WHERE mf.storage_path = storage.objects.name
              AND m.user_id = auth.uid()
        )
    )
);

DROP POLICY IF EXISTS "Modules bucket delete" ON storage.objects;
CREATE POLICY "Modules bucket delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'modules'
    AND (
        EXISTS (
            SELECT 1
            FROM public.users u
            WHERE u.uid_user = auth.uid()
              AND public.is_admin_role(u.role)
        )
        OR EXISTS (
            SELECT 1
            FROM public.modules_files mf
            JOIN public.modules m
              ON m.id = mf.module_id
            WHERE mf.storage_path = storage.objects.name
              AND m.user_id = auth.uid()
        )
    )
);



-- ===== From schema-supabase/modules/modules.sql =====

DROP POLICY IF EXISTS "Modules select" ON public.modules;
CREATE POLICY "Modules select"
ON public.modules FOR SELECT
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.uid_user = auth.uid() AND public.is_admin_role(u.role)) 
    OR ((user_id = auth.uid()))
);

DROP POLICY IF EXISTS "Modules insert" ON public.modules;
CREATE POLICY "Modules insert"
ON public.modules FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.uid_user = auth.uid() AND public.is_admin_role(u.role))
    OR (user_id = auth.uid())
);

DROP POLICY IF EXISTS "Modules update" ON public.modules;
CREATE POLICY "Modules update"
ON public.modules FOR UPDATE
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.uid_user = auth.uid() AND public.is_admin_role(u.role)) 
    OR ((user_id = auth.uid()))
);

DROP POLICY IF EXISTS "Modules delete" ON public.modules;
CREATE POLICY "Modules delete"
ON public.modules FOR DELETE
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.uid_user = auth.uid() AND public.is_admin_role(u.role))
    OR ((user_id = auth.uid()))
);

CREATE OR REPLACE FUNCTION public.modules_guard_review_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE uid_user = auth.uid()
      AND public.is_admin_role(role)
  ) INTO v_is_admin;

  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.admin_description IS NOT NULL
       OR NEW.status IN ('approved', 'rejected')
       OR NEW.amount IS NOT NULL
    THEN
      RAISE EXCEPTION 'Solo un Admin puede aprobar, rechazar o modificar la devolución del módulo';
    END IF;
  ELSE
    IF NEW.admin_description IS DISTINCT FROM OLD.admin_description
       OR (
         NEW.status IS DISTINCT FROM OLD.status
         AND NEW.status IN ('approved', 'rejected')
       )
       OR NEW.amount IS DISTINCT FROM OLD.amount
    THEN
      RAISE EXCEPTION 'Solo un Admin puede aprobar, rechazar o modificar la devolución del módulo';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;



-- ===== From schema-supabase/modules/modules_files.sql =====

DROP POLICY IF EXISTS "Modules_files select" ON public.modules_files;
CREATE POLICY "Modules_files select"
ON public.modules_files
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
    OR EXISTS (
        SELECT 1
        FROM public.modules m
        WHERE m.id = modules_files.module_id
          AND m.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Modules_files insert" ON public.modules_files;
CREATE POLICY "Modules_files insert"
ON public.modules_files
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
    OR EXISTS (
        SELECT 1
        FROM public.modules m
        WHERE m.id = modules_files.module_id
          AND m.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Modules_files update" ON public.modules_files;
CREATE POLICY "Modules_files update"
ON public.modules_files FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
    OR EXISTS (
        SELECT 1
        FROM public.modules m
        WHERE m.id = modules_files.module_id
          AND m.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Modules_files delete" ON public.modules_files;
CREATE POLICY "Modules_files delete"
ON public.modules_files FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
    OR EXISTS (
        SELECT 1
        FROM public.modules m
        WHERE m.id = modules_files.module_id
          AND m.user_id = auth.uid()
    )
);

CREATE OR REPLACE FUNCTION public.modules_files_guard_review_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_is_owner boolean;
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE uid_user = auth.uid()
      AND public.is_admin_role(role)
  ) INTO v_is_admin;

  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS NOT NULL
       OR NEW.admin_description IS NOT NULL
    THEN
      RAISE EXCEPTION 'Solo un Admin puede aprobar, rechazar o modificar la devolución del archivo';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.admin_description IS DISTINCT FROM OLD.admin_description THEN
    RAISE EXCEPTION 'Solo un Admin puede modificar la devolución del archivo';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status IS NOT NULL THEN
      RAISE EXCEPTION 'Solo un Admin puede aprobar o rechazar el archivo';
    END IF;

    IF OLD.status IS DISTINCT FROM 'rejected' THEN
      RAISE EXCEPTION 'Solo se pueden reenviar a revisión archivos rechazados';
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM public.modules m
      WHERE m.id = NEW.module_id
        AND m.user_id = auth.uid()
    ) INTO v_is_owner;

    IF NOT v_is_owner THEN
      RAISE EXCEPTION 'Solo el dueño del módulo puede reenviar el archivo a revisión';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;



-- ===== From schema-supabase/modules/modules_monthly_settlements.sql =====

DROP POLICY IF EXISTS "Modules monthly settlements select" ON public.modules_monthly_settlements;
CREATE POLICY "Modules monthly settlements select"
ON public.modules_monthly_settlements
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
    OR user_id = auth.uid()
);

DROP POLICY IF EXISTS "Modules monthly settlements insert" ON public.modules_monthly_settlements;
CREATE POLICY "Modules monthly settlements insert"
ON public.modules_monthly_settlements
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Modules monthly settlements update" ON public.modules_monthly_settlements;
CREATE POLICY "Modules monthly settlements update"
ON public.modules_monthly_settlements
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Modules monthly settlements delete" ON public.modules_monthly_settlements;
CREATE POLICY "Modules monthly settlements delete"
ON public.modules_monthly_settlements
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);



-- ===== From schema-supabase/modules/modules_settings.sql =====

DROP POLICY IF EXISTS "Modules settings select" ON public.modules_settings;
CREATE POLICY "Modules settings select"
ON public.modules_settings
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Modules settings insert" ON public.modules_settings;
CREATE POLICY "Modules settings insert"
ON public.modules_settings
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Modules settings update" ON public.modules_settings;
CREATE POLICY "Modules settings update"
ON public.modules_settings
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Modules settings delete" ON public.modules_settings;
CREATE POLICY "Modules settings delete"
ON public.modules_settings
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);



-- ===== From schema-supabase/payment-methods/payment_methods.sql =====

DROP POLICY IF EXISTS "Public select payment_methods" ON public.payment_methods;
CREATE POLICY "Public select payment_methods"
ON public.payment_methods
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Public insert payment_methods" ON public.payment_methods;
CREATE POLICY "Public insert payment_methods"
ON public.payment_methods
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Public delete payment_methods" ON public.payment_methods;
CREATE POLICY "Public delete payment_methods"
ON public.payment_methods
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Public update payment_methods" ON public.payment_methods;
CREATE POLICY "Public update payment_methods"
ON public.payment_methods
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);



-- ===== From schema-supabase/payments/payments.sql =====

DROP POLICY IF EXISTS "Public select payments" ON public.payments;
CREATE POLICY "Public select payments"
ON public.payments
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Public insert payments" ON public.payments;
CREATE POLICY "Public insert payments"
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Public update payments" ON public.payments;
CREATE POLICY "Public update payments"
ON public.payments
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Public delete payments" ON public.payments;
CREATE POLICY "Public delete payments"
ON public.payments
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);



-- ===== From schema-supabase/suppliers/files_bucket.sql =====

DROP POLICY IF EXISTS "Suppliers files bucket select" ON storage.objects;
CREATE POLICY "Suppliers files bucket select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'suppliers-files'
    AND EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Suppliers files bucket insert" ON storage.objects;
CREATE POLICY "Suppliers files bucket insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'suppliers-files'
    AND EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Suppliers files bucket update" ON storage.objects;
CREATE POLICY "Suppliers files bucket update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'suppliers-files'
    AND EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Suppliers files bucket delete" ON storage.objects;
CREATE POLICY "Suppliers files bucket delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'suppliers-files'
    AND EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);



-- ===== From schema-supabase/suppliers/files_payments_suppliers.sql =====

DROP POLICY IF EXISTS "Public select files_payments_suppliers" ON public.files_payments_suppliers;
CREATE POLICY "Public select files_payments_suppliers"
ON public.files_payments_suppliers
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Public insert files_payments_suppliers" ON public.files_payments_suppliers;
CREATE POLICY "Public insert files_payments_suppliers"
ON public.files_payments_suppliers
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Public delete files_payments_suppliers" ON public.files_payments_suppliers;
CREATE POLICY "Public delete files_payments_suppliers"
ON public.files_payments_suppliers
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Public update files_payments_suppliers" ON public.files_payments_suppliers;
CREATE POLICY "Public update files_payments_suppliers"
ON public.files_payments_suppliers
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);



-- ===== From schema-supabase/suppliers/files_purchases_suppliers.sql =====

DROP POLICY IF EXISTS "Public select files_purchases_suppliers" ON public.files_purchases_suppliers;
CREATE POLICY "Public select files_purchases_suppliers"
ON public.files_purchases_suppliers
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Public insert files_purchases_suppliers" ON public.files_purchases_suppliers;
CREATE POLICY "Public insert files_purchases_suppliers"
ON public.files_purchases_suppliers
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Public delete files_purchases_suppliers" ON public.files_purchases_suppliers;
CREATE POLICY "Public delete files_purchases_suppliers"
ON public.files_purchases_suppliers
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Public update files_purchases_suppliers" ON public.files_purchases_suppliers;
CREATE POLICY "Public update files_purchases_suppliers"
ON public.files_purchases_suppliers
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);



-- ===== From schema-supabase/suppliers/payments_suppliers.sql =====

DROP POLICY IF EXISTS "Public select payments_suppliers" ON public.payments_suppliers;
CREATE POLICY "Public select payments_suppliers"
ON public.payments_suppliers
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Public insert payments_suppliers" ON public.payments_suppliers;
CREATE POLICY "Public insert payments_suppliers"
ON public.payments_suppliers
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Public delete payments_suppliers" ON public.payments_suppliers;
CREATE POLICY "Public delete payments_suppliers"
ON public.payments_suppliers
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Public update payments_suppliers" ON public.payments_suppliers;
CREATE POLICY "Public update payments_suppliers"
ON public.payments_suppliers
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);



-- ===== From schema-supabase/suppliers/purchases_suppliers.sql =====

DROP POLICY IF EXISTS "Public select purchases_suppliers" ON public.purchases_suppliers;
CREATE POLICY "Public select purchases_suppliers"
ON public.purchases_suppliers
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Public insert purchases_suppliers" ON public.purchases_suppliers;
CREATE POLICY "Public insert purchases_suppliers"
ON public.purchases_suppliers
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Public delete purchases_suppliers" ON public.purchases_suppliers;
CREATE POLICY "Public delete purchases_suppliers"
ON public.purchases_suppliers
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Public update purchases_suppliers" ON public.purchases_suppliers;
CREATE POLICY "Public update purchases_suppliers"
ON public.purchases_suppliers
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);



-- ===== From schema-supabase/suppliers/suppliers.sql =====

DROP POLICY IF EXISTS "Public select suppliers" ON public.suppliers;
CREATE POLICY "Public select suppliers"
ON public.suppliers
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Public insert suppliers" ON public.suppliers;
CREATE POLICY "Public insert suppliers"
ON public.suppliers
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Public delete suppliers" ON public.suppliers;
CREATE POLICY "Public delete suppliers"
ON public.suppliers
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Public update suppliers" ON public.suppliers;
CREATE POLICY "Public update suppliers"
ON public.suppliers
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);



-- ===== From schema-supabase/voucher-types/voucher_types.sql =====

DROP POLICY IF EXISTS "Public select voucher_types" ON public.voucher_types;
CREATE POLICY "Public select voucher_types"
ON public.voucher_types
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Public insert voucher_types" ON public.voucher_types;
CREATE POLICY "Public insert voucher_types"
ON public.voucher_types
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Public update voucher_types" ON public.voucher_types;
CREATE POLICY "Public update voucher_types"
ON public.voucher_types
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Public delete voucher_types" ON public.voucher_types;
CREATE POLICY "Public delete voucher_types"
ON public.voucher_types
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND public.is_admin_role(u.role)
    )
);



-- ===== From schema-supabase/works/checklists.sql =====

DROP POLICY IF EXISTS "Checklists insert" ON public.checklists;
CREATE POLICY "Checklists insert"
ON public.checklists
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Checklists delete" ON public.checklists;
CREATE POLICY "Checklists delete"
ON public.checklists
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Items checklists insert" ON public.items_checklists;
CREATE POLICY "Items checklists insert"
ON public.items_checklists
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Items checklists delete" ON public.items_checklists;
CREATE POLICY "Items checklists delete"
ON public.items_checklists
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Materials insert" ON public.materials;
CREATE POLICY "Materials insert"
ON public.materials
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Materials update" ON public.materials;
CREATE POLICY "Materials update"
ON public.materials
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Materials delete" ON public.materials;
CREATE POLICY "Materials delete"
ON public.materials
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Items predefined select" ON public.items_predefined;
CREATE POLICY "Items predefined select"
ON public.items_predefined
FOR SELECT
TO authenticated
USING (    
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Items predefined insert" ON public.items_predefined;
CREATE POLICY "Items predefined insert"
ON public.items_predefined
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Items predefined update" ON public.items_predefined;
CREATE POLICY "Items predefined update"
ON public.items_predefined
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Items predefined delete" ON public.items_predefined;
CREATE POLICY "Items predefined delete"
ON public.items_predefined
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);



-- ===== From schema-supabase/works/works.sql =====

DROP POLICY IF EXISTS "Public insert works" ON public.works;
CREATE POLICY "Public insert works"
ON public.works
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.uid_user = auth.uid()
        AND public.is_admin_role(u.role)
  )
);

DROP POLICY IF EXISTS "Public delete works" ON public.works;
CREATE POLICY "Public delete works"
ON public.works
FOR DELETE
TO authenticated
USING (
  EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.uid_user = auth.uid()
        AND public.is_admin_role(u.role)
  )
);

DROP POLICY IF EXISTS "Public update works" ON public.works;
CREATE POLICY "Public update works"
ON public.works
FOR UPDATE
TO authenticated
USING (
  EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.uid_user = auth.uid()
        AND public.is_admin_role(u.role)
  )
);

DROP POLICY IF EXISTS "works files delete" ON storage.objects;
CREATE POLICY "works files delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'works-files'
    AND EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
);



-- ---------------------------------------------------------------------
-- 3. attendance + attendance_entries — stricter rule
-- ---------------------------------------------------------------------
-- SELECT: unchanged in spirit (Admin and Superadmin both keep full read
-- access for Historial de fichajes / Liquidaciones; everyone keeps
-- reading their own rows), just routed through is_admin_role().
--
-- INSERT: everyone keeps inserting their own row (normal clock in/out).
-- The "insert on behalf of another user" branch (used by "Crear
-- registro") now requires is_superadmin_role() instead of is_admin_role().
--
-- UPDATE / DELETE: these two tables never had a "own row" branch in the
-- original policies — they were pure admin-only gates. They now require
-- is_superadmin_role() instead of is_admin_role(), so Admin loses the
-- ability to edit/delete any attendance row (including entries created by
-- the automatic clock in/out flow) and only Superadmin retains it.
--
-- From schema-supabase/attendance/attendance.sql
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS "Attendance select" ON public.attendance;
CREATE POLICY "Attendance select"
ON public.attendance
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_admin_role(u.role)
    )
    OR user_id = auth.uid()
);

DROP POLICY IF EXISTS "Attendance insert" ON public.attendance;
CREATE POLICY "Attendance insert"
ON public.attendance
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_superadmin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Attendance update" ON public.attendance;
CREATE POLICY "Attendance update"
ON public.attendance
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_superadmin_role(u.role)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_superadmin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Attendance delete" ON public.attendance;
CREATE POLICY "Attendance delete"
ON public.attendance
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_superadmin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Attendance entries select" ON public.attendance_entries;
CREATE POLICY "Attendance entries select"
ON public.attendance_entries
FOR SELECT
TO authenticated
USING (
    (EXISTS ( SELECT 1
        FROM attendance a
        WHERE ((a.id = attendance_entries.attendance_id) AND ((a.user_id = auth.uid()) OR
            (EXISTS ( SELECT 1 FROM users u
            WHERE ((u.uid_user = auth.uid()) AND public.is_admin_role((u.role)::text))))))
        )
    )
);

DROP POLICY IF EXISTS "Attendance entries insert" ON public.attendance_entries;
CREATE POLICY "Attendance entries insert"
ON public.attendance_entries
FOR INSERT
TO authenticated
WITH CHECK (
    (EXISTS ( SELECT 1
        FROM attendance a
            WHERE ((a.id = attendance_entries.attendance_id) AND ((a.user_id = auth.uid()) OR
            (EXISTS ( SELECT 1 FROM users u
            WHERE ((u.uid_user = auth.uid()) AND public.is_superadmin_role((u.role)::text))))))
        )
    )
);

DROP POLICY IF EXISTS "Attendance entries update" ON public.attendance_entries;
CREATE POLICY "Attendance entries update"
ON public.attendance_entries
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_superadmin_role(u.role)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_superadmin_role(u.role)
    )
);

DROP POLICY IF EXISTS "Attendance entries delete" ON public.attendance_entries;
CREATE POLICY "Attendance entries delete"
ON public.attendance_entries
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
          AND public.is_superadmin_role(u.role)
    )
);
