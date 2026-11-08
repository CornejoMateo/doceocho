-- RUN PRODUCTION, step 10 of migrations-unify/01-migrate-purchases-to-expenses.sql's order: after
-- expenses.sql/payments.sql/files_expenses.sql/files_payments.sql, 01,
-- cash-flow-stats/cash_flow_summary_monthly.sql and suppliers.sql, before deploying the app.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_admin_role'
  ) THEN
    RAISE EXCEPTION
      'public.is_admin_role(text) does not exist. Run schema-supabase/attendance/superadmin-role.sql (the is_admin_role/is_superadmin_role function definitions, lines 1-15) before this script.';
  END IF;
END $$;

------ files_expenses ------

DROP POLICY IF EXISTS "Public select files_expenses" ON public.files_expenses;
CREATE POLICY "Public select files_expenses"
ON public.files_expenses
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

DROP POLICY IF EXISTS "Public insert files_expenses" ON public.files_expenses;
CREATE POLICY "Public insert files_expenses"
ON public.files_expenses
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

DROP POLICY IF EXISTS "Public delete files_expenses" ON public.files_expenses;
CREATE POLICY "Public delete files_expenses"
ON public.files_expenses
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

DROP POLICY IF EXISTS "Public update files_expenses" ON public.files_expenses;
CREATE POLICY "Public update files_expenses"
ON public.files_expenses
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

------ files_payments ------

DROP POLICY IF EXISTS "Public select files_payments" ON public.files_payments;
CREATE POLICY "Public select files_payments"
ON public.files_payments
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

DROP POLICY IF EXISTS "Public insert files_payments" ON public.files_payments;
CREATE POLICY "Public insert files_payments"
ON public.files_payments
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

DROP POLICY IF EXISTS "Public delete files_payments" ON public.files_payments;
CREATE POLICY "Public delete files_payments"
ON public.files_payments
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

DROP POLICY IF EXISTS "Public update files_payments" ON public.files_payments;
CREATE POLICY "Public update files_payments"
ON public.files_payments
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