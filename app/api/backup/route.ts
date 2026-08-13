import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/users/users-server';
import { getServerSupabaseClient } from '@/lib/get-server-supabase-client';

const execFileAsync = promisify(execFile);

export async function POST() {
	const user = await getCurrentUser();

	const supabase = await getServerSupabaseClient();

	if (!user) {
		return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
	}

	if (!isAdmin(user.id, supabase)) {
		return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
	}

	try {
		const { stdout } = await execFileAsync(
			'pg_dump',
			[
				'-h',
				process.env.DB_HOST!,
				'-p',
				'5432',
				'-U',
				process.env.DB_USER!,
				'-d',
				process.env.DB_NAME!,
			],
			{
				env: {
					...process.env,
					PGPASSWORD: process.env.DB_PASSWORD!,
				},
				maxBuffer: 100 * 1024 * 1024,
			}
		);

		return new NextResponse(stdout, {
			headers: {
				'Content-Type': 'application/sql',
				'Content-Disposition': 'attachment; filename="backup.sql"',
			},
		});
	} catch (error) {
		console.error('Backup error:', error);

		return NextResponse.json({ error: 'No se pudo generar el backup' }, { status: 500 });
	}
}
