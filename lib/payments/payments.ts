import { getSupabaseClient } from '../supabase-client';
import { fetchAllPages } from '@/lib/suppliers/pagination';
import type { WithholdingInput } from '@/lib/withholdings/withholdings';

export type Payment = {
	id: number;
	created_at: string;
	date: string;
	receipt_number: string | null;
	work_id: number | null;
	category_id: number | null;
	kind: 'payment';
	description: string | null;
	amount: number;
	payment_method_id: number | null;
	bank_account_id: number | null;
	expense_id: number | null;
};

export type PaymentWithDetails = Payment & {
	work_name: string | null;
	category_name: string | null;
	payment_method_name: string;
	bank_account_name: string | null;
	expense_date: string | null;
	expense_voucher_number: string | null;
	expense_description: string | null;
	expense_total_amount: number | null;
};

export type PaymentInput = {
	date: string;
	receipt_number: string | null;
	work_id: number | null;
	category_id: number | null;
	description: string | null;
	amount: number;
	payment_method_id: number | null;
	bank_account_id: number | null;
	expense_id: number | null;
};

const TABLE = 'payments';
const SELECT =
	'*, works(name), cash_flow_categories(name), payment_methods(name), bank_accounts(name, bank), expenses(date, voucher_number, description, total_amount)';

function mapRow(row: any): PaymentWithDetails {
	const { works, cash_flow_categories, payment_methods, bank_accounts, expenses, ...rest } = row;
	return {
		...rest,
		work_name: works?.name ?? null,
		category_name: cash_flow_categories?.name ?? null,
		payment_method_name: payment_methods?.name ?? '',
		bank_account_name: bank_accounts ? `${bank_accounts.bank} - ${bank_accounts.name}` : null,
		expense_date: expenses?.date ?? null,
		expense_voucher_number: expenses?.voucher_number ?? null,
		expense_description: expenses?.description ?? null,
		expense_total_amount: expenses?.total_amount ?? null,
	};
}

export async function listPayments(params: {
	year: number;
}): Promise<{ data: PaymentWithDetails[] | null; error: any }> {
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

export async function createPaymentWithWithholding(
	paymentInput: PaymentInput,
	withholdingInput: WithholdingInput
): Promise<{ data: Payment | null; error: any }> {
	const supabase = getSupabaseClient();
	const normalized = normalizeInput(paymentInput);
	const { data, error } = await supabase.rpc('create_payment_with_withholding', {
		p_date: normalized.date,
		p_receipt_number: normalized.receipt_number,
		p_work_id: normalized.work_id,
		p_category_id: normalized.category_id,
		p_description: normalized.description,
		p_amount: normalized.amount,
		p_payment_method_id: normalized.payment_method_id,
		p_bank_account_id: normalized.bank_account_id,
		p_expense_id: normalized.expense_id,
		p_tax_regime: withholdingInput.tax_regime.trim(),
		p_rate: withholdingInput.rate,
		p_imputed_amount: withholdingInput.imputed_amount,
		p_period: withholdingInput.period ?? null,
		p_notes: withholdingInput.notes?.trim() || null,
	});
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

const STORAGE_BUCKET = 'suppliers-files';
const STORAGE_REMOVE_CHUNK_SIZE = 100;

export async function deletePayment(id: number): Promise<{ error: any; orphanedPaths?: string[] }> {
	const supabase = getSupabaseClient();
	const { data: storagePaths, error: rpcError } = await supabase.rpc('delete_payment_supplier', {
		p_id: id,
	});
	if (rpcError) return { error: rpcError };

	const paths = (storagePaths ?? []).filter((p: unknown): p is string => !!p);
	const orphanedPaths: string[] = [];

	for (let i = 0; i < paths.length; i += STORAGE_REMOVE_CHUNK_SIZE) {
		const chunk = paths.slice(i, i + STORAGE_REMOVE_CHUNK_SIZE);
		const { error: storageError } = await supabase.storage.from(STORAGE_BUCKET).remove(chunk);
		if (storageError) {
			console.error('Failed to remove payment storage objects:', chunk, storageError);
			orphanedPaths.push(...chunk);
		}
	}

	return { error: null, ...(orphanedPaths.length > 0 ? { orphanedPaths } : {}) };
}

export async function listPaymentsByExpenseIds(
	expenseIds: number[]
): Promise<{ data: PaymentWithDetails[] | null; error: any }> {
	if (expenseIds.length === 0) return { data: [], error: null };
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.select(SELECT)
		.in('expense_id', expenseIds)
		.order('date', { ascending: false })
		.order('id', { ascending: false });
	if (error) return { data: null, error };
	return { data: (data ?? []).map(mapRow), error: null };
}
