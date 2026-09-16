import { getSupabaseClient } from '../supabase-client';

export interface ModulesSettings {
	id: number;
	price_per_module: number | null;
}

export async function getModulesSettings(): Promise<{
	data: ModulesSettings | null;
	error: any;
}> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from('modules_settings')
		.select('*')
		.eq('id', 1)
		.maybeSingle();

	return { data, error };
}

export async function updateModulesSettings(
	settings: Partial<ModulesSettings>
): Promise<{ data: ModulesSettings | null; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from('modules_settings')
		.upsert({ ...settings, id: 1 })
		.select()
		.single();

	return { data, error };
}
