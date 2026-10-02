import { getSupabaseClient } from '../supabase-client';
import { normalizeMoney } from '../../utils/formats-money';

export type PurchaseSupplier = {
	id: number;
	created_at: string;
	amount_ars: number;
	supplier_id: number;
	notes: string | null;
};

export type PurchaseSupplierInput = Omit<PurchaseSupplier, 'id' | 'created_at'>;

export type PurchaseSupplierWithBalance = PurchaseSupplier & {
	totalPaidArs: number;
	balanceArs: number;
};

export type SupplierPurchaseStatus = 'pending' | 'paid';

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
	amount_ars: number | string;
	supplier_id: number | string;
	notes: string | null;
	total_paid_ars: number | string;
	balance_ars: number | string;
	total_count: number | string;
};

function mapListSupplierPurchasesRow(row: ListSupplierPurchasesRow): PurchaseSupplierWithBalance {
	return {
		id: Number(row.id),
		created_at: row.created_at,
		amount_ars: normalizeMoney(Number(row.amount_ars)),
		supplier_id: Number(row.supplier_id),
		notes: row.notes,
		totalPaidArs: normalizeMoney(Number(row.total_paid_ars)),
		balanceArs: normalizeMoney(Number(row.balance_ars)),
	};
}

const TABLE = 'purchases_suppliers';

export async function listPurchasesSuppliers(supplierId?: number): Promise<{
	data: PurchaseSupplier[] | null;
	error: any;
}> {
	const supabase = getSupabaseClient();
	let query = supabase.from(TABLE).select('*').order('created_at', { ascending: false });

	if (supplierId) {
		query = query.eq('supplier_id', supplierId);
	}

	const { data, error } = await query;
	return { data, error };
}

export async function createPurchaseSupplier(
	purchaseSupplier: PurchaseSupplierInput
): Promise<{ data: PurchaseSupplier | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).insert(purchaseSupplier).select().single();
	return { data, error };
}

export async function updatePurchaseSupplier(
	id: number,
	updates: Partial<PurchaseSupplierInput>
): Promise<{ data: PurchaseSupplier | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).update(updates).eq('id', id).select().single();
	return { data, error };
}

/**
 * Paginated purchases for one supplier, filtered by payment status and an
 * optional Argentina-local date range. Status/balance split is computed in SQL.
 */
export async function listSupplierPurchasesPage({
	supplierId,
	status,
	from = null,
	to = null,
	limit = 20,
	offset = 0,
}: ListSupplierPurchasesPageParams): Promise<{
	data: { purchases: PurchaseSupplierWithBalance[]; totalCount: number } | null;
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

const STORAGE_REMOVE_CHUNK_SIZE = 100;

/**
 * Deletes a purchase and all its associated payments and files atomically. Returns
 * an array of storage paths that were deleted, or an empty array if none. If the
 * purchase did not exist or was not permitted to be deleted, returns an error.
 *
 * If any storage objects fail to delete, they are logged and returned in
 * `orphanedPaths` for the caller to retry or report. The purchase and its payment
 * rows are still deleted in this case.
 */
export async function deletePurchaseSupplier(
	id: number
): Promise<{ error: any; orphanedPaths?: string[] }> {
	const supabase = getSupabaseClient();

	const { data: storagePaths, error: rpcError } = await supabase.rpc('delete_purchase_supplier', {
		p_id: id,
	});

	if (rpcError) {
		return { error: rpcError };
	}

	const paths = (storagePaths ?? []).filter((p: unknown): p is string => !!p);
	const orphanedPaths: string[] = [];

	for (let i = 0; i < paths.length; i += STORAGE_REMOVE_CHUNK_SIZE) {
		const chunk = paths.slice(i, i + STORAGE_REMOVE_CHUNK_SIZE);
		const { error: storageError } = await supabase.storage.from('suppliers-files').remove(chunk);
		if (storageError) {
			console.error('Failed to remove purchase supplier storage objects:', chunk, storageError);
			orphanedPaths.push(...chunk);
		}
	}

	return { error: null, ...(orphanedPaths.length > 0 ? { orphanedPaths } : {}) };
}
