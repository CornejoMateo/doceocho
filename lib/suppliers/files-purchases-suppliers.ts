import { getSupabaseClient } from '../supabase-client';
import { FileViewerItem } from '../../utils/file-upload-utils';

export type FilePurchaseSupplier = {
	id: number;
	created_at: string;
	storage_path: string;
	purchase_supplier_id: number;
	file_name: string | null;
	description: string | null;
};

const TABLE = 'files_purchases_suppliers';
const BUCKET = 'suppliers-files';

export async function listFilesByPurchaseSupplierId(
	purchaseSupplierId: number
): Promise<{ data: FilePurchaseSupplier[] | null; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from(TABLE)
		.select('*')
		.eq('purchase_supplier_id', purchaseSupplierId)
		.order('id', { ascending: true });

	return { data, error };
}

export async function uploadFilePurchaseSupplier(
	purchaseSupplierId: number,
	file: File,
	description?: string | null,
	fileName?: string | null
): Promise<{ data: FilePurchaseSupplier | null; error: any }> {
	try {
		const supabase = getSupabaseClient();

		const fileExt = file.name.split('.').pop();
		const storageName = `${crypto.randomUUID()}.${fileExt}`;
		const filePath = `purchases/${purchaseSupplierId}/${storageName}`;

		const { data: fileRecord, error: dbError } = await supabase
			.from(TABLE)
			.insert({
				storage_path: filePath,
				purchase_supplier_id: purchaseSupplierId,
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
		console.error('Unexpected error uploading purchase supplier file:', err);
		return { data: null, error: err };
	}
}

export async function downloadFilePurchaseSupplier(
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
		console.error('Unexpected error downloading purchase supplier file:', err);
		return { data: null, error: err };
	}
}

export async function deleteFilePurchaseSupplier(
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
		console.error('Unexpected error deleting purchase supplier file:', err);
		return { success: false, error: err };
	}
}

export async function listFilesWithUrlsByPurchaseSupplierId(
	purchaseSupplierId: number
): Promise<{ data: FileViewerItem[] | null; error: any }> {
	const supabase = getSupabaseClient();

	const listResult = await listFilesByPurchaseSupplierId(purchaseSupplierId);
	if (listResult.error) {
		return { data: null, error: listResult.error };
	}

	const files = listResult.data || [];
	if (files.length === 0) {
		return { data: [], error: null };
	}

	const results = await Promise.all(
		files.map(async (row): Promise<FileViewerItem | null> => {
			try {
				const { data: blob, error: downloadError } = await supabase.storage
					.from(BUCKET)
					.download(row.storage_path);

				if (downloadError || !blob) {
					console.error('Error downloading file:', row.storage_path, downloadError);
					return null;
				}

				const url = URL.createObjectURL(blob);
				const name = row.file_name || row.storage_path.split('/').pop() || 'archivo';
				const displayName = row.file_name || name;

				return {
					id: row.id,
					url,
					name,
					displayName,
					description: row.description,
					mimetype: blob.type || null,
					size: blob.size,
					uploadedAt: row.created_at || null,
				};
			} catch (err) {
				console.error('Unexpected error processing file:', row.storage_path, err);
				return null;
			}
		})
	);

	const data = results.filter((f): f is FileViewerItem => f !== null);
	return { data, error: null };
}
