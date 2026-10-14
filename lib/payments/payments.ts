import { getSupabaseClient } from '../supabase-client';

export type Payment = {
	id: number;
	created_at: string;
	date: string;
	receipt_number: string | null;
	work_id: number | null;
	supplier_id: number;
	category_id: number | null;
	kind: 'payment';
	description: string | null;
	amount: number;
	payment_method_id: number;
	bank_account_id: number | null;
};

export type PaymentWithDetails = Payment & {
	work_name: string | null;
	supplier_name: string;
	category_name: string | null;
	payment_method_name: string;
	bank_account_name: string | null;
};

export type PaymentInput = {
	date: string;
	receipt_number: string | null;
	work_id: number | null;
	supplier_id: number;
	category_id: number | null;
	description: string | null;
	amount: number;
	payment_method_id: number;
	bank_account_id: number | null;
};

const TABLE = 'payments';
const SELECT =
	'*, works(name), suppliers(name), cash_flow_categories(name), payment_methods(name), bank_accounts(name, bank)';

function mapRow(row: any): PaymentWithDetails {
	const { works, suppliers, cash_flow_categories, payment_methods, bank_accounts, ...rest } = row;
	return {
		...rest,
		work_name: works?.name ?? null,
		supplier_name: suppliers?.name ?? '',
		category_name: cash_flow_categories?.name ?? null,
		payment_method_name: payment_methods?.name ?? '',
		bank_account_name: bank_accounts ? `${bank_accounts.bank} - ${bank_accounts.name}` : null,
	};
}

// Scoped by year on the server (mirrors listIncomes/listExpenses); remaining filters stay in-memory.
export async function listPayments(params: {
	year: number;
}): Promise<{ data: PaymentWithDetails[] | null; error: any }> {
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

function normalizeInput(input: PaymentInput) {
	return {
		...input,
		receipt_number: input.receipt_number?.trim() || null,
		description: input.description?.trim() || null,
	};
}

export async function createPayment(
	input: PaymentInput
): Promise<{ data: Payment | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.insert(normalizeInput(input))
		.select()
		.single();
	return { data, error };
}

export async function updatePayment(
	id: number,
	updates: PaymentInput
): Promise<{ data: Payment | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.update(normalizeInput(updates))
		.eq('id', id)
		.select()
		.single();
	return { data, error };
}

export async function deletePayment(id: number): Promise<{ error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).delete().eq('id', id).select('id');
	if (error) return { error };
	if (!data || data.length === 0) {
		return { error: { message: 'No se pudo eliminar el pago (no existe o no tenés permisos)' } };
	}
	return { error: null };
}
