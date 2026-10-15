import { getSupabaseClient } from '../supabase-client';
import { fetchAllPages } from '@/lib/suppliers/pagination';

// General collections only (no client). Customer collections always live in balance_transactions.
export type Collection = {
	id: number;
	created_at: string;
	date: string;
	receipt_number: string | null;
	work_id: number | null;
	category_id: number | null;
	kind: 'collection';
	description: string | null;
	amount: number;
	payment_method_id: number;
	bank_account_id: number | null;
};

export type CollectionWithDetails = Collection & {
	work_name: string | null;
	category_name: string | null;
	payment_method_name: string;
	bank_account_name: string | null;
};

export type CollectionInput = {
	date: string;
	receipt_number: string | null;
	work_id: number | null;
	category_id: number | null;
	description: string | null;
	amount: number;
	payment_method_id: number;
	bank_account_id: number | null;
};

const TABLE = 'collections';
const SELECT =
	'*, works(name), cash_flow_categories(name), payment_methods(name), bank_accounts(name, bank)';

function mapRow(row: any): CollectionWithDetails {
	const { works, cash_flow_categories, payment_methods, bank_accounts, ...rest } = row;
	return {
		...rest,
		work_name: works?.name ?? null,
		category_name: cash_flow_categories?.name ?? null,
		payment_method_name: payment_methods?.name ?? '',
		bank_account_name: bank_accounts ? `${bank_accounts.bank} - ${bank_accounts.name}` : null,
	};
}

export async function listCollections(params: {
	year: number;
}): Promise<{ data: CollectionWithDetails[] | null; error: any }> {
	const { year } = params;
	const { data, error } = await fetchAllPages<any>((from, to) => {
		const supabase = getSupabaseClient();
		return supabase
			.from(TABLE)
			.select(SELECT)
			.gte('date', `${year}-01-01`)
			.lt('date', `${year + 1}-01-01`)
			.order('date', { ascending: false })
			.order('id', { ascending: false })
			.range(from, to);
	});
	if (error) return { data: null, error };
	return { data: data ? data.map(mapRow) : null, error: null };
}

function normalizeInput(input: CollectionInput) {
	return {
		...input,
		receipt_number: input.receipt_number?.trim() || null,
		description: input.description?.trim() || null,
	};
}

export async function createCollection(
	input: CollectionInput
): Promise<{ data: Collection | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.insert(normalizeInput(input))
		.select()
		.single();
	return { data, error };
}

export async function updateCollection(
	id: number,
	updates: CollectionInput
): Promise<{ data: Collection | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.update(normalizeInput(updates))
		.eq('id', id)
		.select()
		.single();
	return { data, error };
}

export async function deleteCollection(id: number): Promise<{ error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).delete().eq('id', id).select('id');
	if (error) return { error };
	if (!data || data.length === 0) {
		return { error: { message: 'No se pudo eliminar el cobro (no existe o no tenés permisos)' } };
	}
	return { error: null };
}
