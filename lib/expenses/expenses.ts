import { getSupabaseClient } from '../supabase-client';

export type Expense = {
	id: number;
	created_at: string;
	date: string;
	voucher_number: string | null;
	voucher_type_id: number;
	work_id: number | null;
	supplier_id: number;
	category_id: number;
	kind: 'expense';
	description: string | null;
	net_amount: number;
	iva_percent: number;
	iva_amount: number;
	total_amount: number;
};

export type ExpenseWithDetails = Expense & {
	voucher_type_name: string;
	work_name: string | null;
	supplier_name: string;
	category_name: string;
};

export type ExpenseInput = {
	date: string;
	voucher_number: string | null;
	voucher_type_id: number;
	work_id: number | null;
	supplier_id: number;
	category_id: number;
	description: string | null;
	net_amount: number;
	iva_percent: number;
	iva_amount: number;
	total_amount: number;
};

const TABLE = 'expenses';
const SELECT = '*, voucher_types(name), works(name), suppliers(name), cash_flow_categories(name)';

function mapRow(row: any): ExpenseWithDetails {
	const { voucher_types, works, suppliers, cash_flow_categories, ...rest } = row;
	return {
		...rest,
		voucher_type_name: voucher_types?.name ?? '',
		work_name: works?.name ?? null,
		supplier_name: suppliers?.name ?? '',
		category_name: cash_flow_categories?.name ?? '',
	};
}

// Scoped by year on the server (mirrors listFixedExpensePayments); remaining filters stay in-memory.
export async function listExpenses(params: {
	year: number;
}): Promise<{ data: ExpenseWithDetails[] | null; error: any }> {
	const supabase = getSupabaseClient();
	const { year } = params;
	const { data, error } = await supabase
		.from(TABLE)
		.select(SELECT)
		.gte('date', `${year}-01-01`)
		.lt('date', `${year + 1}-01-01`)
		.order('date', { ascending: false })
		.order('id', { ascending: false });
	if (error) return { data: null, error };
	return { data: data ? data.map(mapRow) : null, error: null };
}

function normalizeInput(input: ExpenseInput) {
	return {
		...input,
		voucher_number: input.voucher_number?.trim() || null,
		description: input.description?.trim() || null,
	};
}

export async function createExpense(
	input: ExpenseInput
): Promise<{ data: Expense | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.insert(normalizeInput(input))
		.select()
		.single();
	return { data, error };
}

export async function updateExpense(
	id: number,
	updates: ExpenseInput
): Promise<{ data: Expense | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.update(normalizeInput(updates))
		.eq('id', id)
		.select()
		.single();
	return { data, error };
}

export async function deleteExpense(id: number): Promise<{ error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).delete().eq('id', id).select('id');
	if (error) return { error };
	if (!data || data.length === 0) {
		return { error: { message: 'No se pudo eliminar el gasto (no existe o no tenés permisos)' } };
	}
	return { error: null };
}
