import { getSupabaseClient } from '../supabase-client';
import type { SupabaseClient } from '@supabase/supabase-js';

export type ModuleFile = {
	id: number;
	created_at?: string;
	storage_path: string;
	module_id: number;
	file_name?: string | null;
	description?: string | null;
};

const TABLE = 'modules_files';
const BUCKET = 'modules';

export async function listModuleFiles(
	moduleId: number
): Promise<{ data: ModuleFile[] | null; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from(TABLE)
		.select('*')
		.eq('module_id', moduleId)
		.order('id', { ascending: true });

	return { data, error };
}

export async function getModuleFileById(
	id: number
): Promise<{ data: ModuleFile | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single();
	return { data, error };
}

export async function createModuleFile(
	file: Omit<ModuleFile, 'id' | 'created_at'>,
	supabaseClient?: SupabaseClient
): Promise<{ data: ModuleFile | null; error: any }> {
	const supabase = supabaseClient ?? getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).insert(file).select().single();
	return { data, error };
}

export async function updateModuleFile(
	id: number,
	changes: Partial<Omit<ModuleFile, 'id' | 'created_at' | 'storage_path'>>
): Promise<{ data: ModuleFile | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).update(changes).eq('id', id).select().single();
	return { data, error };
}

export async function uploadModuleFile(
	moduleId: number,
	file: File,
	description?: string | null,
	displayName?: string | null
): Promise<{ data: ModuleFile | null; error: any }> {
	try {
		const supabase = getSupabaseClient();

		const fileExt = file.name.split('.').pop();
		const storageName = `${crypto.randomUUID()}.${fileExt}`;
		const filePath = `${moduleId}/${storageName}`;

		const { data: fileRecord, error: dbError } = await supabase
			.from(TABLE)
			.insert({
				storage_path: filePath,
				module_id: moduleId,
				file_name: displayName?.trim() || file.name,
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
		console.error('Unexpected error uploading module file:', err);
		return { data: null, error: err };
	}
}

export async function downloadModuleFile(
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
		console.error('Unexpected error downloading module file:', err);
		return { data: null, error: err };
	}
}

export async function deleteModuleFile(fileId: number): Promise<{ success: boolean; error: any }> {
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
		console.error('Unexpected error deleting module file:', err);
		return { success: false, error: err };
	}
}
