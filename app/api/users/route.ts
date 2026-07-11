import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { handleAuthError } from '@/helpers/users/handle-errors';
import { requireAdmin } from '@/helpers/users/auth-admin';

export async function POST(req: Request) {
	try {
		const token = req.headers.get('authorization')?.replace('Bearer ', '');
		await requireAdmin(token);

		const { username, password, role, name, last_name } = await req.json();

		if (!username || !password || !role) {
			return NextResponse.json(
				{ error: 'Faltan campos requeridos: username, password, role' },
				{ status: 400 }
			);
		}

		const supabase = createClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			process.env.SUPABASE_SERVICE_ROLE_KEY!
		);

		const email = `${username}@gmail.com`;

		const { data: authData, error: authError } = await supabase.auth.admin.createUser({
			email,
			password,
			email_confirm: true,
		});

		if (authError) {
			return NextResponse.json({ error: authError.message }, { status: 400 });
		}

		const { error: dbError } = await supabase.from('users').insert({
			uid_user: authData.user.id,
			username,
			role,
			mail: email,
			name,
			last_name,
		});

		if (dbError) {
			await supabase.auth.admin.deleteUser(authData.user.id);
			return NextResponse.json({ error: dbError.message }, { status: 400 });
		}

		return NextResponse.json({ success: true });
	} catch (err: any) {
		const authError = handleAuthError(err);
		if (authError) {
			return authError;
		}
		return NextResponse.json(
			{ error: err.message || 'Error interno del servidor' },
			{ status: 500 }
		);
	}
}

export async function GET(req: Request) {
	try {
		const token = req.headers.get('authorization')?.replace('Bearer ', '');
		await requireAdmin(token);

		const supabase = createClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			process.env.SUPABASE_SERVICE_ROLE_KEY!
		);

		const { searchParams } = new URL(req.url);
		const uid = searchParams.get('uid');

		if (uid) {
			const { data, error } = await supabase
				.from('users')
				.select('*')
				.eq('uid_user', uid)
				.maybeSingle();

			if (error) {
				return NextResponse.json({ error: 'Error al obtener usuario' }, { status: 500 });
			}

			return NextResponse.json({ data });
		}

		const { data, error } = await supabase.from('users').select('*').order('username');

		if (error) {
			return NextResponse.json({ error: 'Error al listar usuarios' }, { status: 500 });
		}

		return NextResponse.json({ data });
	} catch (err: any) {
		const authError = handleAuthError(err);
		if (authError) return authError;
		return NextResponse.json(
			{ error: err.message || 'Error interno del servidor' },
			{ status: 500 }
		);
	}
}

export async function PUT(req: Request) {
	try {
		const token = req.headers.get('authorization')?.replace('Bearer ', '');
		await requireAdmin(token);

		const body = await req.json();
		const { uid_user, password, username, role, name, last_name } = body;

		if (!uid_user) {
			return NextResponse.json({ error: 'Falta uid_user' }, { status: 400 });
		}

		const supabase = createClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			process.env.SUPABASE_SERVICE_ROLE_KEY!
		);

		if (password) {
			const { error: authError } = await supabase.auth.admin.updateUserById(uid_user, {
				password,
			});

			if (authError) {
				return NextResponse.json({ error: authError.message }, { status: 400 });
			}
		}

		const dbUpdates: Record<string, any> = {};
		if (username !== undefined) dbUpdates.username = username;
		if (role !== undefined) dbUpdates.role = role;
		if (name !== undefined) dbUpdates.name = name;
		if (last_name !== undefined) dbUpdates.last_name = last_name;

		if (Object.keys(dbUpdates).length > 0) {
			const { data, error: dbError } = await supabase
				.from('users')
				.update(dbUpdates)
				.eq('uid_user', uid_user)
				.select()
				.single();

			if (dbError) {
				return NextResponse.json({ error: dbError.message }, { status: 400 });
			}

			return NextResponse.json({ data });
		}

		return NextResponse.json({ success: true });
	} catch (err: any) {
		const authError = handleAuthError(err);
		if (authError) return authError;
		return NextResponse.json(
			{ error: err.message || 'Error interno del servidor' },
			{ status: 500 }
		);
	}
}

export async function DELETE(req: Request) {
	try {
		const token = req.headers.get('authorization')?.replace('Bearer ', '');
		await requireAdmin(token);

		const { uid_user } = await req.json();

		if (!uid_user) {
			return NextResponse.json({ error: 'Falta uid_user' }, { status: 400 });
		}

		const supabase = createClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			process.env.SUPABASE_SERVICE_ROLE_KEY!
		);

		const { error: authError } = await supabase.auth.admin.deleteUser(uid_user);

		if (authError) {
			return NextResponse.json({ error: authError.message }, { status: 400 });
		}

		return NextResponse.json({ success: true });
	} catch (err: any) {
		const authError = handleAuthError(err);
		if (authError) {
			return authError;
		}
		return NextResponse.json(
			{ error: err.message || 'Error interno del servidor' },
			{ status: 500 }
		);
	}
}
