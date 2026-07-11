import { getSupabaseClient } from '@/lib/supabase-client';

export type Material = {
	id: number;
	created_at?: string;
	name: string;
};

const TABLE = 'materials';

export async function listMaterials(): Promise<{ data: Material[] | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).select('*').order('name', { ascending: true });

	return { data, error };
}

export async function getMaterialById(id: number): Promise<{ data: Material | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single();

	return { data, error };
}

export async function createMaterial(
	material: Omit<Material, 'id' | 'created_at'>
): Promise<{ data: Material | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).insert(material).select().single();

	return { data, error };
}

export async function updateMaterial(
	id: number,
	changes: Partial<Omit<Material, 'id' | 'created_at'>>
): Promise<{ data: Material | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).update(changes).eq('id', id).select().single();

	return { data, error };
}

export async function deleteMaterial(id: number): Promise<{ data: null; error: any }> {
	const supabase = getSupabaseClient();
	const { error } = await supabase.from(TABLE).delete().eq('id', id);

	return { data: null, error };
}
