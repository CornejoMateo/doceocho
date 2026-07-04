import { getSupabaseClient } from '../supabase-client';

export type BalanceTransaction = {
	id: number;
	created_at: string;
	balance_id?: number | null;
	date?: string | null;
	amount?: number | null;
	quote_usd?: number | null;
	usd_amount?: number | null;
	payment_method?: string | null;
	notes?: string | null;
};

const TABLE = 'balance_transactions';

// No va a hacer falta seguramente
export async function listTransactions(): Promise<{
	data: BalanceTransaction[] | null;
	error: any;
}> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.select('*')
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
): Promise<{ data: BalanceTransaction[] | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.select('*')
		.eq('balance_id', balanceId)
		.order('date', { ascending: false });
	return { data, error };
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

	// Fetch and delete associated files first
	const { data: files } = await supabase
		.from('files_client')
		.select('id, path')
		.eq('balance_transaction_id', id);

	if (files && files.length > 0) {
		const paths = files.map((f: { path: string | null }) => f.path).filter(Boolean) as string[];
		if (paths.length > 0) {
			await supabase.storage.from('clients').remove(paths);
		}
		const fileIds = files.map((f: { id: number }) => f.id);
		await supabase.from('files_client').delete().in('id', fileIds);
	}

	const { error } = await supabase.from(TABLE).delete().eq('id', id);
	return { data: null, error };
}

export async function getTotalByBalanceId(balanceId: number): Promise<{
	data: { totalAmount: number; totalAmountUSD: number } | null;
	error: any;
}> {
	const supabase = getSupabaseClient();
	const { data: transactions, error } = await supabase
		.from(TABLE)
		.select('amount, usd_amount')
		.eq('balance_id', balanceId);

	if (error) {
		return { data: null, error };
	}

	const totalAmount = transactions?.reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0;
	const totalAmountUSD =
		transactions?.reduce((sum, t) => sum + (Number(t.usd_amount) || 0), 0) || 0;

	return { data: { totalAmount, totalAmountUSD }, error: null };
}

export async function getTotalsByBalanceIds(balanceIds: number[]): Promise<{
	data: Record<number, { totalAmount: number; totalAmountUSD: number }> | null;
	error: any;
}> {
	if (!balanceIds.length) return { data: {}, error: null };
	const supabase = getSupabaseClient();
	const { data: transactions, error } = await supabase
		.from(TABLE)
		.select('balance_id, amount, usd_amount')
		.in('balance_id', balanceIds);

	if (error) {
		return { data: null, error };
	}

	const totals: Record<number, { totalAmount: number; totalAmountUSD: number }> = {};
	for (const t of transactions || []) {
		const id = Number((t as any).balance_id || '');
		if (!id) continue;
		if (!totals[id]) totals[id] = { totalAmount: 0, totalAmountUSD: 0 };
		totals[id].totalAmount += Number((t as any).amount) || 0;
		totals[id].totalAmountUSD += Number((t as any).usd_amount) || 0;
	}

	return { data: totals, error: null };
}

export async function getLastTransactionUSD(
	id: string
): Promise<{ data: number | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.select('quote_usd')
		.eq('balance_id', id)
		.order('created_at', { ascending: false })
		.limit(1)
		.single();

	return { data: data?.quote_usd || null, error };
}
