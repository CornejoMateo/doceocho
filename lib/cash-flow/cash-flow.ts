import { getSupabaseClient } from '../supabase-client';

export type BankAccount = {
	id: number;
	created_at?: string;
	name: string;
	bank: string;
	account_number: string;
	account_type: string;
	is_active: boolean;
	initial_balance: number;
};

const BANK_ACCOUNTS_TABLE = 'bank_accounts';

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
