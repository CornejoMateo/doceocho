import { getSupabaseClient } from '../supabase-client';
import { normalizeMoney } from '../../utils/formats-money';

export type SupplierAccountSummary = {
	supplier_id: number;
	supplier_name: string;
	totalPurchasesArs: number;
	totalPaymentsArs: number;
	balanceArs: number;
};

type SupplierAccountSummaryRow = {
	supplier_id: number;
	supplier_name: string;
	total_purchases_ars: number | string;
	total_payments_ars: number | string;
	balance_ars: number | string;
};

function mapSupplierAccountSummaryRow(row: SupplierAccountSummaryRow): SupplierAccountSummary {
	return {
		supplier_id: Number(row.supplier_id),
		supplier_name: row.supplier_name,
		totalPurchasesArs: normalizeMoney(Number(row.total_purchases_ars)),
		totalPaymentsArs: normalizeMoney(Number(row.total_payments_ars)),
		balanceArs: normalizeMoney(Number(row.balance_ars)),
	};
}

export type SupplierAccountTotals = {
	totalPurchasesArs: number;
	totalPaymentsArs: number;
	balanceArs: number;
	pendingCount: number;
	paidCount: number;
};

type SupplierAccountTotalsRow = {
	total_purchases_ars: number | string;
	total_payments_ars: number | string;
	balance_ars: number | string;
	pending_count: number | string;
	paid_count: number | string;
};

function mapSupplierAccountTotalsRow(row: SupplierAccountTotalsRow): SupplierAccountTotals {
	return {
		totalPurchasesArs: normalizeMoney(Number(row.total_purchases_ars)),
		totalPaymentsArs: normalizeMoney(Number(row.total_payments_ars)),
		balanceArs: normalizeMoney(Number(row.balance_ars)),
		pendingCount: Number(row.pending_count),
		paidCount: Number(row.paid_count),
	};
}

/**
 * Aggregates, per supplier, the total purchased amount, total paid amount, and
 * resulting balance (positive = we still owe the supplier).
 */
export async function getSuppliersAccountsSummary(): Promise<{
	data: SupplierAccountSummary[] | null;
	error: any;
}> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.rpc('get_suppliers_accounts_summary');

	if (error) {
		return {
			data: null,
			error,
		};
	}

	return {
		data: ((data ?? []) as SupplierAccountSummaryRow[]).map(mapSupplierAccountSummaryRow),
		error: null,
	};
}

/**
 * Supplier-wide totals and pending/paid counts, independent of any date filter.
 */
export async function getSupplierAccountTotals(supplierId: number): Promise<{
	data: SupplierAccountTotals | null;
	error: any;
}> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.rpc('get_supplier_account_totals', {
		p_supplier_id: supplierId,
	});

	if (error) {
		return { data: null, error };
	}

	const row = ((data ?? []) as SupplierAccountTotalsRow[])[0];
	if (!row) {
		return {
			data: {
				totalPurchasesArs: 0,
				totalPaymentsArs: 0,
				balanceArs: 0,
				pendingCount: 0,
				paidCount: 0,
			},
			error: null,
		};
	}

	return { data: mapSupplierAccountTotalsRow(row), error: null };
}
