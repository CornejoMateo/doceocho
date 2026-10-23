------ USER EDIT PERMISSIONS ------
-- Builds on user-views.sql (run that one first).
-- users.edits: null = the role defaults (admins edit what they see, other roles none of this);
-- a list = exactly the views this user can create, change and delete in, e.g. ["clients", "clients.budgets"].

alter table public.users add column if not exists edits jsonb null;

------ FUNCTIONS ------
-- Security definer so policies can read users safely; all of them look at the logged-in user only.

-- Granted: the user was explicitly given the edit (and its view, a tab also needs its module).
create or replace function public.can_edit(edit_key text)
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
      and u.edits ? edit_key
      and u.views ? edit_key
      and u.views ? split_part(edit_key, '.', 1)
  );
$$;

create or replace function public.can_edit_any(edit_keys text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from unnest(edit_keys) k where public.can_edit(k));
$$;

-- Restrictions only bite customized users: no customization, or Superadmin, means no extra limit.
create or replace function public.view_allowed(view_keys text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select public.is_superadmin_role(u.role)
      or u.views is null
      or exists (
        select 1 from unnest(view_keys) k
        where u.views ? k and u.views ? split_part(k, '.', 1)
      )
    from public.users u
    where u.uid_user = auth.uid()
  ), true);
$$;

-- Without custom edits it follows the views: nobody writes data they cannot see.
create or replace function public.edit_allowed(edit_keys text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select case
      when public.is_superadmin_role(u.role) then true
      when u.edits is null then public.view_allowed(edit_keys)
      else exists (
        select 1 from unnest(edit_keys) k
        where u.edits ? k and u.views ? k and u.views ? split_part(k, '.', 1)
      )
    end
    from public.users u
    where u.uid_user = auth.uid()
  ), true);
$$;

------ READ BY VIEW: CASH AND BANKS FROM CLIENT BALANCES ------
-- Fix for user-views.sql: a client's checking account also reads banks, cash boxes and payment methods.

DROP POLICY IF EXISTS "bank_accounts select by view" ON public.bank_accounts;
CREATE POLICY "bank_accounts select by view"
ON public.bank_accounts
FOR SELECT
TO authenticated
USING (
    public.can_view('cash-flow')
    or public.can_view('clients.balances')
);

DROP POLICY IF EXISTS "cash_boxes select by view" ON public.cash_boxes;
CREATE POLICY "cash_boxes select by view"
ON public.cash_boxes
FOR SELECT
TO authenticated
USING (
    public.can_view('cash-flow')
    or public.can_view('clients.balances')
);

DROP POLICY IF EXISTS "transactions_box select by view" ON public.transactions_box;
CREATE POLICY "transactions_box select by view"
ON public.transactions_box
FOR SELECT
TO authenticated
USING (
    public.can_view('cash-flow')
    or public.can_view('clients.balances')
);

DROP POLICY IF EXISTS "payment_methods select by view" ON public.payment_methods;
CREATE POLICY "payment_methods select by view"
ON public.payment_methods
FOR SELECT
TO authenticated
USING (
    public.can_view('cash-flow')
    or public.can_view('clients.balances')
);

------ WRITE BY EDIT ------
-- Extra policies next to the existing role ones (permissive policies are OR-ed):
-- whoever is given the edit can create, change and delete the data behind it.

DROP POLICY IF EXISTS "budgets insert by edit" ON public.budgets;
CREATE POLICY "budgets insert by edit"
ON public.budgets
FOR INSERT
TO authenticated
WITH CHECK (public.can_edit_any(array['clients.budgets']));

DROP POLICY IF EXISTS "budgets update by edit" ON public.budgets;
CREATE POLICY "budgets update by edit"
ON public.budgets
FOR UPDATE
TO authenticated
USING (public.can_edit_any(array['clients.budgets']))
WITH CHECK (public.can_edit_any(array['clients.budgets']));

DROP POLICY IF EXISTS "budgets delete by edit" ON public.budgets;
CREATE POLICY "budgets delete by edit"
ON public.budgets
FOR DELETE
TO authenticated
USING (public.can_edit_any(array['clients.budgets']));

DROP POLICY IF EXISTS "folder_budgets insert by edit" ON public.folder_budgets;
CREATE POLICY "folder_budgets insert by edit"
ON public.folder_budgets
FOR INSERT
TO authenticated
WITH CHECK (public.can_edit_any(array['clients.budgets']));

DROP POLICY IF EXISTS "folder_budgets update by edit" ON public.folder_budgets;
CREATE POLICY "folder_budgets update by edit"
ON public.folder_budgets
FOR UPDATE
TO authenticated
USING (public.can_edit_any(array['clients.budgets']))
WITH CHECK (public.can_edit_any(array['clients.budgets']));

DROP POLICY IF EXISTS "folder_budgets delete by edit" ON public.folder_budgets;
CREATE POLICY "folder_budgets delete by edit"
ON public.folder_budgets
FOR DELETE
TO authenticated
USING (public.can_edit_any(array['clients.budgets']));

DROP POLICY IF EXISTS "budget_signatures insert by edit" ON public.budget_signatures;
CREATE POLICY "budget_signatures insert by edit"
ON public.budget_signatures
FOR INSERT
TO authenticated
WITH CHECK (public.can_edit_any(array['clients.budgets']));

DROP POLICY IF EXISTS "budget_signatures update by edit" ON public.budget_signatures;
CREATE POLICY "budget_signatures update by edit"
ON public.budget_signatures
FOR UPDATE
TO authenticated
USING (public.can_edit_any(array['clients.budgets']))
WITH CHECK (public.can_edit_any(array['clients.budgets']));

DROP POLICY IF EXISTS "budget_signatures delete by edit" ON public.budget_signatures;
CREATE POLICY "budget_signatures delete by edit"
ON public.budget_signatures
FOR DELETE
TO authenticated
USING (public.can_edit_any(array['clients.budgets']));

