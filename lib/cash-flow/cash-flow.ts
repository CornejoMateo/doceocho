import { getSupabaseClient } from '../supabase-client';

export type BankAccount = {
	id: number;
	created_at?: string;
	name: string;
	bank: string;
	account_number: string;
	account_type: string;
	is_active: boolean;
};

export type CashBox = {
	id: number;
	created_at?: string;
	opening_balance: number;
	closing_balance?: number | null;
	is_closed: boolean;
	closed_at?: string | null;
	notes?: string | null;
};

export type Transaction = {
	id: number;
	created_at?: string;
	cash_box_id: number;
	type: 'income' | 'expense';
	amount: number;
	category: string;
	description: string | null;
	bank_account_id: number | null;
};

export type TransactionWithBankAccount = Transaction & {
	bank_account?: BankAccount | null;
};

export type CashBoxWithTransactions = CashBox & {
	transactions?: TransactionWithBankAccount[];
};

export type CashBoxSummary = {
	id: number;
	opening_balance: number;
	total_income: number;
	total_expense: number;
	current_balance: number;
	closing_balance: number | null;
	is_closed: boolean;
	transaction_count: number;
};

const BANK_ACCOUNTS_TABLE = 'bank_accounts';
const CASH_BOXES_TABLE = 'cash_boxes';
const TRANSACTIONS_TABLE = 'transactions_box';

// Bank Accounts
export async function listBankAccounts(): Promise<{ data: BankAccount[] | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(BANK_ACCOUNTS_TABLE)
		.select('*')
		.order('created_at', { ascending: false });
	return { data, error };
}

export async function listActiveBankAccounts(): Promise<{
	data: BankAccount[] | null;
	error: any;
}> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(BANK_ACCOUNTS_TABLE)
		.select('*')
		.eq('is_active', true)
		.order('created_at', { ascending: false });
	return { data, error };
}

export async function getBankAccountById(
	id: number
): Promise<{ data: BankAccount | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(BANK_ACCOUNTS_TABLE)
		.select('*')
		.eq('id', id)
		.maybeSingle();
	return { data, error };
}

export async function createBankAccount(
	account: Omit<BankAccount, 'id' | 'created_at'>
): Promise<{ data: BankAccount | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(BANK_ACCOUNTS_TABLE)
		.insert(account)
		.select()
		.single();
	return { data, error };
}

export async function updateBankAccount(
	id: number,
	changes: Partial<Omit<BankAccount, 'id' | 'created_at'>>
): Promise<{ data: BankAccount | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(BANK_ACCOUNTS_TABLE)
		.update(changes)
		.eq('id', id)
		.select()
		.single();
	return { data, error };
}

export async function deleteBankAccount(id: number): Promise<{ data: null; error: any }> {
	const supabase = getSupabaseClient();
	const { error } = await supabase.from(BANK_ACCOUNTS_TABLE).delete().eq('id', id);
	return { data: null, error };
}

// Cash Boxes
export async function listCashBoxes(): Promise<{ data: CashBox[] | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(CASH_BOXES_TABLE)
		.select('*')
		.order('created_at', { ascending: false });
	return { data, error };
}

export async function getOpenCashBox(): Promise<{ data: CashBox | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(CASH_BOXES_TABLE)
		.select('*')
		.eq('is_closed', false)
		.order('created_at', { ascending: false })
		.limit(1)
		.single();
	return { data, error };
}

export async function getCashBoxById(id: number): Promise<{ data: CashBox | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(CASH_BOXES_TABLE).select('*').eq('id', id).single();
	return { data, error };
}

export async function getCashBoxWithTransactions(
	id: number
): Promise<{ data: CashBoxWithTransactions | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(CASH_BOXES_TABLE)
		.select('*, transactions:transactions_box(*, bank_account:bank_accounts(*))')
		.eq('id', id)
		.single();
	return { data, error };
}

export async function createCashBox(
	cashBox: Omit<CashBox, 'id' | 'created_at'>
): Promise<{ data: CashBox | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(CASH_BOXES_TABLE).insert(cashBox).select().single();
	return { data, error };
}

