import { createClient } from '@supabase/supabase-js';

export async function requireAdminForKanban(token?: string) {
	if (!token) {
		throw new Error('UNAUTHORIZED');
	}

	const supabase = createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
	);

	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser(token);

	if (authError || !user) {
		throw new Error('UNAUTHORIZED');
	}

	const adminSupabase = createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.SUPABASE_SERVICE_ROLE_KEY!
	);

	const { data: profile, error } = await adminSupabase
		.from('users')
		.select('role')
		.eq('uid_user', user.id)
		.single();

	if (error || !profile) {
		throw new Error('UNAUTHORIZED');
	}

	if (profile.role !== 'Admin') {
		throw new Error('FORBIDDEN');
	}

	return user;
}
