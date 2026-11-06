import { getSupabaseClient } from '@/lib/supabase-client';
import { CLIENT_FILE_TYPES, validateFileForUpload } from '@/utils/file-upload-utils';
import type { ChannelFile } from '@/lib/chat/chat-types';

const TABLE = 'channel_files';
const BUCKET = 'chat-files';
const PAGE_SIZE = 20;
const MAX_CHANNEL_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const SIGNED_URL_EXPIRY_SECONDS = 60;
const VIEW_URL_EXPIRY_SECONDS = 300;

export type ChannelFilesCursor = { createdAt: string; id: number };

export type ChannelFilesPage = {
	files: ChannelFile[];
	hasMore: boolean;
	nextCursor: ChannelFilesCursor | null;
};

// Keeps storage paths filesystem/URL safe while staying readable.
function sanitizeFileName(name: string): string {
	return name.trim().replace(/[^a-zA-Z0-9.\-_]/g, '_');
}

export async function listChannelFiles(
	channelId: number,
	cursor?: ChannelFilesCursor | null
): Promise<{ data: ChannelFilesPage | null; error: any }> {
	const supabase = getSupabaseClient();

	let query = supabase
		.from(TABLE)
		.select('*')
		.eq('channel_id', channelId)
		.order('created_at', { ascending: false })
		.order('id', { ascending: false })
		.limit(PAGE_SIZE);

	if (cursor) {
		query = query.or(
			`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`
		);
	}

	const { data, error } = await query;
	if (error) return { data: null, error };

	const files = (data ?? []) as ChannelFile[];
	const last = files[files.length - 1];

	return {
		data: {
			files,
			hasMore: files.length === PAGE_SIZE,
			nextCursor: last ? { createdAt: last.created_at, id: last.id } : null,
		},
		error: null,
	};
}

export async function uploadChannelFile(
	channelId: number,
	file: File,
	uploadedBy: string
): Promise<{ data: ChannelFile | null; error: any }> {
	const validation = validateFileForUpload(file, CLIENT_FILE_TYPES, MAX_CHANNEL_FILE_SIZE);
	if (!validation.isValid) {
		return { data: null, error: validation.error };
	}

	const supabase = getSupabaseClient();
	const storagePath = `${channelId}/${uploadedBy}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;

	const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, file);

	if (uploadError) {
		return { data: null, error: uploadError };
	}

	const { data: fileRecord, error: dbError } = await supabase
		.from(TABLE)
		.insert({
			channel_id: channelId,
			uploaded_by: uploadedBy,
			file_name: file.name,
			storage_path: storagePath,
			mime_type: file.type || null,
			size_bytes: file.size,
		})
		.select()
		.single();

	if (dbError || !fileRecord) {
		// Roll back the blob so we don't leave an orphaned storage object.
		await supabase.storage.from(BUCKET).remove([storagePath]);
		return { data: null, error: dbError };
	}

	return { data: fileRecord as ChannelFile, error: null };
}

export async function deleteChannelFile(
	file: Pick<ChannelFile, 'id' | 'storage_path'>
): Promise<{ success: boolean; error: any }> {
	const supabase = getSupabaseClient();

	// DB row is the source of truth: delete it first, then best-effort clean up the blob.
	const { error: deleteError } = await supabase.from(TABLE).delete().eq('id', file.id);
	if (deleteError) {
		return { success: false, error: deleteError };
	}

	// Non-fatal: an orphaned blob doesn't affect correctness, only storage usage.
	const { error: removeError } = await supabase.storage.from(BUCKET).remove([file.storage_path]);
	if (removeError) {
		console.error('Failed to remove channel file blob:', removeError);
	}

	return { success: true, error: null };
}

export async function getChannelFileSignedUrl(
	storagePath: string,
	fileName: string
): Promise<{ url: string | null; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase.storage
		.from(BUCKET)
		.createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS, { download: fileName });

	if (error || !data) {
		return { url: null, error };
	}

	return { url: data.signedUrl, error: null };
}

// Inline (non-download) signed URL for in-app image/video preview.
export async function getChannelFileViewUrl(
	storagePath: string
): Promise<{ url: string | null; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase.storage
		.from(BUCKET)
		.createSignedUrl(storagePath, VIEW_URL_EXPIRY_SECONDS);

	if (error || !data) {
		return { url: null, error };
	}

	return { url: data.signedUrl, error: null };
}
