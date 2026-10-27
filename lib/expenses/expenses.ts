import { getSupabaseClient } from '../supabase-client';
import { fetchAllPages } from '@/lib/suppliers/pagination';

export type Expense = {
	id: number;
	created_at: string;
	date: string;
	voucher_number: string | null;
	voucher_type_id: number | null;
	work_id: number | null;
	supplier_id: number | null;
	category_id: number | null;
	kind: 'expense';
	description: string | null;
	net_amount: number;
	iva_percent: number;
	iva_amount: number;
	total_amount: number;
	payment_method_id: number | null;
	bank_account_id: number | null;
};

export type ExpenseWithDetails = Expense & {
	voucher_type_name: string;
	work_name: string | null;
	supplier_name: string;
	category_name: string;
	payment_method_name: string | null;
	bank_account_name: string | null;
};

export type ExpenseInput = {
	date: string;
	voucher_number: string | null;
	voucher_type_id: number | null;
	work_id: number | null;
	supplier_id: number | null;
	category_id: number | null;
	description: string | null;
	net_amount: number;
	iva_percent: number;
	iva_amount: number;
	total_amount: number;
	payment_method_id: number | null;
	bank_account_id: number | null;
};

const TABLE = 'expenses';
const SELECT =
	'*, voucher_types(name), works(name), suppliers(name), cash_flow_categories(name), payment_methods(name), bank_accounts(name, bank)';

function mapRow(row: any): ExpenseWithDetails {
	const {
		voucher_types,
		works,
		suppliers,
		cash_flow_categories,
		payment_methods,
		bank_accounts,
		...rest
	} = row;
	return {
		...rest,
		voucher_type_name: voucher_types?.name ?? '',
		work_name: works?.name ?? null,
		supplier_name: suppliers?.name ?? '',
		category_name: cash_flow_categories?.name ?? '',
		payment_method_name: payment_methods?.name ?? null,
		bank_account_name: bank_accounts ? `${bank_accounts.bank} - ${bank_accounts.name}` : null,
	};
}

export async function listExpenses(params: {
	year: number;
}): Promise<{ data: ExpenseWithDetails[] | null; error: any }> {
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
