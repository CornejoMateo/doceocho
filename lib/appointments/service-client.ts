import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role client for the public booking endpoints.
 * The public page never talks to Supabase itself, so these tables need no
 * policies for the anon role: every public read is filtered down to free/busy
 * here on the server before it leaves.
 */
export function getServiceRoleClient(): SupabaseClient {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!url || !serviceRoleKey) {
		throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
	}

	return createClient(url, serviceRoleKey, {
		auth: { persistSession: false, autoRefreshToken: false },
	});
}
