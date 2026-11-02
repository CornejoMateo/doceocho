import { getSupabaseClient } from '../supabase-client';
import { normalizeMoney } from '../../utils/formats-money';

export type SupplierPurchaseStatus = 'pending' | 'paid';

export type SupplierExpenseListItem = {
	id: number;
	created_at: string;
	date: string;
	voucher_number: string | null;
	voucher_type_id: number | null;
	voucher_type_name: string | null;
	work_id: number | null;
	work_name: string | null;
	category_id: number | null;
	category_name: string | null;
	payment_method_id: number | null;
	payment_method_name: string | null;
	bank_account_id: number | null;
	bank_account_name: string | null;
	description: string | null;
	net_amount: number;
	iva_percent: number;
	iva_amount: number;
	total_amount: number;
	totalPaidArs: number;
	balanceArs: number;
};

export type ListSupplierPurchasesPageParams = {
	supplierId: number;
	status: SupplierPurchaseStatus;
	from?: string | null;
	to?: string | null;
	limit?: number;
	offset?: number;
};

type ListSupplierPurchasesRow = {
	id: number | string;
	created_at: string;
	date: string;
	voucher_number: string | null;
	voucher_type_id: number | string | null;
	voucher_type_name: string | null;
	work_id: number | string | null;
	work_name: string | null;
	category_id: number | string | null;
	category_name: string | null;
	payment_method_id: number | string | null;
	payment_method_name: string | null;
	bank_account_id: number | string | null;
	bank_account_name: string | null;
	description: string | null;
	net_amount: number | string;
	iva_percent: number | string;
	iva_amount: number | string;
	total_amount: number | string;
	total_paid_ars: number | string;
	balance_ars: number | string;
	total_count: number | string;
};

function mapListSupplierPurchasesRow(row: ListSupplierPurchasesRow): SupplierExpenseListItem {
	return {
		id: Number(row.id),
		created_at: row.created_at,
		date: row.date,
		voucher_number: row.voucher_number,
		voucher_type_id: row.voucher_type_id === null ? null : Number(row.voucher_type_id),
		voucher_type_name: row.voucher_type_name,
		work_id: row.work_id === null ? null : Number(row.work_id),
		work_name: row.work_name,
		category_id: row.category_id === null ? null : Number(row.category_id),
		category_name: row.category_name,
		payment_method_id: row.payment_method_id === null ? null : Number(row.payment_method_id),
		payment_method_name: row.payment_method_name,
		bank_account_id: row.bank_account_id === null ? null : Number(row.bank_account_id),
		bank_account_name: row.bank_account_name,
		description: row.description,
		net_amount: normalizeMoney(Number(row.net_amount)),
		iva_percent: Number(row.iva_percent),
		iva_amount: normalizeMoney(Number(row.iva_amount)),
		total_amount: normalizeMoney(Number(row.total_amount)),
		totalPaidArs: normalizeMoney(Number(row.total_paid_ars)),
		balanceArs: normalizeMoney(Number(row.balance_ars)),
	};
}

export async function listSupplierPurchasesPage({
	supplierId,
	status,
	from = null,
	to = null,
	limit = 20,
	offset = 0,
}: ListSupplierPurchasesPageParams): Promise<{
	data: { purchases: SupplierExpenseListItem[]; totalCount: number } | null;
	error: any;
}> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.rpc('list_supplier_purchases', {
		p_supplier_id: supplierId,
		p_status: status,
		p_from: from,
		p_to: to,
		p_limit: limit,
		p_offset: offset,
	});

	if (error) {
		return { data: null, error };
	}

	const rows = (data ?? []) as ListSupplierPurchasesRow[];

	return {
		data: {
			purchases: rows.map(mapListSupplierPurchasesRow),
			totalCount: rows.length > 0 ? Number(rows[0].total_count) : 0,
		},
		error: null,
	};
}
