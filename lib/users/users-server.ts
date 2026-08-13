import { getServerSupabaseClient } from '../get-server-supabase-client';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function isAdmin(userUid: string, supabase?: SupabaseClient): Promise<boolean> {
	const client = supabase ?? (await getServerSupabaseClient());

	const { data, error } = await client
		.from('users')
		.select('role')
		.eq('uid_user', userUid)
		.maybeSingle();

	if (error) {
		throw new Error('Error al verificar rol de usuario');
	}

	return data?.role === 'Admin';
}
