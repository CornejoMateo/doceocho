import { getSupabaseClient } from '../supabase-client';
import { optimizeFile } from '@/utils/optimization-images';

const TABLE = 'gallery_checklists';
const BUCKET = 'checklist-gallery';

export type ChecklistGalleryItem = {
	id: number;
	created_at?: string;
	path: string | null;
	item_id: number | null;
	title: string | null;
	description: string | null;
};

export async function getChecklistGalleryByItemId(
	itemId: number
): Promise<{ data: ChecklistGalleryItem[] | null; error: any }> {
	const supabase = getSupabaseClient();
	try {
		if (!itemId) return { data: [], error: 'Error getting item id' };
		const { data, error } = await supabase
			.from(TABLE)
			.select('*')
			.eq('item_id', itemId)
			.order('id', { ascending: true });
		if (error) return { data: null, error };
		return { data, error: null };
	} catch (err) {
		console.error('Error listing checklist gallery:', err);
		return { data: null, error: err };
	}
}

export async function uploadChecklistGalleryItem(
	itemId: number,
	file: File,
	title: string | null = null,
	description: string | null = null
): Promise<{ data: ChecklistGalleryItem | null; error: any }> {
	const supabase = getSupabaseClient();
	const fileExt = file.name.split('.').pop();
	const fileName = `${crypto.randomUUID()}.${fileExt}`;
	const filePath = `${itemId}/${fileName}`;

	const optimizedFile = await optimizeFile(file);

	const { error: uploadError } = await supabase.storage
		.from(BUCKET)
		.upload(filePath, optimizedFile);
	if (uploadError) return { data: null, error: uploadError };

	const { data, error: dbError } = await supabase
		.from(TABLE)
		.insert({ item_id: itemId, path: filePath, title, description })
		.select()
		.single();

	if (dbError) {
		await supabase.storage.from(BUCKET).remove([filePath]);
		return { data: null, error: dbError };
	}
	return { data, error: null };
}

export async function deleteChecklistGalleryItem(
	id: number
): Promise<{ success: boolean; error: any }> {
	const supabase = getSupabaseClient();

	const { data: record, error: fetchError } = await supabase
		.from(TABLE)
		.select('path')
		.eq('id', id)
		.single();

	if (fetchError) return { success: false, error: fetchError };
	if (!record || !record.path) return { success: false, error: 'Record not found or missing path' };

	const { error: deleteDbError } = await supabase.from(TABLE).delete().eq('id', id);
	if (deleteDbError) return { success: false, error: deleteDbError };

	const { error: deleteStorageError } = await supabase.storage.from(BUCKET).remove([record.path]);
	if (deleteStorageError) {
		console.error('File deleted from DB but storage cleanup failed:', deleteStorageError);
	}

	return { success: true, error: null };
}
