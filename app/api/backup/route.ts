import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { getCurrentUser } from '@/lib/auth';

const execFileAsync = promisify(execFile);

export async function POST() {
	console.log('========== BACKUP START ==========');
	console.log('[BACKUP] POST /api/backup recibido');

	try {
		console.log('[BACKUP] Obteniendo usuario actual...');

		const user = await getCurrentUser();

		console.log('[BACKUP] Usuario obtenido:', {
			exists: !!user,
			role: user?.role,
		});

		if (!user) {
			console.warn('[BACKUP] Usuario no autenticado');

			return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
		}

		if (user.role !== 'Admin') {
			console.warn('[BACKUP] Usuario sin permisos:', {
				role: user.role,
			});

			return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
		}

		console.log('[BACKUP] Usuario autorizado como Admin');

		console.log('[BACKUP] Verificando variables de entorno:', {
			DB_HOST: !!process.env.DB_HOST,
			DB_USER: !!process.env.DB_USER,
			DB_NAME: !!process.env.DB_NAME,
			DB_PASSWORD: !!process.env.DB_PASSWORD,
		});

		console.log('[BACKUP] Ejecutando pg_dump...');

		const { stdout, stderr } = await execFileAsync(
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

		console.log('[BACKUP] pg_dump ejecutado correctamente');

		if (stderr) {
			console.warn('[BACKUP] pg_dump stderr:', stderr);
		}

		console.log('[BACKUP] Tamaño del backup:', stdout.length, 'bytes');
		console.log('========== BACKUP SUCCESS ==========');

		return new NextResponse(stdout, {
			headers: {
				'Content-Type': 'application/sql',
				'Content-Disposition': 'attachment; filename="backup.sql"',
			},
		});
	} catch (error) {
		console.error('========== BACKUP ERROR ==========');
		console.error('[BACKUP] Error completo:', error);

		if (error instanceof Error) {
			console.error('[BACKUP] Error message:', error.message);
			console.error('[BACKUP] Error stack:', error.stack);
		}

		return NextResponse.json({ error: 'No se pudo generar el backup' }, { status: 500 });
	}
}
