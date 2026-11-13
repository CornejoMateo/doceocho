import { getSupabaseClient } from '../supabase-client';
import { roundToTwoDecimals } from '@/utils/formats-money';

export type IncomeTaxCondition = 'registered' | 'not_registered' | 'monotax' | 'exempt';

export const INCOME_TAX_CONDITION_LABELS: Record<IncomeTaxCondition, string> = {
	registered: 'Inscripto',
	not_registered: 'No inscripto',
	monotax: 'Monotributista',
	exempt: 'Exento',
};

// Type guard for the 4 income_tax_condition DB enum values.
export function isIncomeTaxCondition(value: unknown): value is IncomeTaxCondition {
	return typeof value === 'string' && value in INCOME_TAX_CONDITION_LABELS;
}

export type Withholding = {
	id: number;
	expense_id: number;
	payment_id: number | null;
	date: string;
	period: string;
	tax_regime: string | null;
	imputed_amount: number;
	rate: number;
	withheld_amount: number;
	total_amount: number;
	notes: string | null;
	created_at: string;
};

// Payload for the withholding half of create_payment_with_withholding; withheld_amount/total_amount
// are DB-computed and must never be sent by the client.
export type WithholdingInput = {
	tax_regime: string;
	rate: number; // fraction, e.g. 0.02 for 2%
	imputed_amount: number;
	period?: string | null;
	notes?: string | null;
};

// Hand-written validation (project has no zod). Returns the first Spanish error found, or null.
export function validateWithholdingInput(input: {
	tax_regime: string;
	rate: number;
	imputed_amount: number;
}): string | null {
	if (!input.tax_regime.trim()) return 'El régimen de la retención es obligatorio.';
	if (!Number.isFinite(input.rate) || input.rate < 0 || input.rate > 1) {
		return 'La alícuota debe estar entre 0% y 100%.';
	}
	if (!Number.isFinite(input.imputed_amount) || input.imputed_amount <= 0) {
		return 'El monto imputado debe ser mayor a 0.';
	}
	if (roundToTwoDecimals(input.imputed_amount) !== input.imputed_amount) {
		return 'El monto imputado admite hasta 2 decimales.';
	}
	return null;
}

// UI collects the alícuota as a 0-100 percentage; convert to the fraction the DB stores,
// rounding to 4 decimals to avoid float noise (e.g. 2.5 -> 0.025, not 0.025000000000000001).
export function percentToRateFraction(percent: number): number {
	return Math.round((percent / 100) * 10000) / 10000;
}

// Supplier name comes from the linked expense; null if the expense later lost its supplier
// (suppliers is a LEFT join on purpose, so the withholding never disappears from the report).
export type WithholdingRow = Withholding & { supplier_name: string | null };

const TABLE = 'withholdings';
const SELECT = '*, expenses!inner(supplier_id, suppliers(name))';

// Mirrors DB constraint: months 01-12 only.
const PERIOD_RE = /^[0-9]{4}-(0[1-9]|1[0-2])$/;
export function isValidPeriod(period: string): boolean {
	return PERIOD_RE.test(period);
}

export type ListWithholdingsFilters = {
	period?: string;
	supplierId?: number;
};

// Read-only. Filtering happens server-side via PostgREST embedded filters on the expenses join.
export async function listWithholdings(
	filters: ListWithholdingsFilters = {}
): Promise<{ data: WithholdingRow[] | null; error: any }> {
	const supabase = getSupabaseClient();
	let query = supabase.from(TABLE).select(SELECT);

	if (filters.period && isValidPeriod(filters.period)) {
		query = query.eq('period', filters.period);
	}
	if (filters.supplierId != null) {
		query = query.eq('expenses.supplier_id', filters.supplierId);
	}

	const { data, error } = await query.order('date', { ascending: false });
	if (error) return { data: null, error };
	if (!data) return { data: [], error: null };

	const rows: WithholdingRow[] = data.map((row: any) => {
		const { expenses, ...rest } = row;
		const expense = Array.isArray(expenses) ? expenses[0] : expenses;
		const suppliers = expense?.suppliers;
		const supplier = Array.isArray(suppliers) ? suppliers[0] : suppliers;
		return { ...rest, supplier_name: supplier?.name ?? null };
	});

	return { data: rows, error: null };
}

// Read-only. Used to lock the amount field when editing a payment that already has a withholding.
export async function getWithholdingByPaymentId(
	paymentId: number
): Promise<{ data: Withholding | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.select('*')
		.eq('payment_id', paymentId)
		.maybeSingle();
	return { data, error };
}
