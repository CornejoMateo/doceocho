import { getSupabaseClient } from '../supabase-client';
import type { Attachment } from '@/components/business/kanban/types';

const TABLE = 'kanban_attachments';
const STORAGE_BUCKET = 'kanban';

export async function getAttachmentsByCardId(
	cardId: number
): Promise<{ data: Attachment[] | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.select('*')
		.eq('card_id', cardId)
		.order('created_at', { ascending: true });
	return { data, error };
}

export async function getAttachmentById(
	id: number
): Promise<{ data: Attachment | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single();
	return { data, error };
}

export async function uploadAttachment(
	file: File,
	cardId: number
): Promise<{ data: Attachment | null; error: any }> {
	const supabase = getSupabaseClient();

	// Generate unique filename
	const timestamp = Date.now();
	const randomString = Math.random().toString(36).substring(2, 8);
	const fileName = `${timestamp}_${randomString}_${file.name}`;
	const filePath = `cards/${cardId}/${fileName}`;

	// Upload file to storage
	const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(filePath, file);

	if (uploadError) {
		return { data: null, error: uploadError };
	}

	// Get public URL
	const {
		data: { publicUrl },
	} = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);

	// Create attachment record
	const payload = {
		card_id: cardId,
		file_name: file.name,
		file_url: publicUrl,
		file_size: file.size,
		file_type: file.type,
		storage_path: filePath,
	};

	const { data, error } = await supabase.from(TABLE).insert(payload).select().single();

	return { data, error };
}

export async function deleteAttachment(id: number): Promise<{ data: null; error: any }> {
	const supabase = getSupabaseClient();

	// Get attachment to delete file from storage
	const { data: attachment } = await getAttachmentById(id);

	if (attachment?.storage_path) {
		// Delete file from storage
		await supabase.storage.from(STORAGE_BUCKET).remove([attachment.storage_path]);
	}

	// Delete attachment record
	const { error } = await supabase.from(TABLE).delete().eq('id', id);
	return { data: null, error };
}
