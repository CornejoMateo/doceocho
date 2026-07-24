import { getServerSupabaseClient } from '@/lib/get-server-supabase-client';

export async function getCurrentUser() {
	const supabase = await getServerSupabaseClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		throw new Error('No autenticado');
	}

	return user;
}
