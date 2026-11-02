import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { handleAuthError } from '@/helpers/users/handle-errors';
import { getServiceRoleClient } from '@/lib/get-service-role-client';
import { hasPermission, type PermissionCheck } from '@/helpers/permissions/edits';

/**
 * For API routes that use the service role key, which skips every database rule:
 * the route itself must check who is calling. Verifies the session token, then the user's
 * views and edits. Throws UNAUTHORIZED / FORBIDDEN, turned into 401 / 403 by handleAuthError.
 */
export async function requirePermission(
	req: Request,
	check: PermissionCheck = {}
): Promise<{ uid: string; role: string; supabase: SupabaseClient }> {
	const token = req.headers.get('authorization')?.replace('Bearer ', '');
	if (!token) throw new Error('UNAUTHORIZED');

	const supabase = getServiceRoleClient();

	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser(token);
	if (authError || !user) throw new Error('UNAUTHORIZED');

	const { data: profile, error } = await supabase
		.from('users')
		.select('role, views, edits')
		.eq('uid_user', user.id)
		.maybeSingle();
	if (error || !profile) throw new Error('UNAUTHORIZED');

	if (!hasPermission(profile.role, profile.views, profile.edits, check)) {
		throw new Error('FORBIDDEN');
	}

	return { uid: user.id, role: profile.role, supabase };
}

/**
 * Same check, shaped for the top of a route handler:
 *   const auth = await authorize(req, { edit: ['supplies'] });
 *   if ('response' in auth) return auth.response;
 */
export async function authorize(
	req: Request,
	check: PermissionCheck = {}
): Promise<Awaited<ReturnType<typeof requirePermission>> | { response: NextResponse }> {
	try {
		return await requirePermission(req, check);
	} catch (err) {
		const response = handleAuthError(err);
		if (response) return { response };
		console.error('[auth] Could not verify the caller:', err);
		return {
			response: NextResponse.json({ error: 'Error al verificar la sesión' }, { status: 500 }),
		};
	}
}
