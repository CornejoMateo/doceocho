import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getServerSupabaseClient } from '@/lib/get-server-supabase-client';
import { getUserByUid } from '@/lib/users/users';
import { sendAppointmentEmail } from '@/lib/appointments/send-appointment-email';
import { normalizeTime } from '@/helpers/appointments/availability';

export const dynamic = 'force-dynamic';

function buildStatusUrl(req: NextRequest, token: string): string {
	const origin = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;

	return `${origin}/citas/estado/${token}`;
}

/** Emails the client once an admin accepted or rejected their appointment. */
export async function POST(req: NextRequest) {
	try {
		const user = await getCurrentUser();
		const { appointmentId } = (await req.json()) as { appointmentId?: number };

		if (!appointmentId) {
			return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
		}

		const supabase = await getServerSupabaseClient();
		const { data: reviewer } = await getUserByUid(user.id, supabase);

		if (reviewer?.role !== 'Admin') {
			return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
		}

		const { data: appointment, error } = await supabase
			.from('appointments')
			.select('*')
			.eq('id', appointmentId)
			.maybeSingle();

		if (error || !appointment) {
			return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
		}

		if (appointment.status !== 'Aceptada' && appointment.status !== 'Rechazada') {
			return NextResponse.json({ error: 'La cita sigue pendiente' }, { status: 400 });
		}

		const result = await sendAppointmentEmail({
			to: appointment.client_email,
			clientName: appointment.client_name,
			date: appointment.date,
			startTime: normalizeTime(appointment.start_time),
			endTime: normalizeTime(appointment.end_time),
			status: appointment.status,
			adminNotes: appointment.admin_notes,
			statusUrl: buildStatusUrl(req, appointment.public_token),
		});

		return NextResponse.json({ success: result.success, error: result.error });
	} catch (error: any) {
		console.error('[appointments] Failed to notify client:', error);

		return NextResponse.json({ error: 'Error al notificar al cliente' }, { status: 500 });
	}
}
