import { getSupabaseClient } from '../supabase-client';
import { deleteBudget } from './budgets';

export type FolderBudget = {
	id: number;
	created_at: string;
	work_id?: number | null;
	client_id?: number | null;
	works?: {
		locality: string | null;
		address: string | null;
		status: string | null;
		name?: string | null;
	} | null;
};

const TABLE = 'folder_budgets';

// Dudo que usemos este metodo
export async function listFolderBudgets(): Promise<{ data: FolderBudget[] | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.select(
			`
			*,
			works:work_id (locality, address, status, name)
		`
		)
		.order('created_at', { ascending: false });
	return { data, error };
}

export async function getFolderBudgetWorkIds(): Promise<{ data: number[]; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).select('work_id').not('work_id', 'is', null);
	return { data: data?.map((f) => f.work_id as number) ?? [], error };
}

export async function getFolderBudgetById(
	id: number
): Promise<{ data: FolderBudget | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.select(
			`
			*,
			works:work_id (locality, address, status, name)
		`
		) // La informaciòn de works no deberia hacer falta a menos que la mostremos en el modal
		.eq('id', id)
		.single();
	return { data, error };
}

// Este tampoco se va a usar probablemente
export async function getFolderBudgetsByWorkId(
	workId: number
): Promise<{ data: FolderBudget[] | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.select(
			`
			*,
			works:work_id (locality, address, status, name)		`
		)
		.eq('work_id', workId)
		.order('created_at', { ascending: false });
	return { data, error };
}

export async function getFolderBudgetsByClientId(
	clientId: number
): Promise<{ data: FolderBudget[] | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.select(
			`
            *,
            works:work_id (locality, address, status, name)`
		)
		.eq('client_id', clientId)
		.order('created_at', { ascending: false });
	return { data, error };
}

export async function getFolderBudgetsByClientIds(
	clientIds: number[]
): Promise<{ data: FolderBudget[] | null; error: any }> {
	const supabase = getSupabaseClient();
	if (clientIds.length === 0) return { data: [], error: null };
	const { data, error } = await supabase
		.from(TABLE)
		.select(
			`
			*,
			works:work_id (locality, address, status, name)`
		)
		.in('client_id', clientIds)
		.order('created_at', { ascending: false });
	return { data, error };
}

export async function createFolderBudget(
	folderBudget: Omit<FolderBudget, 'id' | 'created_at'>
): Promise<{ data: FolderBudget | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).insert(folderBudget).select().single();
	return { data, error };
}

export async function updateFolderBudget(
	id: number,
	changes: Partial<Omit<FolderBudget, 'id' | 'created_at'>>
): Promise<{ data: FolderBudget | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).update(changes).eq('id', id).select().single();
	return { data, error };
}

export async function deleteFolderBudget(id: number): Promise<{ data: null; error: any }> {
	const supabase = getSupabaseClient();
	const { error } = await supabase.from(TABLE).delete().eq('id', id);
	return { data: null, error };
}

export async function deleteFolderBudgetWithBudgets(folderId: number): Promise<{ error: any }> {
	const supabase = getSupabaseClient();

	const { data: budgets, error: budgetsError } = await supabase
		.from('budgets')
		.select('id')
		.eq('folder_budget_id', folderId);

	if (budgetsError) {
		return { error: budgetsError };
	}
	const results = await Promise.all((budgets ?? []).map((budget) => deleteBudget(budget.id)));

	const failed = results.find((r) => r.error);
	if (failed) {
		return { error: failed.error };
	}

	const { error: folderError } = await supabase.from(TABLE).delete().eq('id', folderId);

	return { error: folderError };
}
