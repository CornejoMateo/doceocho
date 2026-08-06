import { deleteFolderBudgetWithBudgets } from '../budgets/folder_budgets';
import { getSupabaseClient } from '../supabase-client';
import { ChecklistItem, deleteChecklist } from '@/lib/checklists/checklists';

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
	work: Omit<Work, 'id' | 'created_at'>
): Promise<{ data: Work | null; error: any }> {
	const supabase = getSupabaseClient();
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
