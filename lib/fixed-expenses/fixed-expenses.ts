import { getSupabaseClient } from '../supabase-client';

export type FixedExpense = {
	id: number;
	created_at: string;
	category_id: number;
	kind: 'fixed_expense';
	amount: number;
	description: string;
	is_active: boolean;
	is_paid: boolean;
};

export type FixedExpenseWithCategory = FixedExpense & { category_name: string };

export type FixedExpenseInput = {
	category_id: number;
	amount: number;
	description: string;
};

const TABLE = 'fixed_expenses';

function mapRow(row: any): FixedExpenseWithCategory {
	const { cash_flow_categories, ...rest } = row;
	return { ...rest, category_name: cash_flow_categories?.name ?? '' };
}

export async function listFixedExpenses(): Promise<{
	data: FixedExpenseWithCategory[] | null;
	error: any;
}> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.select('*, cash_flow_categories(name)')
		.order('description', { ascending: true });
	if (error) return { data: null, error };
	return { data: data ? data.map(mapRow) : null, error: null };
}

export async function createFixedExpense(
	input: FixedExpenseInput
): Promise<{ data: FixedExpense | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.insert({ ...input, description: input.description.trim() })
		.select()
		.single();
	return { data, error };
}

export async function updateFixedExpense(
	id: number,
	updates: Partial<FixedExpenseInput>
): Promise<{ data: FixedExpense | null; error: any }> {
	const supabase = getSupabaseClient();
	const payload = { ...updates };
	if (payload.description !== undefined) payload.description = payload.description.trim();
	const { data, error } = await supabase.from(TABLE).update(payload).eq('id', id).select().single();
	return { data, error };
}

export async function deactivateFixedExpense(
	id: number
): Promise<{ data: FixedExpense | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.update({ is_active: false })
		.eq('id', id)
		.select()
		.single();
	return { data, error };
}

export async function reactivateFixedExpense(
	id: number
): Promise<{ data: FixedExpense | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.update({ is_active: true })
		.eq('id', id)
		.select()
		.single();
	return { data, error };
}
