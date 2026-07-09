import { getSupabaseClient } from '../supabase-client';

export type Balance = {
	id: number;
	created_at: string;
	start_date?: string;
	budget_id?: number | null;
	balance_amount_ars?: number | null;
	balance_amount_usd?: number | null;
	contract_date_usd?: number | null;
	usd_current?: number | null;
	client_id?: number | null;
	notes?: string | null;
};

export type BalanceWithBudget = Balance & {
	budget?: {
		id: number;
		created_at: string;
		amount_ars: number;
		amount_usd: number;
		number?: string | null;
		type?: string | null;
		folder_budget: {
			id: number;
			work: {
				address: string;
				locality: string;
			};
		};
	} | null;
};

export type BalanceWithBudgetAndClient = BalanceWithBudget & {
	client?: {
		id: number;
		name?: string | null;
		last_name?: string | null;
	} | null;
};

export type BudgetWithWork = {
	id: number;
	created_at: string;
	amount_ars: number;
	amount_usd: number;
	accepted?: boolean | null;
	sold?: boolean | null;
	lost?: boolean | null;
	pdf_url?: string | null;
	pdf_path?: string | null;
	number?: string | null;
	type?: string | null;
	date_of_sale?: string | null;
	usd_quote?: number | null;
	folder_budget: {
		id: number;
		work_id: number | null;
		work: {
			address: string | null;
			locality: string | null;
		} | null;
	};
};

const TABLE = 'balances';

export async function listBalances(): Promise<{ data: BalanceWithBudget[] | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.select(
			'*, budget:budgets(id, amount_ars, amount_usd, number, type, date_of_sale, usd_quote, folder_budget:folder_budgets(work:works(address, locality)))'
		)
		.order('created_at', { ascending: false });
	return { data, error };
}

export async function listBalancesForReport(): Promise<{
	data: BalanceWithBudgetAndClient[] | null;
	error: any;
}> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.select(
			`*,
			client:clients(id, name, last_name),
			budget:budgets(id, amount_ars, amount_usd, number, type, date_of_sale, usd_quote, folder_budget:folder_budgets(work:works(address, locality)))`
		)
		.order('created_at', { ascending: false });
	return { data, error };
}

export async function getBalanceById(
	id: number
): Promise<{ data: BalanceWithBudget | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.select(
			'*, budget:budgets(id, amount_ars, amount_usd, number, type, date_of_sale, usd_quote, folder_budget:folder_budgets(work:works(address, locality)))'
		)
		.eq('id', id)
		.single();
	return { data, error };
}

export async function getBalancesByClientId(
	clientId: number
): Promise<{ data: BalanceWithBudget[] | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.select(
			`
			*,
			budget:budgets (
				id,
				amount_ars,
				amount_usd,
				number,
				type,
				usd_quote,
				folder_budget:folder_budgets (
					work:works (
						address,
						locality
					)
				)
			)
		`
		)
		.eq('client_id', clientId)
		.order('created_at', { ascending: false });

	return { data, error };
}

export async function getBudgetsByClientId(
	clientId: number
): Promise<{ data: BudgetWithWork[] | null; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from('budgets')
		.select(
			`
				id,
				created_at,
				amount_ars,
				amount_usd,
				date_of_sale,
				usd_quote,
				folder_budget:folder_budgets!inner (
					id,
					work_id,
					work:works!inner (
					address,
					locality,
					client_id
					)
				)
			`
		)
		.eq('folder_budgets.works.client_id', clientId)
		.eq('accepted', true);

	if (error) return { data: null, error };
	if (!data) return { data: [], error: null };

	const result: BudgetWithWork[] = data
		.map((b) => {
			const folderBudget = Array.isArray(b.folder_budget) ? b.folder_budget[0] : b.folder_budget;
			if (!folderBudget) return null;

			const work = Array.isArray(folderBudget.work) ? folderBudget.work[0] : folderBudget.work;
			if (!work) return null;

			return {
				id: b.id,
				created_at: b.created_at,
				amount_ars: b.amount_ars,
				amount_usd: b.amount_usd,
				date_of_sale: b.date_of_sale,
				usd_quote: b.usd_quote,
				folder_budget: {
					id: folderBudget.id,
					work_id: folderBudget.work_id,
					work: {
						address: work.address,
						locality: work.locality,
					},
				},
			} as BudgetWithWork;
		})
		.filter((b): b is BudgetWithWork => b !== null);

	return { data: result, error: null };
}

export async function createBalance(
	balance: Omit<Balance, 'id' | 'created_at'>
): Promise<{ data: Balance | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).insert(balance).select().single();
	return { data, error };
}

export async function updateBalance(
	id: number,
	changes: Partial<Omit<Balance, 'id' | 'created_at'>>
): Promise<{ data: Balance | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).update(changes).eq('id', id).select().single();
	return { data, error };
}
export async function deleteBalance(id: number): Promise<{ data: null; error: any }> {
	const supabase = getSupabaseClient();

	const { data: transactions, error: txError } = await supabase
		.from('balance_transactions')
		.select('id')
		.eq('balance_id', id);

	if (txError) {
		return { data: null, error: txError };
	}

	if (transactions && transactions.length > 0) {
		const { data: files, error: filesError } = await supabase
			.from('files_client')
			.select('path')
			.in(
				'balance_transaction_id',
				transactions.map((t) => t.id)
			);

		if (filesError) {
			return { data: null, error: filesError };
		}

		const paths = files.map((f) => f.path).filter((p): p is string => !!p);

		if (paths.length > 0) {
			const { error: storageError } = await supabase.storage.from('clients').remove(paths);

			if (storageError) {
				return { data: null, error: storageError };
			}
		}
	}

	const { error } = await supabase.from('balances').delete().eq('id', id);

	return { data: null, error };
}
