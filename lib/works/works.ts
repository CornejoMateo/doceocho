import { deleteFolderBudgetWithBudgets } from '../budgets/folder_budgets';
import { getSupabaseClient } from '../supabase-client';
import { ChecklistItem, deleteChecklist } from '@/lib/checklists/checklists';
import type { SupabaseClient } from '@supabase/supabase-js';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

export type Work = {
	id: number;
	name: string | null;
	created_at?: string;
	locality?: string | null;
	address?: string | null;
	client_id?: number | null;
	client_name?: string | null;
	client_last_name?: string | null;
	status?: string | null;
	architect?: string | null;
	general_note?: string | null;
	balance_id?: string | null;
	furniture?: string | null;
	zone?: string | null;
	hood?: string | null;
	clients?: {
		name: string;
		last_name: string;
	} | null;
};

export type WorkWithProgress = Work & {
	tasks: ChecklistItem[];
	progress: number;
	hasNotes: boolean;
	hasBudget: boolean;
};

export type WorkFileItem = {
	id: number;
	uploaded_at?: string;
	path: string | null;
	title: string | null;
	description: string | null;
	type?: string | null;
	size?: number | null;
};

const TABLE = 'works';

export async function listWorks(): Promise<{ data: Work[] | null; error: any }> {
	try {
		const supabase = getSupabaseClient();

		// Hacer un JOIN con la tabla clients para obtener los nombres
		const { data, error } = await supabase
			.from('works')
			.select(
				`
					*,
					clients:client_id (name, last_name)
				`
			)
			.order('created_at', { ascending: false });

		if (error) {
			console.error('Error en la consulta de obras con JOIN:', {
				message: error.message,
				details: error.details,
			});
			return { data: null, error };
		}

		// mapping date to include client names
		const worksWithClientNames = data.map((work) => ({
			...work,
			client_name: work.clients?.name || null,
			client_last_name: work.clients?.last_name || null,
		}));

		console.log('Obras con nombres de clientes:', worksWithClientNames);
		return { data: worksWithClientNames, error: null };
	} catch (error) {
		console.error('Error inesperado en listWorks:', error);
		return {
			data: null,
			error: error instanceof Error ? error : new Error('Error desconocido'),
		};
	}
}

export async function getWorkById(id: number): Promise<{ data: Work | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.select(
			`
				*,
				clients:client_id (name, last_name)
			`
		)
		.eq('id', id)
		.single();

	if (data && data.clients) {
		data.client_name = data.clients.name;
		data.client_last_name = data.clients.last_name;
	}

	return { data, error };
}

export async function createWork(
	work: Omit<Work, 'id' | 'created_at'>,
	supabaseClient?: SupabaseClient
): Promise<{ data: Work | null; error: any }> {
	const supabase = supabaseClient ?? getSupabaseClient();
	const payload = {
		...work,
	};
	const { data, error } = await supabase.from(TABLE).insert(payload).select().single();
	return { data, error };
}

export async function updateWork(
	id: number,
	changes: Partial<Work>
): Promise<{ data: Work | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).update(changes).eq('id', id).select().single();
	return { data, error };
}

export async function deleteWork(id: number): Promise<{ data: null; error: any }> {
	const supabase = getSupabaseClient();

	const { data: checklists, error: checklistsError } = await supabase
		.from('checklists')
		.select('id')
		.eq('work_id', id);

	if (checklistsError) {
		return { data: null, error: checklistsError };
	}

	try {
		await Promise.all(
			(checklists ?? []).map(async (checklist) => {
				const { error } = await deleteChecklist(checklist.id);

				if (error) {
					throw error;
				}
			})
		);
	} catch (error) {
		return { data: null, error };
	}

	const { data: folderBudgets, error: folderBudgetsError } = await supabase
		.from('folder_budgets')
		.select('id')
		.eq('work_id', id);

	if (folderBudgetsError) {
		return { data: null, error: folderBudgetsError };
	}

	try {
		await Promise.all(
			(folderBudgets ?? []).map(async (folderBudget) => {
				const { error } = await deleteFolderBudgetWithBudgets(folderBudget.id);

				if (error) {
					throw error;
				}
			})
		);
	} catch (error) {
		return { data: null, error };
	}

	try {
		const { data: files, error: filesError } = await supabase
			.from('files_client')
			.select('id')
			.eq('work_id', id);

		if (filesError) {
			return { data: null, error: filesError };
		}

		await Promise.all(
			(files ?? []).map(async (file) => {
				const { success, error } = await deleteWorkFile(file.id);

				if (!success) {
					throw error;
				}
			})
		);
	} catch (error) {
		return { data: null, error };
	}

	const { error } = await supabase.from(TABLE).delete().eq('id', id);

	return { data: null, error };
}

export async function getWorksByClientId(
	clientId: number
): Promise<{ data: Work[] | null; error: any }> {
	try {
		console.log('Buscando obras para el cliente ID:', clientId);
		const supabase = getSupabaseClient();

		// Realizar la consulta directamente
		const { data, error } = await supabase
			.from('works')
			.select('*')
			.eq('client_id', clientId)
			.order('created_at', { ascending: false });

		if (error) {
			console.error('Error en la consulta de obras:', error);
			return { data: null, error };
		}

		return { data, error: null };
	} catch (error) {
		console.error('Error inesperado en getWorksByClientId:', {
			error,
			message: error instanceof Error ? error.message : 'Error desconocido',
		});
		return {
			data: null,
			error: error instanceof Error ? error.message : 'Error desconocido',
		};
	}
}

