------ USER VIEWS ------
-- Per-user views a Superadmin can customize on top of the role.
-- null = the role defaults (defined in constants/permissions/views.ts).
-- A list = exactly those module and tab keys, e.g. ["clients", "clients.budgets"].

alter table public.users add column if not exists views jsonb null;

------ CAN VIEW ------
-- True when the logged-in user was granted that view. A tab also needs its module,
-- the same rule the app applies. Security definer so policies can read users safely.

create or replace function public.can_view(view_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.uid_user = auth.uid()
      and u.views ? view_key
      and u.views ? split_part(view_key, '.', 1)
  );
$$;

------ READ BY VIEW ------
-- Extra SELECT policies, added next to the existing role ones (policies are OR-ed),
-- so whoever gets a view can also read the data behind it.
-- Writes stay as they are: these grant viewing only.

DROP POLICY IF EXISTS "budgets select by view" ON public.budgets;
CREATE POLICY "budgets select by view"
ON public.budgets
FOR SELECT
TO authenticated
USING (
    public.can_view('clients.budgets')
    or public.can_view('reports')
    or public.can_view('cash-flow')
);

DROP POLICY IF EXISTS "folder_budgets select by view" ON public.folder_budgets;
CREATE POLICY "folder_budgets select by view"
ON public.folder_budgets
FOR SELECT
TO authenticated
USING (
    public.can_view('clients.budgets')
    or public.can_view('reports')
    or public.can_view('cash-flow')
);

DROP POLICY IF EXISTS "budget_signatures select by view" ON public.budget_signatures;
CREATE POLICY "budget_signatures select by view"
ON public.budget_signatures
FOR SELECT
TO authenticated
USING (
    public.can_view('clients.budgets')
);

DROP POLICY IF EXISTS "balances select by view" ON public.balances;
CREATE POLICY "balances select by view"
ON public.balances
FOR SELECT
TO authenticated
USING (
    public.can_view('clients.balances')
    or public.can_view('reports')
    or public.can_view('cash-flow')
);

DROP POLICY IF EXISTS "balance_transactions select by view" ON public.balance_transactions;
CREATE POLICY "balance_transactions select by view"
ON public.balance_transactions
FOR SELECT
TO authenticated
USING (
    public.can_view('clients.balances')
    or public.can_view('cash-flow')
);

DROP POLICY IF EXISTS "bank_accounts select by view" ON public.bank_accounts;
CREATE POLICY "bank_accounts select by view"
ON public.bank_accounts
FOR SELECT
TO authenticated
USING (
    public.can_view('cash-flow')
);

DROP POLICY IF EXISTS "cash_boxes select by view" ON public.cash_boxes;
CREATE POLICY "cash_boxes select by view"
ON public.cash_boxes
FOR SELECT
TO authenticated
USING (
    public.can_view('cash-flow')
);

DROP POLICY IF EXISTS "transactions_box select by view" ON public.transactions_box;
CREATE POLICY "transactions_box select by view"
ON public.transactions_box
FOR SELECT
TO authenticated
USING (
    public.can_view('cash-flow')
);

DROP POLICY IF EXISTS "cash_flow_categories select by view" ON public.cash_flow_categories;
CREATE POLICY "cash_flow_categories select by view"
ON public.cash_flow_categories
FOR SELECT
TO authenticated
USING (
    public.can_view('cash-flow')
);

DROP POLICY IF EXISTS "collections select by view" ON public.collections;
CREATE POLICY "collections select by view"
ON public.collections
FOR SELECT
TO authenticated
USING (
    public.can_view('cash-flow')
);

DROP POLICY IF EXISTS "expenses select by view" ON public.expenses;
CREATE POLICY "expenses select by view"
ON public.expenses
FOR SELECT
TO authenticated
USING (
    public.can_view('cash-flow')
);

DROP POLICY IF EXISTS "incomes select by view" ON public.incomes;
CREATE POLICY "incomes select by view"
ON public.incomes
FOR SELECT
TO authenticated
USING (
    public.can_view('cash-flow')
);

DROP POLICY IF EXISTS "payments select by view" ON public.payments;
CREATE POLICY "payments select by view"
ON public.payments
FOR SELECT
TO authenticated
USING (
    public.can_view('cash-flow')
);

