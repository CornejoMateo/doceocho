import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
	const token = req.headers.get('authorization')?.replace('Bearer ', '');
	if (!token) {
		return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
	}

	const supabase = createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.SUPABASE_SERVICE_ROLE_KEY!
	);

	const {
		data: { user },
	} = await supabase.auth.getUser(token);

	if (!user) {
		return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
	}

	const { data: profile } = await supabase
		.from('users')
		.select('username, role, name, last_name, uid_user')
		.eq('uid_user', user.id)
		.single();

	if (!profile) {
		return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
	}

	return NextResponse.json({
		data: {
			...profile,
			uid_user: user.id,
		},
	});
}
