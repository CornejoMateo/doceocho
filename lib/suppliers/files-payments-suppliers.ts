import { getSupabaseClient } from '../supabase-client';
import { FileViewerItem } from '../../utils/file-upload-utils';

export type FilePaymentSupplier = {
	id: number;
	created_at: string;
	storage_path: string;
	payment_supplier_id: number;
	file_name: string | null;
	description: string | null;
};

const TABLE = 'files_payments_suppliers';
const BUCKET = 'suppliers-files';

export async function listFilesByPaymentSupplierId(
	paymentSupplierId: number
): Promise<{ data: FilePaymentSupplier[] | null; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from(TABLE)
		.select('*')
		.eq('payment_supplier_id', paymentSupplierId)
		.order('id', { ascending: true });

	return { data, error };
}

/**
 * Lists files for multiple payment_supplier_ids in a single query. Returns an
 * array of FilePaymentSupplier objects for all matching rows, or an empty array
 * if none match. If the input array is empty, returns an empty array without
 * querying the database.
 */
export async function listFilesByPaymentSupplierIds(
	paymentSupplierIds: number[]
): Promise<{ data: FilePaymentSupplier[] | null; error: any }> {
	if (paymentSupplierIds.length === 0) {
		return { data: [], error: null };
	}

	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from(TABLE)
		.select('*')
		.in('payment_supplier_id', paymentSupplierIds)
		.order('id', { ascending: true });

	return { data, error };
}

export async function uploadFilePaymentSupplier(
	paymentSupplierId: number,
	file: File,
	description?: string | null,
	fileName?: string | null
): Promise<{ data: FilePaymentSupplier | null; error: any }> {
	try {
		const supabase = getSupabaseClient();

		const fileExt = file.name.split('.').pop();
		const storageName = `${crypto.randomUUID()}.${fileExt}`;
		const filePath = `payments/${paymentSupplierId}/${storageName}`;

		const { data: fileRecord, error: dbError } = await supabase
			.from(TABLE)
			.insert({
				storage_path: filePath,
				payment_supplier_id: paymentSupplierId,
				file_name: fileName?.trim() || file.name,
				description: description || null,
			})
			.select()
			.single();

		if (dbError || !fileRecord) {
			return { data: null, error: dbError };
		}

		const { error: uploadError } = await supabase.storage.from(BUCKET).upload(filePath, file);

		if (uploadError) {
			await supabase.from(TABLE).delete().eq('id', fileRecord.id);
			return { data: null, error: uploadError };
		}

		return { data: fileRecord, error: null };
	} catch (err) {
		console.error('Unexpected error uploading payment supplier file:', err);
		return { data: null, error: err };
	}
}

export async function downloadFilePaymentSupplier(
	fileId: number
): Promise<{ data: Blob | null; error: any }> {
	try {
		const supabase = getSupabaseClient();

		const { data: fileRecord, error: fetchError } = await supabase
			.from(TABLE)
			.select('storage_path')
			.eq('id', fileId)
			.single();

		if (fetchError) {
			return { data: null, error: fetchError };
		}

		if (!fileRecord || !fileRecord.storage_path) {
			return { data: null, error: 'File record not found or missing storage path' };
		}

		const { data, error } = await supabase.storage.from(BUCKET).download(fileRecord.storage_path);
		return { data, error };
	} catch (err) {
		console.error('Unexpected error downloading payment supplier file:', err);
		return { data: null, error: err };
	}
}

export async function deleteFilePaymentSupplier(
	fileId: number
): Promise<{ success: boolean; error: any }> {
	try {
		const supabase = getSupabaseClient();

		const { data: fileRecord, error: fetchError } = await supabase
			.from(TABLE)
			.select('*')
			.eq('id', fileId)
			.single();

		if (fetchError) {
			return { success: false, error: fetchError };
		}

		if (!fileRecord || !fileRecord.storage_path) {
			return { success: false, error: 'File record not found or missing storage path' };
		}

		const { error: deleteStorageError } = await supabase.storage
			.from(BUCKET)
			.remove([fileRecord.storage_path]);

		if (deleteStorageError) {
			return { success: false, error: deleteStorageError };
		}

		const { error: deleteDbError } = await supabase.from(TABLE).delete().eq('id', fileId);

		if (deleteDbError) {
			console.error('Failed to delete file record after storage removal:', deleteDbError);
			return { success: false, error: deleteDbError };
		}

		return { success: true, error: null };
	} catch (err) {
		console.error('Unexpected error deleting payment supplier file:', err);
		return { success: false, error: err };
	}
}

const SIGNED_URL_EXPIRY_SECONDS = 3600;

// One batched createSignedUrls call per gallery load instead of per-file blob downloads.
export async function signUrlsForPaymentSupplierFiles(
	files: FilePaymentSupplier[]
): Promise<{ data: FileViewerItem[] | null; error: any }> {
	if (files.length === 0) {
		return { data: [], error: null };
	}

	const supabase = getSupabaseClient();
	const { data: signed, error } = await supabase.storage.from(BUCKET).createSignedUrls(
		files.map((file) => file.storage_path),
		SIGNED_URL_EXPIRY_SECONDS
	);

	if (error) {
		return { data: null, error };
	}

	const signedByPath = new Map((signed ?? []).map((entry) => [entry.path, entry]));

	const data = files.reduce<FileViewerItem[]>((acc, row) => {
		const entry = signedByPath.get(row.storage_path);
		if (!entry || entry.error || !entry.signedUrl) {
			console.error('Error signing url for file:', row.storage_path, entry?.error);
			return acc;
		}
		const name = row.file_name || row.storage_path.split('/').pop() || 'archivo';
		acc.push({
			id: row.id,
			url: entry.signedUrl,
			name,
			displayName: row.file_name || name,
			description: row.description,
			mimetype: null,
			size: null,
			uploadedAt: row.created_at || null,
		});
		return acc;
	}, []);

	return { data, error: null };
}

export async function listFilesWithUrlsByPaymentSupplierId(
	paymentSupplierId: number
): Promise<{ data: FileViewerItem[] | null; error: any }> {
	const listResult = await listFilesByPaymentSupplierId(paymentSupplierId);
	if (listResult.error) {
		return { data: null, error: listResult.error };
	}

	return signUrlsForPaymentSupplierFiles(listResult.data ?? []);
}