DROP POLICY IF EXISTS "payment_methods select by view" ON public.payment_methods;
CREATE POLICY "payment_methods select by view"
ON public.payment_methods
FOR SELECT
TO authenticated
USING (
    public.can_view('cash-flow')
);

DROP POLICY IF EXISTS "voucher_types select by view" ON public.voucher_types;
CREATE POLICY "voucher_types select by view"
ON public.voucher_types
FOR SELECT
TO authenticated
USING (
    public.can_view('cash-flow')
);

DROP POLICY IF EXISTS "fixed_expenses select by view" ON public.fixed_expenses;
CREATE POLICY "fixed_expenses select by view"
ON public.fixed_expenses
FOR SELECT
TO authenticated
USING (
    public.can_view('cash-flow')
);

DROP POLICY IF EXISTS "fixed_expense_payments select by view" ON public.fixed_expense_payments;
CREATE POLICY "fixed_expense_payments select by view"
ON public.fixed_expense_payments
FOR SELECT
TO authenticated
USING (
    public.can_view('cash-flow')
);

DROP POLICY IF EXISTS "suppliers select by view" ON public.suppliers;
CREATE POLICY "suppliers select by view"
ON public.suppliers
FOR SELECT
TO authenticated
USING (
    public.can_view('cash-flow')
);

DROP POLICY IF EXISTS "purchases_suppliers select by view" ON public.purchases_suppliers;
CREATE POLICY "purchases_suppliers select by view"
ON public.purchases_suppliers
FOR SELECT
TO authenticated
USING (
    public.can_view('cash-flow')
);

DROP POLICY IF EXISTS "payments_suppliers select by view" ON public.payments_suppliers;
CREATE POLICY "payments_suppliers select by view"
ON public.payments_suppliers
FOR SELECT
TO authenticated
USING (
    public.can_view('cash-flow')
);

DROP POLICY IF EXISTS "files_purchases_suppliers select by view" ON public.files_purchases_suppliers;
CREATE POLICY "files_purchases_suppliers select by view"
ON public.files_purchases_suppliers
FOR SELECT
TO authenticated
USING (
    public.can_view('cash-flow')
);

DROP POLICY IF EXISTS "files_payments_suppliers select by view" ON public.files_payments_suppliers;
CREATE POLICY "files_payments_suppliers select by view"
ON public.files_payments_suppliers
FOR SELECT
TO authenticated
USING (
    public.can_view('cash-flow')
);

DROP POLICY IF EXISTS "employees select by view" ON public.employees;
CREATE POLICY "employees select by view"
ON public.employees
FOR SELECT
TO authenticated
USING (
    public.can_view('employees.fichas')
    or public.can_view('employees.evaluaciones')
);

DROP POLICY IF EXISTS "employee_documents select by view" ON public.employee_documents;
CREATE POLICY "employee_documents select by view"
ON public.employee_documents
FOR SELECT
TO authenticated
USING (
    public.can_view('employees.fichas')
);

DROP POLICY IF EXISTS "employee_evaluations select by view" ON public.employee_evaluations;
CREATE POLICY "employee_evaluations select by view"
ON public.employee_evaluations
FOR SELECT
TO authenticated
USING (
    public.can_view('employees.evaluaciones')
);

DROP POLICY IF EXISTS "appointments select by view" ON public.appointments;
CREATE POLICY "appointments select by view"
ON public.appointments
FOR SELECT
TO authenticated
USING (
    public.can_view('calendar.appointments')
);

DROP POLICY IF EXISTS "appointment_settings select by view" ON public.appointment_settings;
CREATE POLICY "appointment_settings select by view"
ON public.appointment_settings
FOR SELECT
TO authenticated
USING (
    public.can_view('calendar.appointments')
);

DROP POLICY IF EXISTS "appointment_blocked_dates select by view" ON public.appointment_blocked_dates;
CREATE POLICY "appointment_blocked_dates select by view"
ON public.appointment_blocked_dates
FOR SELECT
TO authenticated
USING (
    public.can_view('calendar.appointments')
);
