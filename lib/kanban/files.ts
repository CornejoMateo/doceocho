import { getSupabaseClient } from '@/lib/supabase-client';

export type KanbanFileRecord = {
	id: number;
	uploaded_at: string;
	path: string | null;
	kanban_card_id: number | null;
	displayName: string | null;
};

const TABLE = 'kanban_files';
const BUCKET = 'kanban';

function toRecord(raw: Record<string, unknown>): KanbanFileRecord {
	return {
		id: raw.id as number,
		uploaded_at: raw.uploaded_at as string,
		path: raw.path as string | null,
		kanban_card_id: raw.kanban_card_id as number | null,
		displayName: (raw.display_name as string | null) || null,
	};
}

export async function getKanbanFileByCardId(
	kanbanCardId: number
): Promise<{ data: KanbanFileRecord[] | null; error: any }> {
	const supabase = getSupabaseClient();

	try {
		if (!kanbanCardId) {
			return { data: [], error: 'Error getting kanban card id' };
		}

		const { data: files, error: listError } = await supabase
			.from(TABLE)
			.select('*')
			.eq('kanban_card_id', kanbanCardId);

		if (listError) {
			return { data: null, error: listError };
		}

		return { data: (files ?? []).map(toRecord), error: null };
	} catch (err) {
		console.error('Unexpected error listing kanban card files:', err);
		return { data: null, error: err };
	}
}

export async function uploadKanbanFile(
	kanbanCardId: number,
	file: File,
	displayName?: string | null
): Promise<{ data: KanbanFileRecord | null; error: any }> {
	const supabase = getSupabaseClient();

	const fileExt = file.name.split('.').pop();
	const fileName = `${crypto.randomUUID()}.${fileExt}`;
	const filePath = `${kanbanCardId}/${fileName}`;

	const { error: uploadError } = await supabase.storage.from(BUCKET).upload(filePath, file);

	if (uploadError) {
		return { data: null, error: uploadError };
	}

	const { data: fileRecord, error: dbError } = await supabase
		.from(TABLE)
		.insert({
			path: filePath,
			kanban_card_id: kanbanCardId,
			display_name: displayName || null,
		})
		.select()
		.single();

	if (dbError) {
		return { data: null, error: dbError };
	}

	return { data: fileRecord ? toRecord(fileRecord) : null, error: null };
}

export async function deleteKanbanFile(fileId: number): Promise<{ success: boolean; error: any }> {
	const supabase = getSupabaseClient();

	const { data: fileRecord, error: fetchError } = await supabase
		.from(TABLE)
		.select('path')
		.eq('id', fileId)
		.single();

	if (fetchError) {
		return { success: false, error: fetchError };
	}

	if (!fileRecord || !fileRecord.path) {
		return { success: false, error: 'File record not found or missing path' };
	}

	const { error: deleteStorageError } = await supabase.storage
		.from(BUCKET)
		.remove([fileRecord.path]);

	if (deleteStorageError) {
		return { success: false, error: deleteStorageError };
	}

	const { error: deleteDbError } = await supabase.from(TABLE).delete().eq('id', fileId);

	if (deleteDbError) {
		return { success: false, error: deleteDbError };
	}

	return { success: true, error: null };
}
