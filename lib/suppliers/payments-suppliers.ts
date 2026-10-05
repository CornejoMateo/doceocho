import { getSupabaseClient } from '../supabase-client';
import { fetchAllPages, fetchByIdsInChunks } from './pagination';

export type PaymentSupplier = {
	id: number;
	created_at: string;
	amount_ars: number;
	bank_account_id: number | null;
	payment_method_id: number | null;
	purchase_supplier_id: number;
	notes: string | null;
};

export type PaymentSupplierInput = Omit<PaymentSupplier, 'id' | 'created_at'>;

const TABLE = 'payments_suppliers';

export async function listPaymentsSuppliers(purchaseSupplierId?: number): Promise<{
	data: PaymentSupplier[] | null;
	error: any;
}> {
	const supabase = getSupabaseClient();
	let query = supabase.from(TABLE).select('*').order('created_at', { ascending: false });

	if (purchaseSupplierId) {
		query = query.eq('purchase_supplier_id', purchaseSupplierId);
	}

	const { data, error } = await query;
	return { data, error };
}

export async function listPaymentsSuppliersByPurchaseIds(purchaseIds: number[]): Promise<{
	data: PaymentSupplier[] | null;
	error: any;
}> {
	return fetchByIdsInChunks(purchaseIds, (chunk) =>
		fetchAllPages<PaymentSupplier>((from, to) => {
			const supabase = getSupabaseClient();
			return supabase
				.from(TABLE)
				.select('*')
				.in('purchase_supplier_id', chunk)
				.order('created_at', { ascending: false })
				.order('id', { ascending: false })
				.range(from, to);
		})
	);
}

export async function createPaymentSupplier(
	paymentSupplier: PaymentSupplierInput
): Promise<{ data: PaymentSupplier | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).insert(paymentSupplier).select().single();
	return { data, error };
}

export async function updatePaymentSupplier(
	id: number,
	updates: Partial<PaymentSupplierInput>
): Promise<{ data: PaymentSupplier | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).update(updates).eq('id', id).select().single();
	return { data, error };
}

const STORAGE_REMOVE_CHUNK_SIZE = 100;

/**
 * Deletes a payment and its associated files atomically. Returns an array of
 * storage paths that were deleted, or an empty array if none. If the payment
 * did not exist or was not permitted to be deleted, returns an error.
 *
 * If any storage objects fail to delete, they are logged and returned in
 * `orphanedPaths` for the caller to retry or report. The payment row itself is
 * still deleted in this case.
 */
export async function deletePaymentSupplier(
	id: number
): Promise<{ error: any; orphanedPaths?: string[] }> {
	const supabase = getSupabaseClient();

	const { data: storagePaths, error: rpcError } = await supabase.rpc('delete_payment_supplier', {
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
			console.error('Failed to remove payment supplier storage objects:', chunk, storageError);
			orphanedPaths.push(...chunk);
		}
	}

	return { error: null, ...(orphanedPaths.length > 0 ? { orphanedPaths } : {}) };
}
