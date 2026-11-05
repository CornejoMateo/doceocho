import { getSupabaseClient } from '../supabase-client';
import { buildStorageFileName, FileViewerItem } from '../../utils/file-upload-utils';
import { fetchAllPages, fetchByIdsInChunks } from '@/lib/suppliers/pagination';

export type FileIncome = {
	id: number;
	created_at: string;
	storage_path: string;
	income_id: number;
	file_name: string | null;
	description: string | null;
};

const TABLE = 'files_incomes';
const BUCKET = 'suppliers-files';

export async function listFilesByIncomeId(
	incomeId: number
): Promise<{ data: FileIncome[] | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.select('*')
		.eq('income_id', incomeId)
		.order('id', { ascending: true });
	return { data, error };
}

// Batches the per-income lookup into one query to avoid an N+1 across incomes.
export async function listFilesByIncomeIds(
	incomeIds: number[]
): Promise<{ data: FileIncome[] | null; error: any }> {
	return fetchByIdsInChunks(incomeIds, (chunk) =>
		fetchAllPages<FileIncome>((from, to) => {
			const supabase = getSupabaseClient();
			return supabase
				.from(TABLE)
				.select('*')
				.in('income_id', chunk)
				.order('id', { ascending: true })
				.range(from, to);
		})
	);
}

export async function uploadFileIncome(
	incomeId: number,
	file: File,
	description?: string | null,
	fileName?: string | null
): Promise<{ data: FileIncome | null; error: any }> {
	try {
		const supabase = getSupabaseClient();

		const storageName = buildStorageFileName(file.name);
		const filePath = `incomes/${incomeId}/${storageName}`;

		const { data: fileRecord, error: dbError } = await supabase
			.from(TABLE)
			.insert({
				storage_path: filePath,
				income_id: incomeId,
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
		console.error('Unexpected error uploading income file:', err);
		return { data: null, error: err };
	}
}

export async function downloadFileIncome(
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
		console.error('Unexpected error downloading income file:', err);
		return { data: null, error: err };
	}
}

export async function deleteFileIncome(fileId: number): Promise<{ success: boolean; error: any }> {
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
		console.error('Unexpected error deleting income file:', err);
		return { success: false, error: err };
	}
}

const SIGNED_URL_EXPIRY_SECONDS = 3600;

// One batched createSignedUrls call per gallery load instead of per-file blob downloads.
export async function signUrlsForIncomeFiles(
	files: FileIncome[]
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

export async function listFilesWithUrlsByIncomeId(
	incomeId: number
): Promise<{ data: FileViewerItem[] | null; error: any }> {
	const listResult = await listFilesByIncomeId(incomeId);
	if (listResult.error) {
		return { data: null, error: listResult.error };
	}

	return signUrlsForIncomeFiles(listResult.data ?? []);
}