export async function updateCashBox(
	id: number,
	changes: Partial<Omit<CashBox, 'id' | 'created_at'>>
): Promise<{ data: CashBox | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(CASH_BOXES_TABLE)
		.update(changes)
		.eq('id', id)
		.select()
		.single();
	return { data, error };
}

export async function closeCashBox(
	id: number,
	closingBalance: number,
	notes?: string
): Promise<{ data: CashBox | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(CASH_BOXES_TABLE)
		.update({
			closing_balance: closingBalance,
			is_closed: true,
			closed_at: new Date().toISOString(),
			notes: notes || null,
		})
		.eq('id', id)
		.select()
		.single();
	return { data, error };
}

export async function deleteCashBox(id: number): Promise<{ data: null; error: any }> {
	const supabase = getSupabaseClient();
	const { error } = await supabase.from(CASH_BOXES_TABLE).delete().eq('id', id);
	return { data: null, error };
}

export async function getCashBoxSummary(
	id: number
): Promise<{ data: CashBoxSummary | null; error: any }> {
	const supabase = getSupabaseClient();

	// Get cash box details
	const { data: cashBox, error: boxError } = await supabase
		.from(CASH_BOXES_TABLE)
		.select('*')
		.eq('id', id)
		.single();

	if (boxError || !cashBox) return { data: null, error: boxError };

	// Get transactions
	const { data: transactions, error: transError } = await supabase
		.from(TRANSACTIONS_TABLE)
		.select('*')
		.eq('cash_box_id', id);

	if (transError) return { data: null, error: transError };

	const totalIncome =
		transactions
			?.filter((t) => t.type === 'income')
			.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
	const totalExpense =
		transactions
			?.filter((t) => t.type === 'expense')
			.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
	const currentBalance = Number(cashBox.opening_balance) + totalIncome - totalExpense;

	const summary: CashBoxSummary = {
		id: cashBox.id,
		opening_balance: Number(cashBox.opening_balance),
		total_income: totalIncome,
		total_expense: totalExpense,
		current_balance: currentBalance,
		closing_balance: cashBox.closing_balance ? Number(cashBox.closing_balance) : null,
		is_closed: cashBox.is_closed,
		transaction_count: transactions?.length || 0,
	};

	return { data: summary, error: null };
}

// Transactions
export async function listTransactions(
	cashBoxId?: number
): Promise<{ data: TransactionWithBankAccount[] | null; error: any }> {
	const supabase = getSupabaseClient();
	let query = supabase
		.from(TRANSACTIONS_TABLE)
		.select('*, bank_account:bank_accounts(*)')
		.order('created_at', { ascending: false });

	if (cashBoxId) {
		query = query.eq('cash_box_id', cashBoxId);
	}

	const { data, error } = await query;
	return { data, error };
}

export async function getTransactionById(
	id: number
): Promise<{ data: TransactionWithBankAccount | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TRANSACTIONS_TABLE)
		.select('*, bank_account:bank_accounts(*)')
		.eq('id', id)
		.single();
	return { data, error };
}

export async function createTransaction(
	transaction: Omit<Transaction, 'id' | 'created_at'>
): Promise<{ data: Transaction | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TRANSACTIONS_TABLE)
		.insert(transaction)
		.select()
		.single();
	return { data, error };
}

export async function updateTransaction(
	id: number,
	changes: Partial<Omit<Transaction, 'id' | 'created_at'>>
): Promise<{ data: Transaction | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TRANSACTIONS_TABLE)
		.update(changes)
		.eq('id', id)
		.select()
		.single();
	return { data, error };
}

export async function deleteTransaction(id: number): Promise<{ data: null; error: any }> {
	const supabase = getSupabaseClient();
	const { error } = await supabase.from(TRANSACTIONS_TABLE).delete().eq('id', id);
	return { data: null, error };
}

export async function getTransactionsByCashBoxId(
	cashBoxId: number
): Promise<{ data: TransactionWithBankAccount[] | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TRANSACTIONS_TABLE)
		.select('*, bank_account:bank_accounts(*)')
		.eq('cash_box_id', cashBoxId)
		.order('created_at', { ascending: true });
	return { data, error };
}
