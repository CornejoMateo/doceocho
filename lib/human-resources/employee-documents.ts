import { getSupabaseClient } from '@/lib/supabase-client';
import { EMPLOYEE_DOCUMENTS_BUCKET } from '@/constants/human-resources/employees';

const TABLE = 'employee_documents';

export type EmployeeDocument = {
	id: number;
	uploaded_at: string;
	employee_id: number;
	path: string;
	title: string | null;
	description: string | null;
	type: string | null;
	size: number | null;
};

export async function listEmployeeDocuments(
	employeeId: number
): Promise<{ data: EmployeeDocument[] | null; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from(TABLE)
		.select('*')
		.eq('employee_id', employeeId)
		.order('uploaded_at', { ascending: false });

	if (error) {
		return { data: null, error };
	}

	return { data: data ?? [], error: null };
}

export async function uploadEmployeeDocument(
	employeeId: number,
	file: File,
	title?: string | null,
	description?: string | null
): Promise<{ data: EmployeeDocument | null; error: any }> {
	const supabase = getSupabaseClient();

	const fileExtension = file.name.split('.').pop();
	const fileName = `${crypto.randomUUID()}.${fileExtension}`;
	const filePath = `${employeeId}/${fileName}`;

	const { error: uploadError } = await supabase.storage
		.from(EMPLOYEE_DOCUMENTS_BUCKET)
		.upload(filePath, file);

	if (uploadError) {
		return { data: null, error: uploadError };
	}

	const { data: documentRecord, error: dbError } = await supabase
		.from(TABLE)
		.insert({
			employee_id: employeeId,
			path: filePath,
			title: title || null,
			description: description || null,
			type: file.type || null,
			size: file.size,
		})
		.select()
		.single();

	if (dbError) {
		await supabase.storage.from(EMPLOYEE_DOCUMENTS_BUCKET).remove([filePath]);
		return { data: null, error: dbError };
	}

	return { data: documentRecord, error: null };
}

export async function deleteEmployeeDocument(documentId: number): Promise<{ error: any }> {
	const supabase = getSupabaseClient();

	const { data: document, error: fetchError } = await supabase
		.from(TABLE)
		.select('path')
		.eq('id', documentId)
		.single();

	if (fetchError) {
		return { error: fetchError };
	}

	const { error: deleteError } = await supabase.from(TABLE).delete().eq('id', documentId);

	if (deleteError) {
		return { error: deleteError };
	}

	if (document?.path) {
		const { error: storageError } = await deleteEmployeeDocumentFiles([document.path]);

		// The record is already gone, a leftover file should not surface as an error.
		if (storageError) {
			console.error('Document deleted from DB but storage cleanup failed:', storageError);
		}
	}

	return { error: null };
}

export async function deleteEmployeeDocumentFiles(paths: string[]): Promise<{ error: any }> {
	const supabase = getSupabaseClient();

	const { error } = await supabase.storage.from(EMPLOYEE_DOCUMENTS_BUCKET).remove(paths);

	return { error };
}

export async function getEmployeeDocumentUrl(path: string): Promise<string | null> {
	const supabase = getSupabaseClient();

	const { data } = await supabase.storage
		.from(EMPLOYEE_DOCUMENTS_BUCKET)
		.createSignedUrl(path, 60 * 60);

	return data?.signedUrl ?? null;
}
