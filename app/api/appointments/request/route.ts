import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/appointments/service-client';
import {
	AvailabilitySettings,
	getSlotsForDate,
	normalizeTime,
} from '@/helpers/appointments/availability';
import { sendAppointmentRequestedNotification } from '@/lib/push/send-appointment-notification';

export const dynamic = 'force-dynamic';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME_LENGTH = 120;
const MAX_NOTES_LENGTH = 1000;

type RequestBody = {
	clientName?: string;
	clientEmail?: string;
	clientPhone?: string;
	date?: string;
	startTime?: string;
	notes?: string;
};

export async function POST(req: NextRequest) {
	try {
		const body = (await req.json()) as RequestBody;

		const clientName = body.clientName?.trim() ?? '';
		const clientEmail = body.clientEmail?.trim().toLowerCase() ?? '';
		const clientPhone = body.clientPhone?.trim() || null;
		const notes = body.notes?.trim() || null;
		const date = body.date ?? '';
		const startTime = body.startTime ? normalizeTime(body.startTime) : '';

		if (!clientName || !clientEmail || !date || !startTime) {
			return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 });
		}

		if (!EMAIL_REGEX.test(clientEmail)) {
			return NextResponse.json({ error: 'El email no es válido' }, { status: 400 });
		}

		if (clientName.length > MAX_NAME_LENGTH || (notes && notes.length > MAX_NOTES_LENGTH)) {
			return NextResponse.json(
				{ error: 'Los datos enviados son demasiado largos' },
				{ status: 400 }
			);
		}

		const supabase = getServiceRoleClient();

		const { data: settings } = await supabase
			.from('appointment_settings')
			.select('*')
			.eq('id', 1)
			.maybeSingle();

		if (!settings || !settings.is_public_enabled) {
			return NextResponse.json(
				{ error: 'La solicitud de citas está deshabilitada' },
				{ status: 503 }
			);
		}

		const availability: AvailabilitySettings = {
			weekly_schedule: settings.weekly_schedule ?? [],
			slot_duration_minutes: settings.slot_duration_minutes,
			min_notice_hours: settings.min_notice_hours,
			max_days_ahead: settings.max_days_ahead,
		};

		const [{ data: taken }, { data: blocked }] = await Promise.all([
			supabase.from('appointments').select('date, start_time, status').eq('date', date),
			supabase.from('appointment_blocked_dates').select('date').eq('date', date),
		]);

		// The slot is re-validated here: never trust what the browser sent.
		const slot = getSlotsForDate(
			date,
			availability,
			taken ?? [],
			(blocked ?? []).map((entry) => entry.date)
		).find((candidate) => candidate.start === startTime);

		if (!slot) {
			return NextResponse.json({ error: 'Ese horario ya no está disponible' }, { status: 409 });
		}

		if (!slot.available) {
			return NextResponse.json({ error: 'Ese horario ya fue reservado' }, { status: 409 });
		}

		const { data: appointment, error } = await supabase
			.from('appointments')
			.insert({
				client_name: clientName,
				client_email: clientEmail,
				client_phone: clientPhone,
				date,
				start_time: slot.start,
				end_time: slot.end,
				notes,
				status: 'Pendiente',
			})
			.select('id, public_token, date, start_time, end_time')
			.single();

		if (error) {
			// The partial unique index rejects a slot taken between the check and the insert.
			if (error.code === '23505') {
				return NextResponse.json({ error: 'Ese horario ya fue reservado' }, { status: 409 });
			}

			console.error('[appointments] Failed to create request:', error);
			return NextResponse.json({ error: 'No se pudo registrar la cita' }, { status: 500 });
		}

		// A failed push must not lose the appointment that is already saved.
		try {
			await sendAppointmentRequestedNotification(supabase, clientName, date, slot.start);
		} catch (pushError) {
			console.error('[appointments] Failed to notify admins:', pushError);
		}

		return NextResponse.json({
			success: true,
			token: appointment.public_token,
			date: appointment.date,
			startTime: normalizeTime(appointment.start_time),
			endTime: normalizeTime(appointment.end_time),
		});
	} catch (error: any) {
		console.error('[appointments] Failed to handle request:', error);

		return NextResponse.json({ error: 'Error al registrar la cita' }, { status: 500 });
	}
}
