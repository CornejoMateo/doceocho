import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
	if (supabase) return supabase;

	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

	if (!url || !anonKey) {
		throw new Error(
			'Missing Supabase environment variables NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
		);
	}

	supabase = createBrowserClient(url, anonKey);

	// Debug: log session info
	supabase.auth.getSession().then(({ data, error }) => {
		console.log('[supabase-client] getSession result:', { data, error });
	});

	supabase.auth.getUser().then(({ data, error }) => {
		console.log('[supabase-client] getUser result:', { data, error });
	});

	return supabase;
}

export { getSupabaseClient };
