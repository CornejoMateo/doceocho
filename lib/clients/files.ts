import { getSupabaseClient } from '../supabase-client';

const TABLE = 'files_client';
const BUCKET = 'clients';

export type ClientFileRecord = {
	id: number;
	uploaded_at: string;
	client_id: number | null;
	path: string | null;
	title: string | null;
	description: string | null;
	claim_id: string | null;
};

// get all client files
export async function listClientFiles(
	clientId: number
): Promise<{ data: ClientFileRecord[] | null; error: any }> {
	const supabase = getSupabaseClient();

	try {
		if (!clientId) {
			return { data: [], error: 'Error getting client id:' };
		}

		const { data: files, error: listError } = await supabase
			.from(TABLE)
			.select('*')
			.eq('client_id', clientId);

		if (listError) {
			return { data: null, error: listError };
		}

		return { data: files, error: null };
	} catch (err) {
		console.error('Unexpected error listing client files:', err);
		return { data: null, error: err };
	}
}

// get files by claim_id
export async function getClientFilesByClaim(
	claimId: number
): Promise<{ data: ClientFileRecord[] | null; error: any }> {
	const supabase = getSupabaseClient();

	try {
		if (!claimId) {
			return { data: [], error: 'Error getting claim id:' };
		}

		const { data: files, error: listError } = await supabase
			.from(TABLE)
			.select('*')
			.eq('claim_id', claimId);

		if (listError) {
			return { data: null, error: listError };
		}

		return { data: files, error: null };
	} catch (err) {
		console.error('Unexpected error listing client files by claim:', err);
		return { data: null, error: err };
	}
}

// get files by checklist_id
export async function getClientFilesByChecklist(
	checklistId: number
): Promise<{ data: ClientFileRecord[] | null; error: any }> {
	const supabase = getSupabaseClient();

	try {
		if (!checklistId) {
			return { data: [], error: 'Error getting checklist id:' };
		}

		const { data: files, error: listError } = await supabase
			.from(TABLE)
			.select('*')
			.eq('checklist_id', checklistId);

		if (listError) {
			return { data: null, error: listError };
		}

		return { data: files, error: null };
	} catch (err) {
		console.error('Unexpected error listing client files by checklist:', err);
		return { data: null, error: err };
	}
}

// upload a file for a client
export async function uploadClientFile(
	clientId: number,
	file: File,
	title: string | null = null,
	description: string | null = null,
	claimId: number | null = null
): Promise<{ data: ClientFileRecord | null; error: any }> {
	const supabase = getSupabaseClient();
	const fileExt = file.name.split('.').pop();
	const fileName = `${crypto.randomUUID()}.${fileExt}`;
	const filePath = `${clientId}/${fileName}`;

	const { error: uploadError } = await supabase.storage.from(BUCKET).upload(filePath, file);

	if (uploadError) {
		return { data: null, error: uploadError };
	}

	const { data: fileRecord, error: dbError } = await supabase
		.from(TABLE)
		.insert({
			client_id: clientId,
			title,
			description,
			path: filePath,
			claim_id: claimId,
		})
		.select()
		.single();

	if (dbError) {
		return { data: null, error: dbError };
	}

	return { data: fileRecord, error: null };
}

// delete a client file
export async function deleteClientFile(fileId: number): Promise<{ success: boolean; error: any }> {
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

	const { error: deleteDbError } = await supabase.from(TABLE).delete().eq('id', fileId);

	if (deleteDbError) {
		return { success: false, error: deleteDbError };
	}

	const { error: deleteStorageError } = await supabase.storage
		.from(BUCKET)
		.remove([fileRecord.path]);

	if (deleteStorageError) {
		console.error('File deleted from DB but storage cleanup failed:', deleteStorageError);
	}

	return { success: true, error: null };
}
