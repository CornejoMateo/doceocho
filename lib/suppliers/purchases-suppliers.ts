import { getSupabaseClient } from '../supabase-client';

export type PurchaseSupplier = {
	id: number;
	created_at: string;
	amount_ars: number;
	supplier_id: number;
	notes: string | null;
};

export type PurchaseSupplierInput = Omit<PurchaseSupplier, 'id' | 'created_at'>;

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
