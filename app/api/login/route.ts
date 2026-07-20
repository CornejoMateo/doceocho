import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
	const { username } = await req.json();

	const adminSupabase = createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.SUPABASE_SERVICE_ROLE_KEY!
	);

	const { data: user, error } = await adminSupabase
		.from('users')
		.select('mail, username, role, name, last_name, uid_user')
		.eq('username', username)
		.single();

	if (error || !user) {
		return NextResponse.json({ error: 'Usuario o contraseña incorrectos' }, { status: 401 });
	}

	return NextResponse.json({
		data: {
			mail: user.mail,
			username: user.username,
			role: user.role,
			name: user.name,
			last_name: user.last_name,
			uid_user: user.uid_user,
		},
	});
}
