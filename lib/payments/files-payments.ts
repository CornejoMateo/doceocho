import { getSupabaseClient } from '../supabase-client';
import { buildStorageFileName, FileViewerItem } from '../../utils/file-upload-utils';
import { fetchAllPages, fetchByIdsInChunks } from '@/lib/suppliers/pagination';

export type FilePayment = {
	id: number;
	created_at: string;
	storage_path: string;
	payment_id: number;
	file_name: string | null;
	description: string | null;
};

const TABLE = 'files_payments';
const BUCKET = 'suppliers-files';

export async function listFilesByPaymentId(
	paymentId: number
): Promise<{ data: FilePayment[] | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.select('*')
		.eq('payment_id', paymentId)
		.order('id', { ascending: true });
	return { data, error };
}

// Batches the per-payment lookup into one query to avoid an N+1 across payments.
export async function listFilesByPaymentIds(
	paymentIds: number[]
): Promise<{ data: FilePayment[] | null; error: any }> {
	return fetchByIdsInChunks(paymentIds, (chunk) =>
		fetchAllPages<FilePayment>((from, to) => {
			const supabase = getSupabaseClient();
			return supabase
				.from(TABLE)
				.select('*')
				.in('payment_id', chunk)
				.order('id', { ascending: true })
				.range(from, to);
		})
	);
}

export async function uploadFilePayment(
	paymentId: number,
	file: File,
	description?: string | null,
	fileName?: string | null
): Promise<{ data: FilePayment | null; error: any }> {
	try {
		const supabase = getSupabaseClient();

		const storageName = buildStorageFileName(file.name);
		const filePath = `payments/${paymentId}/${storageName}`;

		const { data: fileRecord, error: dbError } = await supabase
			.from(TABLE)
			.insert({
				storage_path: filePath,
				payment_id: paymentId,
				file_name: fileName?.trim() || file.name,
				description: description || null,
			})
			.select()
			.single();

		if (dbError || !fileRecord) {
			return { data: null, error: dbError };
		}

		const { error: uploadError } = await supabase.storage
			.from(BUCKET)
			.upload(filePath, file, file.type ? undefined : { contentType: 'application/octet-stream' });

		if (uploadError) {
			await supabase.from(TABLE).delete().eq('id', fileRecord.id);
			return { data: null, error: uploadError };
		}

		return { data: fileRecord, error: null };
	} catch (err) {
		console.error('Unexpected error uploading payment file:', err);
		return { data: null, error: err };
	}
}

export async function downloadFilePayment(
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
		console.error('Unexpected error downloading payment file:', err);
		return { data: null, error: err };
	}
}

export async function deleteFilePayment(fileId: number): Promise<{ success: boolean; error: any }> {
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
		console.error('Unexpected error deleting payment file:', err);
		return { success: false, error: err };
	}
}

const SIGNED_URL_EXPIRY_SECONDS = 3600;

// One batched createSignedUrls call per gallery load instead of per-file blob downloads.
export async function signUrlsForPaymentFiles(
	files: FilePayment[]
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

export async function listFilesWithUrlsByPaymentId(
	paymentId: number
): Promise<{ data: FileViewerItem[] | null; error: any }> {
	const listResult = await listFilesByPaymentId(paymentId);
	if (listResult.error) {
		return { data: null, error: listResult.error };
	}

	return signUrlsForPaymentFiles(listResult.data ?? []);
}
