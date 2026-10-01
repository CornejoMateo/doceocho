import { listPurchasesSuppliers, type PurchaseSupplier } from './purchases-suppliers';
import { listPaymentsSuppliersByPurchaseIds, type PaymentSupplier } from './payments-suppliers';
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

export type PurchaseSupplierWithPayments = PurchaseSupplier & {
	payments: PaymentSupplier[];
	totalPaidArs: number;
	balanceArs: number;
};

export type SupplierAccountDetail = {
	supplier_id: number;
	purchases: PurchaseSupplierWithPayments[];
	totalPurchasesArs: number;
	totalPaymentsArs: number;
	balanceArs: number;
};

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
 * Returns a single supplier's purchases, each enriched with its payments and a
 * computed balance, for the detail-dialog UI to consume. Lib-only, no React.
 */
export async function getSupplierAccountDetail(supplierId: number): Promise<{
	data: SupplierAccountDetail | null;
	error: any;
}> {
	const purchasesRes = await listPurchasesSuppliers(supplierId);
	if (purchasesRes.error) return { data: null, error: purchasesRes.error };

	const purchases = purchasesRes.data ?? [];

	const paymentsRes = await listPaymentsSuppliersByPurchaseIds(
		purchases.map((purchase) => purchase.id)
	);
	if (paymentsRes.error) return { data: null, error: paymentsRes.error };

	const payments = paymentsRes.data ?? [];

	// purchase_supplier_id -> payments
	const paymentsByPurchase = new Map<number, PaymentSupplier[]>();
	for (const payment of payments) {
		const current = paymentsByPurchase.get(payment.purchase_supplier_id) ?? [];
		current.push(payment);
		paymentsByPurchase.set(payment.purchase_supplier_id, current);
	}

	let totalPurchasesArs = 0;
	let totalPaymentsArs = 0;

	const purchasesWithPayments: PurchaseSupplierWithPayments[] = purchases.map((purchase) => {
		const purchasePayments = paymentsByPurchase.get(purchase.id) ?? [];

		const totalPaidArs = normalizeMoney(purchasePayments.reduce((sum, p) => sum + p.amount_ars, 0));

		totalPurchasesArs += purchase.amount_ars;
		totalPaymentsArs += totalPaidArs;

		return {
			...purchase,
			payments: purchasePayments,
			totalPaidArs,
			balanceArs: normalizeMoney(purchase.amount_ars - totalPaidArs),
		};
	});

	return {
		data: {
			supplier_id: supplierId,
			purchases: purchasesWithPayments,
			totalPurchasesArs: normalizeMoney(totalPurchasesArs),
			totalPaymentsArs: normalizeMoney(totalPaymentsArs),
			balanceArs: normalizeMoney(totalPurchasesArs - totalPaymentsArs),
		},
		error: null,
	};
}
