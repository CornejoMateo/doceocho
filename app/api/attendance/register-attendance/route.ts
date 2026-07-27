import { NextRequest, NextResponse } from 'next/server';
import {
	getAttendanceByDate,
	createAttendance,
	createAttendanceEntry,
	getLastAttendanceEntry,
} from '@/lib/attendance/attendance-server';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
	try {
		const user = await getCurrentUser();
		const { isOvertime, latitude, longitude } = await req.json();

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
		});

		if (entryError) {
			throw entryError;
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
