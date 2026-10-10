import { getSupabaseClient } from '../supabase-client';

export type FixedExpensePaymentRow = {
	id: number;
	created_at: string;
	fixed_expense_id: number;
	paid_date: string;
	period: string;
	net_amount: number;
	iva_percent: number;
	iva_amount: number;
	total_amount: number;
	payment_method_id: number;
	bank_account_id: number | null;
};

export type MarkFixedExpensePaidInput = {
	fixed_expense_id: number;
	paid_date: string;
	period: string;
	net_amount: number;
	iva_percent: number;
	payment_method_id: number;
	bank_account_id: number | null;
};

function mapRow(row: any): FixedExpensePaymentRow {
	return {
		id: row.id,
		created_at: row.created_at,
		fixed_expense_id: row.fixed_expense_id,
		paid_date: row.paid_date,
		period: row.period,
		net_amount: row.net_amount,
		iva_percent: row.iva_percent,
		iva_amount: row.iva_amount,
		total_amount: row.total_amount,
		payment_method_id: row.payment_method_id,
		bank_account_id: row.bank_account_id,
	};
}

export async function markFixedExpensePaid(
	input: MarkFixedExpensePaidInput
): Promise<{ data: FixedExpensePaymentRow | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.rpc('mark_fixed_expense_paid', {
		p_fixed_expense_id: input.fixed_expense_id,
		p_paid_date: input.paid_date,
		p_period: input.period,
		p_net_amount: input.net_amount,
		p_iva_percent: input.iva_percent,
		p_payment_method_id: input.payment_method_id,
		p_bank_account_id: input.bank_account_id,
	});
	if (error) return { data: null, error };
	const row = Array.isArray(data) ? data[0] : data;
	return { data: row ? mapRow(row) : null, error: null };
}

export async function unmarkFixedExpensePaid(
	fixedExpenseId: number
): Promise<{ data: FixedExpensePaymentRow | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.rpc('unmark_fixed_expense_paid', {
		p_fixed_expense_id: fixedExpenseId,
	});
	if (error) return { data: null, error };
	const row = Array.isArray(data) ? data[0] : data;
	return { data: row ? mapRow(row) : null, error: null };
}

export type UpdateFixedExpensePaymentInput = {
	payment_id: number;
	paid_date: string;
	period: string;
	net_amount: number;
	iva_percent: number;
	payment_method_id: number;
	bank_account_id: number | null;
};

export async function updateFixedExpensePayment(
	input: UpdateFixedExpensePaymentInput
): Promise<{ data: FixedExpensePaymentRow | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.rpc('update_fixed_expense_payment', {
		p_payment_id: input.payment_id,
		p_paid_date: input.paid_date,
		p_period: input.period,
		p_net_amount: input.net_amount,
		p_iva_percent: input.iva_percent,
		p_payment_method_id: input.payment_method_id,
		p_bank_account_id: input.bank_account_id,
	});
	if (error) return { data: null, error };
	const row = Array.isArray(data) ? data[0] : data;
	if (!row)
		return {
			data: null,
			error: { message: 'No se pudo editar el pago (no existe o no tenés permisos)' },
		};
	return { data: mapRow(row), error: null };
}

export async function deleteFixedExpensePayment(paymentId: number): Promise<{ error: any }> {
	const supabase = getSupabaseClient();
	const { error } = await supabase.rpc('delete_fixed_expense_payment', {
		p_payment_id: paymentId,
	});
	return { error };
}

export type FixedExpensePaymentWithDetails = FixedExpensePaymentRow & {
	description: string;
	category_id: number;
	category_name: string;
	payment_method_name: string;
	bank_account_label: string | null;
};

function mapRowWithDetails(row: any): FixedExpensePaymentWithDetails {
	const { fixed_expenses, payment_methods, bank_accounts, ...rest } = row;
	return {
		...mapRow(rest),
		description: fixed_expenses?.description ?? '',
		category_id: fixed_expenses?.category_id ?? 0,
		category_name: fixed_expenses?.cash_flow_categories?.name ?? '',
		payment_method_name: payment_methods?.name ?? '',
		bank_account_label: bank_accounts ? `${bank_accounts.bank} - ${bank_accounts.name}` : null,
	};
}

export async function listFixedExpensePayments(params: {
	year: number;
}): Promise<{ data: FixedExpensePaymentWithDetails[] | null; error: any }> {
	const supabase = getSupabaseClient();
	const { year } = params;
	const { data, error } = await supabase
		.from('fixed_expense_payments')
		.select(
			'*, fixed_expenses(description, category_id, cash_flow_categories(name)), payment_methods(name), bank_accounts(name, bank)'
		)
		.gte('period', `${year}-01-01`)
		.lt('period', `${year + 1}-01-01`)
		.order('period', { ascending: false })
		.order('paid_date', { ascending: false })
		.order('id', { ascending: false });
	if (error) return { data: null, error };
	return { data: data ? data.map(mapRowWithDetails) : null, error: null };
}
