import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const suspiciousPaths = [
	'/wp-admin',
	'/wp-login.php',
	'/xmlrpc.php',
	'/phpmyadmin',
	'/.env',
	'/.git',
	'/cgi-bin',
];

const suspiciousUserAgents = /sqlmap|nikto|nmap|acunetix|masscan|zgrab|curl|wget|python/i;

export async function proxy(request: NextRequest) {
	const pathname = request.nextUrl.pathname;
	const userAgent = request.headers.get('user-agent') ?? 'unknown';

	if (
		suspiciousPaths.some((path) => pathname.startsWith(path)) ||
		suspiciousUserAgents.test(userAgent)
	) {
		console.warn('[SUSPICIOUS REQUEST]', {
			path: pathname,
			method: request.method,
			ip: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown',
			userAgent,
		});
	}

	let response = NextResponse.next({ request });

	const supabase = createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{
			cookies: {
				getAll() {
					return request.cookies.getAll();
				},
				setAll(cookiesToSet) {
					cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
					response = NextResponse.next({ request });
					cookiesToSet.forEach(({ name, value, options }) =>
						response.cookies.set(name, value, options)
					);
				},
			},
		}
	);

	await supabase.auth.getUser();
	return response;
}

export const config = {
	matcher: [
		'/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons/|.*\\.(?:js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$).*)',
	],
};
