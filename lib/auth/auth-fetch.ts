import { getSupabaseClient } from '@/lib/supabase-client';

/**
 * fetch() for the app's own API routes: sends the session token so the route can check
 * who is calling. Leaves the body and its content type as they are (JSON or FormData).
 */
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
	const {
		data: { session },
	} = await getSupabaseClient().auth.getSession();

	const headers = new Headers(init.headers);
	if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`);

	return fetch(input, { ...init, headers });
}
