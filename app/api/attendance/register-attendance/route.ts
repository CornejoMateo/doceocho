import { NextRequest, NextResponse } from 'next/server';
import {
	getAttendanceByDate,
	createAttendance,
	createAttendanceEntry,
	getLastAttendanceEntry,
} from '@/lib/attendance/attendance-server';
import { getCurrentUser } from '@/lib/auth';
import { isWithinRadius } from '@/helpers/attendance/distance';
import { verifyQRToken } from '@/lib/qr/qr-token';
import { getServerSupabaseClient } from '@/lib/get-server-supabase-client';
import { sendAttendanceCreatedNotification } from '@/actions/push/send-attendance-notification';

export async function POST(req: NextRequest) {
	try {
		const user = await getCurrentUser();
		const { token, isOvertime, latitude, longitude, radiusMeters, lat, long, username } =
			await req.json();
		const userId = user?.id;

		if (!userId) {
			return NextResponse.json(
				{
					success: false,
					message: 'Usuario inválido',
				},
				{
					status: 400,
				}
			);
		}

		if (!token || typeof token !== 'string') {
			return NextResponse.json(
				{
					success: false,
					message: 'Token inválido',
				},
				{
					status: 400,
				}
			);
		}

		try {
			await verifyQRToken(token);
		} catch (qrError) {
			console.error(qrError);

			return NextResponse.json(
				{
					success: false,
					message: 'QR inválido o expirado',
				},
				{
					status: 401,
				}
			);
		}

		if (typeof latitude !== 'number' || typeof longitude !== 'number') {
			return NextResponse.json(
				{
					success: false,
					message: 'Ubicación inválida',
				},
				{
					status: 400,
				}
			);
		}

		if (typeof radiusMeters !== 'number') {
			return NextResponse.json(
				{
					success: false,
					message: 'Radio inválido',
				},
				{
					status: 400,
				}
			);
		}

		if (typeof lat !== 'number' || typeof long !== 'number') {
			return NextResponse.json(
				{
					success: false,
					message: 'Ubicación de referencia inválida',
				},
				{
					status: 400,
				}
			);
		}

		if (!isWithinRadius(latitude, longitude, lat, long, radiusMeters)) {
			return NextResponse.json(
				{
					success: false,
					message: 'Ubicación fuera del rango permitido',
				},
				{
					status: 400,
				}
			);
		}

		const today = new Date().toISOString().split('T')[0];

		let attendance;

		const { data: existingAttendance, error: getError } = await getAttendanceByDate(today, userId);

		if (getError) {
			throw getError;
		}

		if (!existingAttendance) {
			const { data: newAttendance, error: createError } = await createAttendance(today, userId);

			if (createError) {
				throw createError;
			}

			attendance = newAttendance;
		} else {
			attendance = existingAttendance;
		}

		if (!attendance) {
			throw new Error('No se pudo crear la asistencia');
		}
		const { data: lastEntry, error: lastEntryError } = await getLastAttendanceEntry(
			attendance.id,
			isOvertime
		);

		if (lastEntryError) {
			throw lastEntryError;
		}

		const entryType = isOvertime
			? lastEntry?.type === 'overtime_in'
				? 'overtime_out'
				: 'overtime_in'
			: lastEntry?.type === 'regular_in'
				? 'regular_out'
				: 'regular_in';

		const { error: entryError } = await createAttendanceEntry({
			attendance_id: attendance.id,
			type: entryType,
			entry_time: new Date().toISOString(),
			latitude,
			longitude,
			description: null,
		});

		if (entryError) {
			throw entryError;
		}

		try {
			const supabase = await getServerSupabaseClient();
			const { after } = await import('next/server');
			after(async () => {
				try {
					await sendAttendanceCreatedNotification(supabase, username, entryType);
				} catch (error: any) {
					console.error('Failed to send client notification:', error.message);
				}
			});
		} catch (e) {
			// Notification failure must never fail the attendance registration
			console.error('Failed to schedule attendance notification:', e);
		}

		return NextResponse.json({
			success: true,
			entryType,
		});
	} catch (error) {
		console.error(error);

		return NextResponse.json(
			{
				success: false,
				message: 'No se pudo registrar el fichaje',
			},
			{
				status: 500,
			}
		);
	}
}
