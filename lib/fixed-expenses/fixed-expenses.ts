import { getSupabaseClient } from '../supabase-client';
import { getLocalDate } from '@/utils/format-date';

export type FixedExpense = {
	id: number;
	created_at: string;
	category_id: number;
	kind: 'expense';
	net_amount: number;
	iva_percent: number;
	iva_amount: number;
	amount: number;
	description: string;
	is_active: boolean;
	last_expense_period: string | null;
};

export type FixedExpenseWithCategory = FixedExpense & { category_name: string };

// amount (total) is computed by the DB trigger from net_amount/iva_percent
export type FixedExpenseInput = {
	category_id: number;
	net_amount: number;
	iva_percent: number;
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

// Stamps the first day of the current Argentina month as the last period an Expense (Gasto) was created from this fixed expense.
export async function markFixedExpenseExpenseCreated(
	id: number
): Promise<{ data: FixedExpense | null; error: any }> {
	const supabase = getSupabaseClient();
	const period = `${getLocalDate().slice(0, 7)}-01`;
	const { data, error } = await supabase
		.from(TABLE)
		.update({ last_expense_period: period })
		.eq('id', id)
		.select()
		.single();
	return { data, error };
}

// True when a Gasto was already created from this fixed expense during the current Argentina month.
export function hasExpenseThisMonth(expense: Pick<FixedExpense, 'last_expense_period'>): boolean {
	if (!expense.last_expense_period) return false;
	return expense.last_expense_period.slice(0, 7) === getLocalDate().slice(0, 7);
}