export async function getWorksInProgressCount(): Promise<{ data: number | null; error: any }> {
	try {
		const supabase = getSupabaseClient();
		const { count, error } = await supabase
			.from('works')
			.select('*', { count: 'exact', head: true })
			.eq('status', 'in_progress');

		if (error) {
			return { data: null, error };
		}

		return { data: count ?? 0, error: null };
	} catch (error) {
		console.error('Error inesperado en getWorksInProgressCount:', {
			error,
			message: error instanceof Error ? error.message : 'Error desconocido',
		});
		return {
			data: null,
			error: error instanceof Error ? error.message : 'Error desconocido',
		};
	}
}

export async function updateWorkGeneralNote(
	id: number,
	generalNote: string | null
): Promise<{ data: Work | null; error: any }> {
	try {
		const supabase = getSupabaseClient();
		const { data, error } = await supabase
			.from('works')
			.update({ general_note: generalNote })
			.eq('id', id)
			.select(
				`
        *,
        clients:client_id (name, last_name)
      `
			)
			.single();

		if (error) {
			console.error('Error al actualizar nota general:', error);
			return { data: null, error };
		}

		// Map client data
		if (data && data.clients) {
			data.client_name = data.clients.name;
			data.client_last_name = data.clients.last_name;
		}

		return { data, error: null };
	} catch (error) {
		console.error('Error inesperado en updateWorkGeneralNote:', {
			error,
			message: error instanceof Error ? error.message : 'Error desconocido',
		});
		return {
			data: null,
			error: error instanceof Error ? error.message : 'Error desconocido',
		};
	}
}

export async function getWorksThisWeek(): Promise<{ data: Work[] | null; error: any }> {
	const supabase = getSupabaseClient();

	const nowArgentina = toZonedTime(new Date(), 'America/Argentina/Buenos_Aires');

	const dayOfWeek = nowArgentina.getDay();
	const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

	const startOfWeekLocal = new Date(nowArgentina);
	startOfWeekLocal.setDate(nowArgentina.getDate() - diffToMonday);
	startOfWeekLocal.setHours(0, 0, 0, 0);

	const startOfWeekUTC = fromZonedTime(startOfWeekLocal, 'America/Argentina/Buenos_Aires');

	const { data, error } = await supabase
		.from(TABLE)
		.select(
			`
			*,
			clients:client_id (name, last_name)
		`
		)
		.gte('created_at', startOfWeekUTC.toISOString())
		.order('created_at', { ascending: false });

	if (error) {
		return { data: null, error };
	}

	const worksWithClientNames = data.map((work) => ({
		...work,
		client_name: work.clients?.name || null,
		client_last_name: work.clients?.last_name || null,
	}));

	return { data: worksWithClientNames, error: null };
}

export async function getFileByWorkId(
	workId: number
): Promise<{ data: WorkFileItem[] | null; error: any }> {
	const supabase = getSupabaseClient();

	try {
		if (!workId) {
			return { data: null, error: new Error('Invalid work id') };
		}

		const { data: files, error: listError } = await supabase
			.from('files_client')
			.select('*')
			.eq('work_id', workId)
			.order('id', { ascending: true });

		if (listError) {
			return { data: null, error: listError };
		}

		return { data: files ?? [], error: null };
	} catch (err) {
		console.error('Unexpected error listing work files:', err);
		return { data: null, error: err };
	}
}

export async function uploadWorkFile(
	workId: number,
	file: File,
	title?: string | null,
	description?: string | null
): Promise<{ data: WorkFileItem | null; error: any }> {
	try {
		const supabase = getSupabaseClient();

		const fileExt = file.name.split('.').pop();
		const fileName = `${crypto.randomUUID()}.${fileExt}`;
		const filePath = `${workId}/${fileName}`;

		const { error: uploadError } = await supabase.storage
			.from('works-files')
			.upload(filePath, file);

		if (uploadError) {
			return { data: null, error: uploadError };
		}

		const { data: fileRecord, error: dbError } = await supabase
			.from('files_client')
			.insert({
				path: filePath,
				work_id: workId,
				title: title || null,
				description: description || null,
				type: file.type || null,
				size: file.size,
			})
			.select()
			.single();

		if (dbError) {
			await supabase.storage.from('works-files').remove([filePath]);
			return { data: null, error: dbError };
		}

		return { data: fileRecord ?? null, error: null };
	} catch (err) {
		console.error('Unexpected error uploading work file:', err);
		return { data: null, error: err };
	}
}

export async function deleteWorkFile(fileId: number): Promise<{ success: boolean; error: any }> {
	try {
		const supabase = getSupabaseClient();

		const { data: fileRecord, error: fetchError } = await supabase
			.from('files_client')
			.select('path')
			.eq('id', fileId)
			.single();

		if (fetchError) {
			return { success: false, error: fetchError };
		}

		if (!fileRecord || !fileRecord.path) {
			return { success: false, error: 'File record not found or missing path' };
		}

		const { data: fileBlob, error: downloadError } = await supabase.storage
			.from('works-files')
			.download(fileRecord.path);

		if (downloadError) {
			return { success: false, error: downloadError };
		}

		const { error: deleteStorageError } = await supabase.storage
			.from('works-files')
			.remove([fileRecord.path]);

		if (deleteStorageError) {
			return { success: false, error: deleteStorageError };
		}

		const { error: deleteDbError } = await supabase.from('files_client').delete().eq('id', fileId);

		if (deleteDbError) {
			const { error: reuploadError } = await supabase.storage
				.from('works-files')
				.upload(fileRecord.path, fileBlob, { upsert: true });

			if (reuploadError) {
				console.error('Failed to restore file to storage after DB delete failure:', reuploadError);
				return {
					success: false,
					error: { deleteDbError, reuploadError },
				};
			}

			return { success: false, error: deleteDbError };
		}

		return { success: true, error: null };
	} catch (err) {
		console.error('Unexpected error deleting work file:', err);
		return { success: false, error: err };
	}
}
