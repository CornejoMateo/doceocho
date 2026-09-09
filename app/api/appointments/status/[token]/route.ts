import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/appointments/service-client';
import { normalizeTime } from '@/helpers/appointments/availability';

export const dynamic = 'force-dynamic';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Lets a client check their own request. Only their row, only what they need. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
	try {
		const { token } = await params;

		if (!UUID_REGEX.test(token)) {
			return NextResponse.json({ error: 'Código inválido' }, { status: 400 });
		}

		const supabase = getServiceRoleClient();

		const { data: appointment, error } = await supabase
			.from('appointments')
			.select('client_name, date, start_time, end_time, notes, status, admin_notes')
			.eq('public_token', token)
			.maybeSingle();

		if (error || !appointment) {
			return NextResponse.json({ error: 'No encontramos esa cita' }, { status: 404 });
		}

		return NextResponse.json({
			clientName: appointment.client_name,
			date: appointment.date,
			startTime: normalizeTime(appointment.start_time),
			endTime: normalizeTime(appointment.end_time),
			notes: appointment.notes,
			status: appointment.status,
			adminNotes: appointment.admin_notes,
		});
	} catch (error: any) {
		console.error('[appointments] Failed to read status:', error);

		return NextResponse.json({ error: 'Error al consultar la cita' }, { status: 500 });
	}
}
