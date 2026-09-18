import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

// This function checks if the current user is an admin. If the user is not an admin,
// it throws a 'FORBIDDEN' error. If the user is an admin,
// it returns the user and an instance of the Supabase client with admin privileges.
export async function requireCurrentUserAdmin() {
	const user = await getCurrentUser();

	const adminSupabase = createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.SUPABASE_SERVICE_ROLE_KEY!
	);

	const { data: profile, error } = await adminSupabase
		.from('users')
		.select('role')
		.eq('uid_user', user.id)
		.single();

	if (error || !profile || profile.role !== 'Admin') {
		throw new Error('FORBIDDEN');
	}

	return { user, adminSupabase };
}
