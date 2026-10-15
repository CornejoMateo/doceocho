import { getSupabaseClient } from '../supabase-client';

export type CategoryKind = 'income' | 'expense' | 'fixed_expense' | 'payment' | 'collection';

export type CashFlowCategory = {
	id: number;
	created_at: string;
	name: string;
	kind: CategoryKind;
	is_active: boolean;
};

export type CashFlowCategoryInput = {
	name: string;
	kind: CategoryKind;
};

const TABLE = 'cash_flow_categories';

export async function listCategories(
	kind: CategoryKind
): Promise<{ data: CashFlowCategory[] | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.select('*')
		.eq('kind', kind)
		.order('name', { ascending: true });
	return { data, error };
}

export async function createCategory(
	category: CashFlowCategoryInput
): Promise<{ data: CashFlowCategory | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.insert({ ...category, name: category.name.trim() })
		.select()
		.single();
	return { data, error };
}

export async function updateCategory(
	id: number,
	updates: { name: string }
): Promise<{ data: CashFlowCategory | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.update({ ...updates, name: updates.name.trim() })
		.eq('id', id)
		.select()
		.single();
	return { data, error };
}

export async function deactivateCategory(
	id: number
): Promise<{ data: CashFlowCategory | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.update({ is_active: false })
		.eq('id', id)
		.select()
		.single();
	return { data, error };
}

export async function reactivateCategory(
	id: number
): Promise<{ data: CashFlowCategory | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.update({ is_active: true })
		.eq('id', id)
		.select()
		.single();
	return { data, error };
}
