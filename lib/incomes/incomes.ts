import { getSupabaseClient } from '../supabase-client';

export type Income = {
	id: number;
	created_at: string;
	date: string;
	voucher_number: string | null;
	voucher_type_id: number;
	work_id: number | null;
	client_id: number;
	category_id: number;
	kind: 'income';
	description: string | null;
	net_amount: number;
	iva_percent: number;
	iva_amount: number;
	total_amount: number;
};

export type IncomeWithDetails = Income & {
	voucher_type_name: string;
	work_name: string | null;
	client_name: string;
	category_name: string;
};

export type IncomeInput = {
	date: string;
	voucher_number: string | null;
	voucher_type_id: number;
	work_id: number | null;
	client_id: number;
	category_id: number;
	description: string | null;
	net_amount: number;
	iva_percent: number;
	iva_amount: number;
	total_amount: number;
};

const TABLE = 'incomes';
const SELECT =
	'*, voucher_types(name), works(name), clients(name, last_name), cash_flow_categories(name)';

function mapRow(row: any): IncomeWithDetails {
	const { voucher_types, works, clients, cash_flow_categories, ...rest } = row;
	const clientName = clients ? `${clients.name || ''} ${clients.last_name || ''}`.trim() : '';
	return {
		...rest,
		voucher_type_name: voucher_types?.name ?? '',
		work_name: works?.name ?? null,
		client_name: clientName,
		category_name: cash_flow_categories?.name ?? '',
	};
}

// Scoped by year on the server (mirrors listFixedExpensePayments); remaining filters stay in-memory.
export async function listIncomes(params: {
	year: number;
}): Promise<{ data: IncomeWithDetails[] | null; error: any }> {
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

function normalizeInput(input: IncomeInput) {
	return {
		...input,
		voucher_number: input.voucher_number?.trim() || null,
		description: input.description?.trim() || null,
	};
}

export async function createIncome(
	input: IncomeInput
): Promise<{ data: Income | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.insert(normalizeInput(input))
		.select()
		.single();
	return { data, error };
}

export async function updateIncome(
	id: number,
	updates: IncomeInput
): Promise<{ data: Income | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.update(normalizeInput(updates))
		.eq('id', id)
		.select()
		.single();
	return { data, error };
}

export async function deleteIncome(id: number): Promise<{ error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).delete().eq('id', id).select('id');
	if (error) return { error };
	if (!data || data.length === 0) {
		return { error: { message: 'No se pudo eliminar el ingreso (no existe o no tenés permisos)' } };
	}
	return { error: null };
}
