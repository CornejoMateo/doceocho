import { getSupabaseClient } from '@/lib/supabase-client';

export type ItemsPredefined = {
	id: number;
	created_at?: string;
	material_id: number;
	items: string[];
};

const TABLE = 'items_predefined';

export async function listItemsPredefined(): Promise<{
	data: ItemsPredefined[] | null;
	error: any;
}> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.select('*')
		.order('material_id', { ascending: true });

	return { data, error };
}

export async function getItemsPredefinedByMaterialId(
	materialId: number
): Promise<{ data: ItemsPredefined | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.select('*')
		.eq('material_id', materialId)
		.single();

	return { data, error };
}

export async function createItemsPredefined(
	record: Omit<ItemsPredefined, 'id' | 'created_at'>
): Promise<{ data: ItemsPredefined | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).insert(record).select().single();

	return { data, error };
}

export async function updateItemsPredefined(
	id: number,
	changes: Partial<Omit<ItemsPredefined, 'id' | 'created_at'>>
): Promise<{ data: ItemsPredefined | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).update(changes).eq('id', id).select().single();

	return { data, error };
}

export async function deleteItemsPredefined(id: number): Promise<{ data: null; error: any }> {
	const supabase = getSupabaseClient();
	const { error } = await supabase.from(TABLE).delete().eq('id', id);

	return { data: null, error };
}
