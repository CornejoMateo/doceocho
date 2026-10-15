import { getSupabaseClient } from '../supabase-client';
import { roundToTwoDecimals } from '../../utils/formats-money';

// One row per (month, work_id); work_id null = "Sin obra". month is 1-12.
export type SummaryMonthlyRow = {
	month: number;
	workId: number | null;
	incomeNet: number;
	incomeIva: number;
	expenseNet: number;
	expenseIva: number;
	collectionAmount: number;
	paymentAmount: number;
};

type SummaryMonthlyRawRow = {
	month: number;
	work_id: number | string | null;
	income_net: number | string;
	income_iva: number | string;
	expense_net: number | string;
	expense_iva: number | string;
	collection_amount: number | string;
	payment_amount: number | string;
};

function mapSummaryMonthlyRow(row: SummaryMonthlyRawRow): SummaryMonthlyRow {
	return {
		month: Number(row.month),
		workId: row.work_id === null ? null : Number(row.work_id),
		incomeNet: roundToTwoDecimals(Number(row.income_net)),
		incomeIva: roundToTwoDecimals(Number(row.income_iva)),
		expenseNet: roundToTwoDecimals(Number(row.expense_net)),
		expenseIva: roundToTwoDecimals(Number(row.expense_iva)),
		collectionAmount: roundToTwoDecimals(Number(row.collection_amount)),
		paymentAmount: roundToTwoDecimals(Number(row.payment_amount)),
	};
}

export async function getSummaryMonthly(
	year: number
): Promise<{ data: SummaryMonthlyRow[] | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.rpc('cash_flow_summary_monthly', { p_year: year });

	if (error) {
		return { data: null, error };
	}

	return {
		data: ((data ?? []) as SummaryMonthlyRawRow[]).map(mapSummaryMonthlyRow),
		error: null,
	};
}

// One row per month (1-12); fixed costs have no obra, so this is never split by work.
export type FixedCostsMonthlyRow = {
	month: number;
	net: number;
	iva: number;
	total: number;
};

type FixedCostsMonthlyRawRow = {
	month: number;
	net: number | string;
	iva: number | string;
	total: number | string;
};

function mapFixedCostsMonthlyRow(row: FixedCostsMonthlyRawRow): FixedCostsMonthlyRow {
	return {
		month: Number(row.month),
		net: roundToTwoDecimals(Number(row.net)),
		iva: roundToTwoDecimals(Number(row.iva)),
		total: roundToTwoDecimals(Number(row.total)),
	};
}

/** Monthly totals for fixed_expense_payments (registered payments) for a year. No obra split. */
export async function getFixedCostsMonthly(
	year: number
): Promise<{ data: FixedCostsMonthlyRow[] | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.rpc('cash_flow_fixed_costs_monthly', { p_year: year });

	if (error) {
		return { data: null, error };
	}

	return {
		data: ((data ?? []) as FixedCostsMonthlyRawRow[]).map(mapFixedCostsMonthlyRow),
		error: null,
	};
}
