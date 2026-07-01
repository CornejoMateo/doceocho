import { getSupabaseClient } from '../supabase-client';

export type ChecklistItem = {
	id: number;
	description: string;
	created_at?: string;
	done: boolean;
	checklist_id: number;
	sort_order?: number | null;
};

export type Checklist = {
	id: number;
	created_at?: string;
	work_id?: number | null;
	description?: string | null;
	progress?: number | null;
	name?: string | null;
	notes?: string | null;
	width?: number | null;
	height?: number | null;
	depth?: string | null;
	type_furniture?: string | null;
};

const TABLE = 'checklists';
const ITEMS_TABLE = 'items_checklists';

export async function listChecklists(): Promise<{ data: Checklist[] | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.select(
			'id, created_at, work_id, description, progress, name, notes, width, height, depth, type_furniture'
		)
		.order('created_at', { ascending: false });
	return { data, error };
}

export async function getChecklistById(
	id: number
): Promise<{ data: Checklist | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single();
	return { data, error };
}

export async function createChecklist(
	checklist: Omit<Checklist, 'id' | 'created_at'>
): Promise<{ data: Checklist | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).insert(checklist).select().single();
	return { data, error };
}

export async function editChecklist(
	id: number,
	changes: Partial<Checklist>
): Promise<{ data: Checklist | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).update(changes).eq('id', id).select().single();
	return { data, error };
}

export async function deleteChecklist(id: number): Promise<{ data: null; error: any }> {
	const supabase = getSupabaseClient();
	const { error } = await supabase.from(TABLE).delete().eq('id', id);
	return { data: null, error };
}

export async function getChecklistsByWorkId(
	workId: number
): Promise<{ data: Checklist[] | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.select('*')
		.eq('work_id', workId)
		.order('created_at', { ascending: true });
	return { data, error };
}

export async function getChecklistsByWorkIds(
	workIds: number[]
): Promise<{ data: Checklist[] | null; error: any }> {
	const supabase = getSupabaseClient();
	if (workIds.length === 0) return { data: [], error: null };
	const { data, error } = await supabase
		.from(TABLE)
		.select('*')
		.in('work_id', workIds)
		.order('created_at', { ascending: false });
	return { data, error };
}

// --- items_checklists CRUD ---

export async function getItemsByChecklistId(
	checklistId: number
): Promise<{ data: ChecklistItem[] | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(ITEMS_TABLE)
		.select('*')
		.eq('checklist_id', checklistId)
		.order('sort_order', { ascending: true, nullsFirst: false })
		.order('id', { ascending: true });
	return { data, error };
}

export async function getItemsByChecklistIds(
	checklistIds: number[]
): Promise<{ data: ChecklistItem[] | null; error: any }> {
	const supabase = getSupabaseClient();
	if (checklistIds.length === 0) return { data: [], error: null };
	const { data, error } = await supabase
		.from(ITEMS_TABLE)
		.select('*')
		.in('checklist_id', checklistIds)
		.order('sort_order', { ascending: true, nullsFirst: false })
		.order('id', { ascending: true });
	return { data, error };
}

export async function reorderChecklistItems(
	items: { id: number; sort_order: number }[]
): Promise<{ data: null; error: any }> {
	const supabase = getSupabaseClient();
	for (const item of items) {
		const { error } = await supabase
			.from(ITEMS_TABLE)
			.update({ sort_order: item.sort_order })
			.eq('id', item.id);
		if (error) return { data: null, error };
	}
	return { data: null, error: null };
}

export async function createChecklistItems(
	items: Pick<ChecklistItem, 'description' | 'checklist_id'>[]
): Promise<{ data: ChecklistItem[] | null; error: any }> {
	if (items.length === 0) return { data: [], error: null };
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(ITEMS_TABLE)
		.insert(
			items.map((item, idx) => ({
				description: item.description,
				checklist_id: item.checklist_id,
				done: false,
				sort_order: idx,
			}))
		)
		.select()
		.order('sort_order', { ascending: true, nullsFirst: false })
		.order('id', { ascending: true });
	return { data, error };
}

export async function updateChecklistItem(
	id: number,
	changes: Partial<Pick<ChecklistItem, 'description' | 'done'>>
): Promise<{ data: ChecklistItem | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(ITEMS_TABLE)
		.update(changes)
		.eq('id', id)
		.select()
		.single();
	return { data, error };
}

export async function deleteChecklistItem(id: number): Promise<{ data: null; error: any }> {
	const supabase = getSupabaseClient();
	const { error } = await supabase.from(ITEMS_TABLE).delete().eq('id', id);
	return { data: null, error };
}

export async function deleteChecklistItemsByChecklistId(
	checklistId: number
): Promise<{ data: null; error: any }> {
	const supabase = getSupabaseClient();
	const { error } = await supabase.from(ITEMS_TABLE).delete().eq('checklist_id', checklistId);
	return { data: null, error };
}

export async function deleteChecklistItemsByIds(
	ids: number[]
): Promise<{ data: null; error: any }> {
	if (ids.length === 0) return { data: null, error: null };
	const supabase = getSupabaseClient();
	const { error } = await supabase.from(ITEMS_TABLE).delete().in('id', ids);
	return { data: null, error };
}

export async function setAllChecklistItems(
	checklistId: number,
	done: boolean
): Promise<{ data: null; error: any }> {
	const supabase = getSupabaseClient();
	const { error } = await supabase
		.from(ITEMS_TABLE)
		.update({ done })
		.eq('checklist_id', checklistId);
	return { data: null, error };
}