DROP POLICY IF EXISTS "balances insert by edit" ON public.balances;
CREATE POLICY "balances insert by edit"
ON public.balances
FOR INSERT
TO authenticated
WITH CHECK (public.can_edit_any(array['clients.balances', 'cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "balances update by edit" ON public.balances;
CREATE POLICY "balances update by edit"
ON public.balances
FOR UPDATE
TO authenticated
USING (public.can_edit_any(array['clients.balances', 'cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']))
WITH CHECK (public.can_edit_any(array['clients.balances', 'cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "balances delete by edit" ON public.balances;
CREATE POLICY "balances delete by edit"
ON public.balances
FOR DELETE
TO authenticated
USING (public.can_edit_any(array['clients.balances', 'cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "balance_transactions insert by edit" ON public.balance_transactions;
CREATE POLICY "balance_transactions insert by edit"
ON public.balance_transactions
FOR INSERT
TO authenticated
WITH CHECK (public.can_edit_any(array['clients.balances', 'cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "balance_transactions update by edit" ON public.balance_transactions;
CREATE POLICY "balance_transactions update by edit"
ON public.balance_transactions
FOR UPDATE
TO authenticated
USING (public.can_edit_any(array['clients.balances', 'cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']))
WITH CHECK (public.can_edit_any(array['clients.balances', 'cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "balance_transactions delete by edit" ON public.balance_transactions;
CREATE POLICY "balance_transactions delete by edit"
ON public.balance_transactions
FOR DELETE
TO authenticated
USING (public.can_edit_any(array['clients.balances', 'cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "bank_accounts insert by edit" ON public.bank_accounts;
CREATE POLICY "bank_accounts insert by edit"
ON public.bank_accounts
FOR INSERT
TO authenticated
WITH CHECK (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement', 'clients.balances']));

DROP POLICY IF EXISTS "bank_accounts update by edit" ON public.bank_accounts;
CREATE POLICY "bank_accounts update by edit"
ON public.bank_accounts
FOR UPDATE
TO authenticated
USING (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement', 'clients.balances']))
WITH CHECK (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement', 'clients.balances']));

DROP POLICY IF EXISTS "bank_accounts delete by edit" ON public.bank_accounts;
CREATE POLICY "bank_accounts delete by edit"
ON public.bank_accounts
FOR DELETE
TO authenticated
USING (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement', 'clients.balances']));

DROP POLICY IF EXISTS "cash_boxes insert by edit" ON public.cash_boxes;
CREATE POLICY "cash_boxes insert by edit"
ON public.cash_boxes
FOR INSERT
TO authenticated
WITH CHECK (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement', 'clients.balances']));

DROP POLICY IF EXISTS "cash_boxes update by edit" ON public.cash_boxes;
CREATE POLICY "cash_boxes update by edit"
ON public.cash_boxes
FOR UPDATE
TO authenticated
USING (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement', 'clients.balances']))
WITH CHECK (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement', 'clients.balances']));

DROP POLICY IF EXISTS "cash_boxes delete by edit" ON public.cash_boxes;
CREATE POLICY "cash_boxes delete by edit"
ON public.cash_boxes
FOR DELETE
TO authenticated
USING (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement', 'clients.balances']));

DROP POLICY IF EXISTS "transactions_box insert by edit" ON public.transactions_box;
CREATE POLICY "transactions_box insert by edit"
ON public.transactions_box
FOR INSERT
TO authenticated
WITH CHECK (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement', 'clients.balances']));

DROP POLICY IF EXISTS "transactions_box update by edit" ON public.transactions_box;
CREATE POLICY "transactions_box update by edit"
ON public.transactions_box
FOR UPDATE
TO authenticated
USING (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement', 'clients.balances']))
WITH CHECK (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement', 'clients.balances']));

DROP POLICY IF EXISTS "transactions_box delete by edit" ON public.transactions_box;
CREATE POLICY "transactions_box delete by edit"
ON public.transactions_box
FOR DELETE
TO authenticated
USING (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement', 'clients.balances']));

DROP POLICY IF EXISTS "payment_methods insert by edit" ON public.payment_methods;
CREATE POLICY "payment_methods insert by edit"
ON public.payment_methods
FOR INSERT
TO authenticated
WITH CHECK (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "payment_methods update by edit" ON public.payment_methods;
CREATE POLICY "payment_methods update by edit"
ON public.payment_methods
FOR UPDATE
TO authenticated
USING (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']))
WITH CHECK (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "payment_methods delete by edit" ON public.payment_methods;
CREATE POLICY "payment_methods delete by edit"
ON public.payment_methods
FOR DELETE
TO authenticated
USING (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "incomes insert by edit" ON public.incomes;
CREATE POLICY "incomes insert by edit"
ON public.incomes
FOR INSERT
TO authenticated
WITH CHECK (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "incomes update by edit" ON public.incomes;
CREATE POLICY "incomes update by edit"
ON public.incomes
FOR UPDATE
TO authenticated
USING (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']))
WITH CHECK (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "incomes delete by edit" ON public.incomes;
CREATE POLICY "incomes delete by edit"
ON public.incomes
FOR DELETE
TO authenticated
USING (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "expenses insert by edit" ON public.expenses;
CREATE POLICY "expenses insert by edit"
ON public.expenses
FOR INSERT
TO authenticated
WITH CHECK (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "expenses update by edit" ON public.expenses;
CREATE POLICY "expenses update by edit"
ON public.expenses
FOR UPDATE
TO authenticated
USING (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']))
WITH CHECK (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "expenses delete by edit" ON public.expenses;
CREATE POLICY "expenses delete by edit"
ON public.expenses
FOR DELETE
TO authenticated
USING (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "collections insert by edit" ON public.collections;
CREATE POLICY "collections insert by edit"
ON public.collections
FOR INSERT
TO authenticated
WITH CHECK (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "collections update by edit" ON public.collections;
CREATE POLICY "collections update by edit"
ON public.collections
FOR UPDATE
TO authenticated
USING (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']))
WITH CHECK (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "collections delete by edit" ON public.collections;
CREATE POLICY "collections delete by edit"
ON public.collections
FOR DELETE
TO authenticated
USING (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "payments insert by edit" ON public.payments;
CREATE POLICY "payments insert by edit"
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "payments update by edit" ON public.payments;
CREATE POLICY "payments update by edit"
ON public.payments
FOR UPDATE
TO authenticated
USING (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']))
WITH CHECK (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "payments delete by edit" ON public.payments;
CREATE POLICY "payments delete by edit"
ON public.payments
FOR DELETE
TO authenticated
USING (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "fixed_expenses insert by edit" ON public.fixed_expenses;
CREATE POLICY "fixed_expenses insert by edit"
ON public.fixed_expenses
FOR INSERT
TO authenticated
WITH CHECK (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "fixed_expenses update by edit" ON public.fixed_expenses;
CREATE POLICY "fixed_expenses update by edit"
ON public.fixed_expenses
FOR UPDATE
TO authenticated
USING (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']))
WITH CHECK (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "fixed_expenses delete by edit" ON public.fixed_expenses;
CREATE POLICY "fixed_expenses delete by edit"
ON public.fixed_expenses
FOR DELETE
TO authenticated
USING (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "fixed_expense_payments insert by edit" ON public.fixed_expense_payments;
CREATE POLICY "fixed_expense_payments insert by edit"
ON public.fixed_expense_payments
FOR INSERT
TO authenticated
WITH CHECK (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "fixed_expense_payments update by edit" ON public.fixed_expense_payments;
CREATE POLICY "fixed_expense_payments update by edit"
ON public.fixed_expense_payments
FOR UPDATE
TO authenticated
USING (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']))
WITH CHECK (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "fixed_expense_payments delete by edit" ON public.fixed_expense_payments;
CREATE POLICY "fixed_expense_payments delete by edit"
ON public.fixed_expense_payments
FOR DELETE
TO authenticated
USING (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "cash_flow_categories insert by edit" ON public.cash_flow_categories;
CREATE POLICY "cash_flow_categories insert by edit"
ON public.cash_flow_categories
FOR INSERT
TO authenticated
WITH CHECK (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "cash_flow_categories update by edit" ON public.cash_flow_categories;
CREATE POLICY "cash_flow_categories update by edit"
ON public.cash_flow_categories
FOR UPDATE
TO authenticated
USING (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']))
WITH CHECK (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "cash_flow_categories delete by edit" ON public.cash_flow_categories;
CREATE POLICY "cash_flow_categories delete by edit"
ON public.cash_flow_categories
FOR DELETE
TO authenticated
USING (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "voucher_types insert by edit" ON public.voucher_types;
CREATE POLICY "voucher_types insert by edit"
ON public.voucher_types
FOR INSERT
TO authenticated
WITH CHECK (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "voucher_types update by edit" ON public.voucher_types;
CREATE POLICY "voucher_types update by edit"
ON public.voucher_types
FOR UPDATE
TO authenticated
USING (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']))
WITH CHECK (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "voucher_types delete by edit" ON public.voucher_types;
CREATE POLICY "voucher_types delete by edit"
ON public.voucher_types
FOR DELETE
TO authenticated
USING (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "suppliers insert by edit" ON public.suppliers;
CREATE POLICY "suppliers insert by edit"
ON public.suppliers
FOR INSERT
TO authenticated
WITH CHECK (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "suppliers update by edit" ON public.suppliers;
CREATE POLICY "suppliers update by edit"
ON public.suppliers
FOR UPDATE
TO authenticated
USING (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']))
WITH CHECK (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "suppliers delete by edit" ON public.suppliers;
CREATE POLICY "suppliers delete by edit"
ON public.suppliers
FOR DELETE
TO authenticated
USING (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "purchases_suppliers insert by edit" ON public.purchases_suppliers;
CREATE POLICY "purchases_suppliers insert by edit"
ON public.purchases_suppliers
FOR INSERT
TO authenticated
WITH CHECK (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "purchases_suppliers update by edit" ON public.purchases_suppliers;
CREATE POLICY "purchases_suppliers update by edit"
ON public.purchases_suppliers
FOR UPDATE
TO authenticated
USING (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']))
WITH CHECK (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "purchases_suppliers delete by edit" ON public.purchases_suppliers;
CREATE POLICY "purchases_suppliers delete by edit"
ON public.purchases_suppliers
FOR DELETE
TO authenticated
USING (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "payments_suppliers insert by edit" ON public.payments_suppliers;
CREATE POLICY "payments_suppliers insert by edit"
ON public.payments_suppliers
FOR INSERT
TO authenticated
WITH CHECK (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "payments_suppliers update by edit" ON public.payments_suppliers;
CREATE POLICY "payments_suppliers update by edit"
ON public.payments_suppliers
FOR UPDATE
TO authenticated
USING (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']))
WITH CHECK (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "payments_suppliers delete by edit" ON public.payments_suppliers;
CREATE POLICY "payments_suppliers delete by edit"
ON public.payments_suppliers
FOR DELETE
TO authenticated
USING (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "files_purchases_suppliers insert by edit" ON public.files_purchases_suppliers;
CREATE POLICY "files_purchases_suppliers insert by edit"
ON public.files_purchases_suppliers
FOR INSERT
TO authenticated
WITH CHECK (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "files_purchases_suppliers update by edit" ON public.files_purchases_suppliers;
CREATE POLICY "files_purchases_suppliers update by edit"
ON public.files_purchases_suppliers
FOR UPDATE
TO authenticated
USING (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']))
WITH CHECK (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "files_purchases_suppliers delete by edit" ON public.files_purchases_suppliers;
CREATE POLICY "files_purchases_suppliers delete by edit"
ON public.files_purchases_suppliers
FOR DELETE
TO authenticated
USING (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "files_payments_suppliers insert by edit" ON public.files_payments_suppliers;
CREATE POLICY "files_payments_suppliers insert by edit"
ON public.files_payments_suppliers
FOR INSERT
TO authenticated
WITH CHECK (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "files_payments_suppliers update by edit" ON public.files_payments_suppliers;
CREATE POLICY "files_payments_suppliers update by edit"
ON public.files_payments_suppliers
FOR UPDATE
TO authenticated
USING (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']))
WITH CHECK (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "files_payments_suppliers delete by edit" ON public.files_payments_suppliers;
CREATE POLICY "files_payments_suppliers delete by edit"
ON public.files_payments_suppliers
FOR DELETE
TO authenticated
USING (public.can_edit_any(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "employees insert by edit" ON public.employees;
CREATE POLICY "employees insert by edit"
ON public.employees
FOR INSERT
TO authenticated
WITH CHECK (public.can_edit_any(array['employees.fichas']));

DROP POLICY IF EXISTS "employees update by edit" ON public.employees;
CREATE POLICY "employees update by edit"
ON public.employees
FOR UPDATE
TO authenticated
USING (public.can_edit_any(array['employees.fichas']))
WITH CHECK (public.can_edit_any(array['employees.fichas']));

DROP POLICY IF EXISTS "employees delete by edit" ON public.employees;
CREATE POLICY "employees delete by edit"
ON public.employees
FOR DELETE
TO authenticated
USING (public.can_edit_any(array['employees.fichas']));

DROP POLICY IF EXISTS "employee_documents insert by edit" ON public.employee_documents;
CREATE POLICY "employee_documents insert by edit"
ON public.employee_documents
FOR INSERT
TO authenticated
WITH CHECK (public.can_edit_any(array['employees.fichas']));

DROP POLICY IF EXISTS "employee_documents update by edit" ON public.employee_documents;
CREATE POLICY "employee_documents update by edit"
ON public.employee_documents
FOR UPDATE
TO authenticated
USING (public.can_edit_any(array['employees.fichas']))
WITH CHECK (public.can_edit_any(array['employees.fichas']));

DROP POLICY IF EXISTS "employee_documents delete by edit" ON public.employee_documents;
CREATE POLICY "employee_documents delete by edit"
ON public.employee_documents
FOR DELETE
TO authenticated
USING (public.can_edit_any(array['employees.fichas']));

DROP POLICY IF EXISTS "employee_evaluations insert by edit" ON public.employee_evaluations;
CREATE POLICY "employee_evaluations insert by edit"
ON public.employee_evaluations
FOR INSERT
TO authenticated
WITH CHECK (public.can_edit_any(array['employees.evaluaciones']));

DROP POLICY IF EXISTS "employee_evaluations update by edit" ON public.employee_evaluations;
CREATE POLICY "employee_evaluations update by edit"
ON public.employee_evaluations
FOR UPDATE
TO authenticated
USING (public.can_edit_any(array['employees.evaluaciones']))
WITH CHECK (public.can_edit_any(array['employees.evaluaciones']));

DROP POLICY IF EXISTS "employee_evaluations delete by edit" ON public.employee_evaluations;
CREATE POLICY "employee_evaluations delete by edit"
ON public.employee_evaluations
FOR DELETE
TO authenticated
USING (public.can_edit_any(array['employees.evaluaciones']));

DROP POLICY IF EXISTS "appointments insert by edit" ON public.appointments;
CREATE POLICY "appointments insert by edit"
ON public.appointments
FOR INSERT
TO authenticated
WITH CHECK (public.can_edit_any(array['calendar.appointments']));

DROP POLICY IF EXISTS "appointments update by edit" ON public.appointments;
CREATE POLICY "appointments update by edit"
ON public.appointments
FOR UPDATE
TO authenticated
USING (public.can_edit_any(array['calendar.appointments']))
WITH CHECK (public.can_edit_any(array['calendar.appointments']));

DROP POLICY IF EXISTS "appointments delete by edit" ON public.appointments;
CREATE POLICY "appointments delete by edit"
ON public.appointments
FOR DELETE
TO authenticated
USING (public.can_edit_any(array['calendar.appointments']));

DROP POLICY IF EXISTS "appointment_settings insert by edit" ON public.appointment_settings;
CREATE POLICY "appointment_settings insert by edit"
ON public.appointment_settings
FOR INSERT
TO authenticated
WITH CHECK (public.can_edit_any(array['calendar.appointments']));

DROP POLICY IF EXISTS "appointment_settings update by edit" ON public.appointment_settings;
CREATE POLICY "appointment_settings update by edit"
ON public.appointment_settings
FOR UPDATE
TO authenticated
USING (public.can_edit_any(array['calendar.appointments']))
WITH CHECK (public.can_edit_any(array['calendar.appointments']));

DROP POLICY IF EXISTS "appointment_settings delete by edit" ON public.appointment_settings;
CREATE POLICY "appointment_settings delete by edit"
ON public.appointment_settings
FOR DELETE
TO authenticated
USING (public.can_edit_any(array['calendar.appointments']));

DROP POLICY IF EXISTS "appointment_blocked_dates insert by edit" ON public.appointment_blocked_dates;
CREATE POLICY "appointment_blocked_dates insert by edit"
ON public.appointment_blocked_dates
FOR INSERT
TO authenticated
WITH CHECK (public.can_edit_any(array['calendar.appointments']));

DROP POLICY IF EXISTS "appointment_blocked_dates update by edit" ON public.appointment_blocked_dates;
CREATE POLICY "appointment_blocked_dates update by edit"
ON public.appointment_blocked_dates
FOR UPDATE
TO authenticated
USING (public.can_edit_any(array['calendar.appointments']))
WITH CHECK (public.can_edit_any(array['calendar.appointments']));

DROP POLICY IF EXISTS "appointment_blocked_dates delete by edit" ON public.appointment_blocked_dates;
CREATE POLICY "appointment_blocked_dates delete by edit"
ON public.appointment_blocked_dates
FOR DELETE
TO authenticated
USING (public.can_edit_any(array['calendar.appointments']));

------ RESTRICTIONS FOR CUSTOMIZED USERS ------
-- Restrictive policies are AND-ed with everything else, so they can only take access away.
-- They only apply to customized users (admins included): hiding a view or an edit is now real
-- in the database, not just in the screen. Users without customization are not affected.

DROP POLICY IF EXISTS "budgets restrict read by view" ON public.budgets;
CREATE POLICY "budgets restrict read by view"
ON public.budgets
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.view_allowed(array['clients.budgets', 'reports', 'cash-flow']));

DROP POLICY IF EXISTS "budgets restrict insert by edit" ON public.budgets;
CREATE POLICY "budgets restrict insert by edit"
ON public.budgets
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.edit_allowed(array['clients.budgets']));

DROP POLICY IF EXISTS "budgets restrict update by edit" ON public.budgets;
CREATE POLICY "budgets restrict update by edit"
ON public.budgets
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (public.edit_allowed(array['clients.budgets']))
WITH CHECK (public.edit_allowed(array['clients.budgets']));

DROP POLICY IF EXISTS "budgets restrict delete by edit" ON public.budgets;
CREATE POLICY "budgets restrict delete by edit"
ON public.budgets
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.edit_allowed(array['clients.budgets']));

DROP POLICY IF EXISTS "folder_budgets restrict read by view" ON public.folder_budgets;
CREATE POLICY "folder_budgets restrict read by view"
ON public.folder_budgets
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.view_allowed(array['clients.budgets', 'reports', 'cash-flow']));

DROP POLICY IF EXISTS "folder_budgets restrict insert by edit" ON public.folder_budgets;
CREATE POLICY "folder_budgets restrict insert by edit"
ON public.folder_budgets
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.edit_allowed(array['clients.budgets']));

DROP POLICY IF EXISTS "folder_budgets restrict update by edit" ON public.folder_budgets;
CREATE POLICY "folder_budgets restrict update by edit"
ON public.folder_budgets
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (public.edit_allowed(array['clients.budgets']))
WITH CHECK (public.edit_allowed(array['clients.budgets']));

DROP POLICY IF EXISTS "folder_budgets restrict delete by edit" ON public.folder_budgets;
CREATE POLICY "folder_budgets restrict delete by edit"
ON public.folder_budgets
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.edit_allowed(array['clients.budgets']));

DROP POLICY IF EXISTS "budget_signatures restrict read by view" ON public.budget_signatures;
CREATE POLICY "budget_signatures restrict read by view"
ON public.budget_signatures
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.view_allowed(array['clients.budgets']));

DROP POLICY IF EXISTS "budget_signatures restrict insert by edit" ON public.budget_signatures;
CREATE POLICY "budget_signatures restrict insert by edit"
ON public.budget_signatures
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.edit_allowed(array['clients.budgets']));

DROP POLICY IF EXISTS "budget_signatures restrict update by edit" ON public.budget_signatures;
CREATE POLICY "budget_signatures restrict update by edit"
ON public.budget_signatures
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (public.edit_allowed(array['clients.budgets']))
WITH CHECK (public.edit_allowed(array['clients.budgets']));

DROP POLICY IF EXISTS "budget_signatures restrict delete by edit" ON public.budget_signatures;
CREATE POLICY "budget_signatures restrict delete by edit"
ON public.budget_signatures
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.edit_allowed(array['clients.budgets']));

DROP POLICY IF EXISTS "balances restrict read by view" ON public.balances;
CREATE POLICY "balances restrict read by view"
ON public.balances
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.view_allowed(array['clients.balances', 'reports', 'cash-flow']));

DROP POLICY IF EXISTS "balances restrict insert by edit" ON public.balances;
CREATE POLICY "balances restrict insert by edit"
ON public.balances
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.edit_allowed(array['clients.balances', 'cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "balances restrict update by edit" ON public.balances;
CREATE POLICY "balances restrict update by edit"
ON public.balances
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (public.edit_allowed(array['clients.balances', 'cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']))
WITH CHECK (public.edit_allowed(array['clients.balances', 'cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "balances restrict delete by edit" ON public.balances;
CREATE POLICY "balances restrict delete by edit"
ON public.balances
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.edit_allowed(array['clients.balances', 'cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "balance_transactions restrict read by view" ON public.balance_transactions;
CREATE POLICY "balance_transactions restrict read by view"
ON public.balance_transactions
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.view_allowed(array['clients.balances', 'cash-flow']));

DROP POLICY IF EXISTS "balance_transactions restrict insert by edit" ON public.balance_transactions;
CREATE POLICY "balance_transactions restrict insert by edit"
ON public.balance_transactions
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.edit_allowed(array['clients.balances', 'cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "balance_transactions restrict update by edit" ON public.balance_transactions;
CREATE POLICY "balance_transactions restrict update by edit"
ON public.balance_transactions
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (public.edit_allowed(array['clients.balances', 'cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']))
WITH CHECK (public.edit_allowed(array['clients.balances', 'cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "balance_transactions restrict delete by edit" ON public.balance_transactions;
CREATE POLICY "balance_transactions restrict delete by edit"
ON public.balance_transactions
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.edit_allowed(array['clients.balances', 'cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "bank_accounts restrict read by view" ON public.bank_accounts;
CREATE POLICY "bank_accounts restrict read by view"
ON public.bank_accounts
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.view_allowed(array['cash-flow', 'clients.balances']));

DROP POLICY IF EXISTS "bank_accounts restrict insert by edit" ON public.bank_accounts;
CREATE POLICY "bank_accounts restrict insert by edit"
ON public.bank_accounts
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement', 'clients.balances']));

DROP POLICY IF EXISTS "bank_accounts restrict update by edit" ON public.bank_accounts;
CREATE POLICY "bank_accounts restrict update by edit"
ON public.bank_accounts
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement', 'clients.balances']))
WITH CHECK (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement', 'clients.balances']));

DROP POLICY IF EXISTS "bank_accounts restrict delete by edit" ON public.bank_accounts;
CREATE POLICY "bank_accounts restrict delete by edit"
ON public.bank_accounts
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement', 'clients.balances']));

DROP POLICY IF EXISTS "cash_boxes restrict read by view" ON public.cash_boxes;
CREATE POLICY "cash_boxes restrict read by view"
ON public.cash_boxes
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.view_allowed(array['cash-flow', 'clients.balances']));

DROP POLICY IF EXISTS "cash_boxes restrict insert by edit" ON public.cash_boxes;
CREATE POLICY "cash_boxes restrict insert by edit"
ON public.cash_boxes
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement', 'clients.balances']));

DROP POLICY IF EXISTS "cash_boxes restrict update by edit" ON public.cash_boxes;
CREATE POLICY "cash_boxes restrict update by edit"
ON public.cash_boxes
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement', 'clients.balances']))
WITH CHECK (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement', 'clients.balances']));

DROP POLICY IF EXISTS "cash_boxes restrict delete by edit" ON public.cash_boxes;
CREATE POLICY "cash_boxes restrict delete by edit"
ON public.cash_boxes
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement', 'clients.balances']));

DROP POLICY IF EXISTS "transactions_box restrict read by view" ON public.transactions_box;
CREATE POLICY "transactions_box restrict read by view"
ON public.transactions_box
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.view_allowed(array['cash-flow', 'clients.balances']));

DROP POLICY IF EXISTS "transactions_box restrict insert by edit" ON public.transactions_box;
CREATE POLICY "transactions_box restrict insert by edit"
ON public.transactions_box
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement', 'clients.balances']));

DROP POLICY IF EXISTS "transactions_box restrict update by edit" ON public.transactions_box;
CREATE POLICY "transactions_box restrict update by edit"
ON public.transactions_box
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement', 'clients.balances']))
WITH CHECK (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement', 'clients.balances']));

DROP POLICY IF EXISTS "transactions_box restrict delete by edit" ON public.transactions_box;
CREATE POLICY "transactions_box restrict delete by edit"
ON public.transactions_box
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement', 'clients.balances']));

DROP POLICY IF EXISTS "payment_methods restrict read by view" ON public.payment_methods;
CREATE POLICY "payment_methods restrict read by view"
ON public.payment_methods
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.view_allowed(array['cash-flow', 'clients.balances']));

DROP POLICY IF EXISTS "payment_methods restrict insert by edit" ON public.payment_methods;
CREATE POLICY "payment_methods restrict insert by edit"
ON public.payment_methods
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "payment_methods restrict update by edit" ON public.payment_methods;
CREATE POLICY "payment_methods restrict update by edit"
ON public.payment_methods
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']))
WITH CHECK (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "payment_methods restrict delete by edit" ON public.payment_methods;
CREATE POLICY "payment_methods restrict delete by edit"
ON public.payment_methods
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "incomes restrict read by view" ON public.incomes;
CREATE POLICY "incomes restrict read by view"
ON public.incomes
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.view_allowed(array['cash-flow']));

DROP POLICY IF EXISTS "incomes restrict insert by edit" ON public.incomes;
CREATE POLICY "incomes restrict insert by edit"
ON public.incomes
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "incomes restrict update by edit" ON public.incomes;
CREATE POLICY "incomes restrict update by edit"
ON public.incomes
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']))
WITH CHECK (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "incomes restrict delete by edit" ON public.incomes;
CREATE POLICY "incomes restrict delete by edit"
ON public.incomes
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "expenses restrict read by view" ON public.expenses;
CREATE POLICY "expenses restrict read by view"
ON public.expenses
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.view_allowed(array['cash-flow']));

DROP POLICY IF EXISTS "expenses restrict insert by edit" ON public.expenses;
CREATE POLICY "expenses restrict insert by edit"
ON public.expenses
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "expenses restrict update by edit" ON public.expenses;
CREATE POLICY "expenses restrict update by edit"
ON public.expenses
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']))
WITH CHECK (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "expenses restrict delete by edit" ON public.expenses;
CREATE POLICY "expenses restrict delete by edit"
ON public.expenses
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "collections restrict read by view" ON public.collections;
CREATE POLICY "collections restrict read by view"
ON public.collections
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.view_allowed(array['cash-flow']));

DROP POLICY IF EXISTS "collections restrict insert by edit" ON public.collections;
CREATE POLICY "collections restrict insert by edit"
ON public.collections
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "collections restrict update by edit" ON public.collections;
CREATE POLICY "collections restrict update by edit"
ON public.collections
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']))
WITH CHECK (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "collections restrict delete by edit" ON public.collections;
CREATE POLICY "collections restrict delete by edit"
ON public.collections
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "payments restrict read by view" ON public.payments;
CREATE POLICY "payments restrict read by view"
ON public.payments
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.view_allowed(array['cash-flow']));

DROP POLICY IF EXISTS "payments restrict insert by edit" ON public.payments;
CREATE POLICY "payments restrict insert by edit"
ON public.payments
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "payments restrict update by edit" ON public.payments;
CREATE POLICY "payments restrict update by edit"
ON public.payments
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']))
WITH CHECK (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "payments restrict delete by edit" ON public.payments;
CREATE POLICY "payments restrict delete by edit"
ON public.payments
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "fixed_expenses restrict read by view" ON public.fixed_expenses;
CREATE POLICY "fixed_expenses restrict read by view"
ON public.fixed_expenses
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.view_allowed(array['cash-flow']));

DROP POLICY IF EXISTS "fixed_expenses restrict insert by edit" ON public.fixed_expenses;
CREATE POLICY "fixed_expenses restrict insert by edit"
ON public.fixed_expenses
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "fixed_expenses restrict update by edit" ON public.fixed_expenses;
CREATE POLICY "fixed_expenses restrict update by edit"
ON public.fixed_expenses
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']))
WITH CHECK (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "fixed_expenses restrict delete by edit" ON public.fixed_expenses;
CREATE POLICY "fixed_expenses restrict delete by edit"
ON public.fixed_expenses
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "fixed_expense_payments restrict read by view" ON public.fixed_expense_payments;
CREATE POLICY "fixed_expense_payments restrict read by view"
ON public.fixed_expense_payments
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.view_allowed(array['cash-flow']));

DROP POLICY IF EXISTS "fixed_expense_payments restrict insert by edit" ON public.fixed_expense_payments;
CREATE POLICY "fixed_expense_payments restrict insert by edit"
ON public.fixed_expense_payments
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "fixed_expense_payments restrict update by edit" ON public.fixed_expense_payments;
CREATE POLICY "fixed_expense_payments restrict update by edit"
ON public.fixed_expense_payments
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']))
WITH CHECK (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "fixed_expense_payments restrict delete by edit" ON public.fixed_expense_payments;
CREATE POLICY "fixed_expense_payments restrict delete by edit"
ON public.fixed_expense_payments
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "cash_flow_categories restrict read by view" ON public.cash_flow_categories;
CREATE POLICY "cash_flow_categories restrict read by view"
ON public.cash_flow_categories
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.view_allowed(array['cash-flow']));

DROP POLICY IF EXISTS "cash_flow_categories restrict insert by edit" ON public.cash_flow_categories;
CREATE POLICY "cash_flow_categories restrict insert by edit"
ON public.cash_flow_categories
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "cash_flow_categories restrict update by edit" ON public.cash_flow_categories;
CREATE POLICY "cash_flow_categories restrict update by edit"
ON public.cash_flow_categories
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']))
WITH CHECK (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "cash_flow_categories restrict delete by edit" ON public.cash_flow_categories;
CREATE POLICY "cash_flow_categories restrict delete by edit"
ON public.cash_flow_categories
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "voucher_types restrict read by view" ON public.voucher_types;
CREATE POLICY "voucher_types restrict read by view"
ON public.voucher_types
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.view_allowed(array['cash-flow']));

DROP POLICY IF EXISTS "voucher_types restrict insert by edit" ON public.voucher_types;
CREATE POLICY "voucher_types restrict insert by edit"
ON public.voucher_types
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "voucher_types restrict update by edit" ON public.voucher_types;
CREATE POLICY "voucher_types restrict update by edit"
ON public.voucher_types
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']))
WITH CHECK (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "voucher_types restrict delete by edit" ON public.voucher_types;
CREATE POLICY "voucher_types restrict delete by edit"
ON public.voucher_types
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "suppliers restrict read by view" ON public.suppliers;
CREATE POLICY "suppliers restrict read by view"
ON public.suppliers
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.view_allowed(array['cash-flow']));

DROP POLICY IF EXISTS "suppliers restrict insert by edit" ON public.suppliers;
CREATE POLICY "suppliers restrict insert by edit"
ON public.suppliers
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "suppliers restrict update by edit" ON public.suppliers;
CREATE POLICY "suppliers restrict update by edit"
ON public.suppliers
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']))
WITH CHECK (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "suppliers restrict delete by edit" ON public.suppliers;
CREATE POLICY "suppliers restrict delete by edit"
ON public.suppliers
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "purchases_suppliers restrict read by view" ON public.purchases_suppliers;
CREATE POLICY "purchases_suppliers restrict read by view"
ON public.purchases_suppliers
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.view_allowed(array['cash-flow']));

DROP POLICY IF EXISTS "purchases_suppliers restrict insert by edit" ON public.purchases_suppliers;
CREATE POLICY "purchases_suppliers restrict insert by edit"
ON public.purchases_suppliers
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "purchases_suppliers restrict update by edit" ON public.purchases_suppliers;
CREATE POLICY "purchases_suppliers restrict update by edit"
ON public.purchases_suppliers
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']))
WITH CHECK (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "purchases_suppliers restrict delete by edit" ON public.purchases_suppliers;
CREATE POLICY "purchases_suppliers restrict delete by edit"
ON public.purchases_suppliers
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "payments_suppliers restrict read by view" ON public.payments_suppliers;
CREATE POLICY "payments_suppliers restrict read by view"
ON public.payments_suppliers
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.view_allowed(array['cash-flow']));

DROP POLICY IF EXISTS "payments_suppliers restrict insert by edit" ON public.payments_suppliers;
CREATE POLICY "payments_suppliers restrict insert by edit"
ON public.payments_suppliers
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "payments_suppliers restrict update by edit" ON public.payments_suppliers;
CREATE POLICY "payments_suppliers restrict update by edit"
ON public.payments_suppliers
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']))
WITH CHECK (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "payments_suppliers restrict delete by edit" ON public.payments_suppliers;
CREATE POLICY "payments_suppliers restrict delete by edit"
ON public.payments_suppliers
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "files_purchases_suppliers restrict read by view" ON public.files_purchases_suppliers;
CREATE POLICY "files_purchases_suppliers restrict read by view"
ON public.files_purchases_suppliers
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.view_allowed(array['cash-flow']));

DROP POLICY IF EXISTS "files_purchases_suppliers restrict insert by edit" ON public.files_purchases_suppliers;
CREATE POLICY "files_purchases_suppliers restrict insert by edit"
ON public.files_purchases_suppliers
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "files_purchases_suppliers restrict update by edit" ON public.files_purchases_suppliers;
CREATE POLICY "files_purchases_suppliers restrict update by edit"
ON public.files_purchases_suppliers
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']))
WITH CHECK (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "files_purchases_suppliers restrict delete by edit" ON public.files_purchases_suppliers;
CREATE POLICY "files_purchases_suppliers restrict delete by edit"
ON public.files_purchases_suppliers
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "files_payments_suppliers restrict read by view" ON public.files_payments_suppliers;
CREATE POLICY "files_payments_suppliers restrict read by view"
ON public.files_payments_suppliers
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.view_allowed(array['cash-flow']));

DROP POLICY IF EXISTS "files_payments_suppliers restrict insert by edit" ON public.files_payments_suppliers;
CREATE POLICY "files_payments_suppliers restrict insert by edit"
ON public.files_payments_suppliers
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "files_payments_suppliers restrict update by edit" ON public.files_payments_suppliers;
CREATE POLICY "files_payments_suppliers restrict update by edit"
ON public.files_payments_suppliers
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']))
WITH CHECK (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "files_payments_suppliers restrict delete by edit" ON public.files_payments_suppliers;
CREATE POLICY "files_payments_suppliers restrict delete by edit"
ON public.files_payments_suppliers
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.edit_allowed(array['cash-flow.summary', 'cash-flow.incomes', 'cash-flow.expenses', 'cash-flow.collections', 'cash-flow.payments', 'cash-flow.fixed-expenses', 'cash-flow.checking-accounts', 'cash-flow.suppliers', 'cash-flow.bank-accounts', 'cash-flow.vat-settlement']));

DROP POLICY IF EXISTS "employee_documents restrict read by view" ON public.employee_documents;
CREATE POLICY "employee_documents restrict read by view"
ON public.employee_documents
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.view_allowed(array['employees.fichas']));

DROP POLICY IF EXISTS "employee_documents restrict insert by edit" ON public.employee_documents;
CREATE POLICY "employee_documents restrict insert by edit"
ON public.employee_documents
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.edit_allowed(array['employees.fichas']));

DROP POLICY IF EXISTS "employee_documents restrict update by edit" ON public.employee_documents;
CREATE POLICY "employee_documents restrict update by edit"
ON public.employee_documents
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (public.edit_allowed(array['employees.fichas']))
WITH CHECK (public.edit_allowed(array['employees.fichas']));

DROP POLICY IF EXISTS "employee_documents restrict delete by edit" ON public.employee_documents;
CREATE POLICY "employee_documents restrict delete by edit"
ON public.employee_documents
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.edit_allowed(array['employees.fichas']));

DROP POLICY IF EXISTS "employee_evaluations restrict read by view" ON public.employee_evaluations;
CREATE POLICY "employee_evaluations restrict read by view"
ON public.employee_evaluations
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.view_allowed(array['employees.evaluaciones']));

DROP POLICY IF EXISTS "employee_evaluations restrict insert by edit" ON public.employee_evaluations;
CREATE POLICY "employee_evaluations restrict insert by edit"
ON public.employee_evaluations
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.edit_allowed(array['employees.evaluaciones']));

DROP POLICY IF EXISTS "employee_evaluations restrict update by edit" ON public.employee_evaluations;
CREATE POLICY "employee_evaluations restrict update by edit"
ON public.employee_evaluations
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (public.edit_allowed(array['employees.evaluaciones']))
WITH CHECK (public.edit_allowed(array['employees.evaluaciones']));

DROP POLICY IF EXISTS "employee_evaluations restrict delete by edit" ON public.employee_evaluations;
CREATE POLICY "employee_evaluations restrict delete by edit"
ON public.employee_evaluations
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.edit_allowed(array['employees.evaluaciones']));

DROP POLICY IF EXISTS "appointments restrict read by view" ON public.appointments;
CREATE POLICY "appointments restrict read by view"
ON public.appointments
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.view_allowed(array['calendar.appointments']));

DROP POLICY IF EXISTS "appointments restrict insert by edit" ON public.appointments;
CREATE POLICY "appointments restrict insert by edit"
ON public.appointments
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.edit_allowed(array['calendar.appointments']));

DROP POLICY IF EXISTS "appointments restrict update by edit" ON public.appointments;
CREATE POLICY "appointments restrict update by edit"
ON public.appointments
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (public.edit_allowed(array['calendar.appointments']))
WITH CHECK (public.edit_allowed(array['calendar.appointments']));

DROP POLICY IF EXISTS "appointments restrict delete by edit" ON public.appointments;
CREATE POLICY "appointments restrict delete by edit"
ON public.appointments
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.edit_allowed(array['calendar.appointments']));

DROP POLICY IF EXISTS "appointment_settings restrict read by view" ON public.appointment_settings;
CREATE POLICY "appointment_settings restrict read by view"
ON public.appointment_settings
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.view_allowed(array['calendar.appointments']));

DROP POLICY IF EXISTS "appointment_settings restrict insert by edit" ON public.appointment_settings;
CREATE POLICY "appointment_settings restrict insert by edit"
ON public.appointment_settings
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.edit_allowed(array['calendar.appointments']));

DROP POLICY IF EXISTS "appointment_settings restrict update by edit" ON public.appointment_settings;
CREATE POLICY "appointment_settings restrict update by edit"
ON public.appointment_settings
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (public.edit_allowed(array['calendar.appointments']))
WITH CHECK (public.edit_allowed(array['calendar.appointments']));

DROP POLICY IF EXISTS "appointment_settings restrict delete by edit" ON public.appointment_settings;
CREATE POLICY "appointment_settings restrict delete by edit"
ON public.appointment_settings
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.edit_allowed(array['calendar.appointments']));

DROP POLICY IF EXISTS "appointment_blocked_dates restrict read by view" ON public.appointment_blocked_dates;
CREATE POLICY "appointment_blocked_dates restrict read by view"
ON public.appointment_blocked_dates
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.view_allowed(array['calendar.appointments']));

DROP POLICY IF EXISTS "appointment_blocked_dates restrict insert by edit" ON public.appointment_blocked_dates;
CREATE POLICY "appointment_blocked_dates restrict insert by edit"
ON public.appointment_blocked_dates
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.edit_allowed(array['calendar.appointments']));

DROP POLICY IF EXISTS "appointment_blocked_dates restrict update by edit" ON public.appointment_blocked_dates;
CREATE POLICY "appointment_blocked_dates restrict update by edit"
ON public.appointment_blocked_dates
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (public.edit_allowed(array['calendar.appointments']))
WITH CHECK (public.edit_allowed(array['calendar.appointments']));

DROP POLICY IF EXISTS "appointment_blocked_dates restrict delete by edit" ON public.appointment_blocked_dates;
CREATE POLICY "appointment_blocked_dates restrict delete by edit"
ON public.appointment_blocked_dates
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.edit_allowed(array['calendar.appointments']));
