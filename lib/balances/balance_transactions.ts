import { getSupabaseClient } from '../supabase-client';
import { BankAccount } from '@/lib/cash-flow/cash-flow';
import { getLocalDate } from '@/utils/format-date';
import { fetchAllPages } from '@/lib/suppliers/pagination';

export type BalanceTransaction = {
	id: number;
	created_at: string;
	balance_id?: number | null;
	date?: string | null;
	amount?: number | null;
	payment_method?: string | null;
	notes?: string | null;
	bank_account_id?: number | null;
	payment_method_id?: number | null;
	work_id?: number | null;
	receipt_number?: string | null;
	category_id?: number | null;
};

export type BalanceTransactionWithBankAccount = BalanceTransaction & {
	bank_account?: BankAccount | null;
	payment_method_name?: string | null;
	category_name?: string | null;
};

export type BalanceTransactionWithDetails = BalanceTransaction & {
	client_id: number | null;
	client_name: string | null;
	work_name: string | null;
	category_name: string | null;
	payment_method_name: string | null;
	bank_account_name: string | null;
};

const TABLE = 'balance_transactions';
const SELECT_WITH_DETAILS =
	'*, balances(client_id, clients(name, last_name)), works(name), cash_flow_categories(name), payment_methods(name), bank_accounts(name, bank)';

function mapRowWithDetails(row: any): BalanceTransactionWithDetails {
	const { balances, works, cash_flow_categories, payment_methods, bank_accounts, ...rest } = row;
	const client = balances?.clients;
	const clientName = client ? `${client.name || ''} ${client.last_name || ''}`.trim() : '';
	return {
		...rest,
		date: row.date ?? getLocalDate(row.created_at),
		amount: Number(row.amount) || 0,
		client_id: balances?.client_id ?? null,
		client_name: clientName || null,
		work_name: works?.name ?? null,
		category_name: cash_flow_categories?.name ?? null,
		payment_method_name: payment_methods?.name ?? null,
		bank_account_name: bank_accounts ? `${bank_accounts.bank} - ${bank_accounts.name}` : null,
	};
}

// Argentina-timezone year window so rows with a null `date` (filtered via created_at) are still included.
function argentinaYearBoundsUtc(year: number) {
	return {
		start: `${year}-01-01T03:00:00.000Z`,
		end: `${year + 1}-01-01T03:00:00.000Z`,
	};
}

export async function listBalanceTransactionsForYear(year: number): Promise<{
	data: BalanceTransactionWithDetails[] | null;
	error: any;
}> {
	const { start, end } = argentinaYearBoundsUtc(year);
	const { data, error } = await fetchAllPages<any>((from, to) => {
		const supabase = getSupabaseClient();
		return supabase
			.from(TABLE)
			.select(SELECT_WITH_DETAILS)
			.or(
				`and(date.gte.${year}-01-01,date.lt.${year + 1}-01-01),and(date.is.null,created_at.gte.${start},created_at.lt.${end})`
			)
			.order('date', { ascending: false })
			.order('created_at', { ascending: false })
			.order('id', { ascending: false })
			.range(from, to);
	});
	if (error) return { data: null, error };
	return { data: (data ?? []).map(mapRowWithDetails), error: null };
}

// No va a hacer falta seguramente
export async function listTransactions(): Promise<{
	data: BalanceTransactionWithBankAccount[] | null;
	error: any;
}> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.select('*, bank_account:bank_accounts(*)')
		.order('created_at', { ascending: false });

	return { data, error };
}

// No va a hacer falta seguramente
export async function getTransactionById(
	id: number
): Promise<{ data: BalanceTransaction | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single();
	return { data, error };
}

export async function getTransactionsByBalanceId(
	balanceId: number
): Promise<{ data: BalanceTransactionWithBankAccount[] | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.select('*, bank_account:bank_accounts(*), payment_methods(name), cash_flow_categories(name)')
		.eq('balance_id', balanceId)
		.order('date', { ascending: false });
	if (error) return { data: null, error };
	return {
		data: (data ?? []).map((row: any) => {
			const { payment_methods, cash_flow_categories, ...rest } = row;
			return {
				...rest,
				payment_method_name: payment_methods?.name ?? null,
				category_name: cash_flow_categories?.name ?? null,
			};
		}),
		error: null,
	};
}

export async function createTransaction(
	transaction: Omit<BalanceTransaction, 'id' | 'created_at'>
): Promise<{ data: BalanceTransaction | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).insert(transaction).select().single();
	return { data, error };
}

export async function updateTransaction(
	id: number,
	changes: Partial<Omit<BalanceTransaction, 'id' | 'created_at'>>
): Promise<{ data: BalanceTransaction | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).update(changes).eq('id', id).select().single();
	return { data, error };
}

export async function deleteTransaction(id: number): Promise<{ data: null; error: any }> {
	const supabase = getSupabaseClient();

	// Fetch associated files
	const { data: files, error: fetchError } = await supabase
		.from('files_client')
		.select('id, path')
		.eq('balance_transaction_id', id);

	if (fetchError) {
		return { data: null, error: fetchError };
	}

	if (files && files.length > 0) {
		// Delete from storage
		const paths = files.map((f: { path: string | null }) => f.path).filter(Boolean) as string[];
		if (paths.length > 0) {
			const { error: storageError } = await supabase.storage.from('clients').remove(paths);
			if (storageError) {
				return { data: null, error: storageError };
			}
		}

		// Delete files_client rows
		const fileIds = files.map((f: { id: number }) => f.id);
		const { error: filesDeleteError } = await supabase
			.from('files_client')
			.delete()
			.in('id', fileIds);
		if (filesDeleteError) {
			return { data: null, error: filesDeleteError };
		}
	}

	// Delete the transaction
	const { error } = await supabase.from(TABLE).delete().eq('id', id);
	return { data: null, error };
}

export async function getTotalByBalanceId(balanceId: number): Promise<{
	data: {
		totalAmount: number;
	} | null;
	error: any;
}> {
	const supabase = getSupabaseClient();
	const { data: transactions, error } = await supabase
		.from(TABLE)
		.select('amount')
		.eq('balance_id', balanceId);

	if (error) {
		return { data: null, error };
	}

	const totalAmount = (transactions || []).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

	return {
		data: { totalAmount },
		error: null,
	};
}

export async function getTotalsByBalanceIds(balanceIds: number[]): Promise<{
	data: Record<
		number,
		{
			totalAmount: number;
		}
	> | null;
	error: any;
}> {
	if (!balanceIds.length) return { data: {}, error: null };
	const supabase = getSupabaseClient();
	const { data: transactions, error } = await supabase
		.from(TABLE)
		.select('balance_id, amount')
		.in('balance_id', balanceIds);

	if (error) {
		return { data: null, error };
	}

	const totals: Record<
		number,
		{
			totalAmount: number;
		}
	> = {};
	for (const t of transactions || []) {
		const id = Number((t as any).balance_id || '');
		if (!id) continue;
		if (!totals[id])
			totals[id] = {
				totalAmount: 0,
			};
		totals[id].totalAmount += Number((t as any).amount) || 0;
	}

	return { data: totals, error: null };
}
