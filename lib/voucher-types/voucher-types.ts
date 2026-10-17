import { getSupabaseClient } from '../supabase-client';

export type VoucherType = {
	id: number;
	created_at: string;
	name: string;
	is_active: boolean;
};

export type VoucherTypeInput = { name: string };

const TABLE = 'voucher_types';

export async function listVoucherTypes(): Promise<{ data: VoucherType[] | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).select('*').order('name', { ascending: true });
	return { data, error };
}

export async function createVoucherType(
	input: VoucherTypeInput
): Promise<{ data: VoucherType | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.insert({ name: input.name.trim() })
		.select()
		.single();
	return { data, error };
}

export async function updateVoucherType(
	id: number,
	updates: VoucherTypeInput
): Promise<{ data: VoucherType | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.update({ name: updates.name.trim() })
		.eq('id', id)
		.select()
		.single();
	return { data, error };
}

export async function deactivateVoucherType(
	id: number
): Promise<{ data: VoucherType | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.update({ is_active: false })
		.eq('id', id)
		.select()
		.single();
	return { data, error };
}

export async function reactivateVoucherType(
	id: number
): Promise<{ data: VoucherType | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.update({ is_active: true })
		.eq('id', id)
		.select()
		.single();
	return { data, error };
}
