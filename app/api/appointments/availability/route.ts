import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/appointments/service-client';
import {
	AvailabilitySettings,
	getBookableDates,
	getSlotsForDate,
} from '@/helpers/appointments/availability';

export const dynamic = 'force-dynamic';

/**
 * Public availability. Returns only which slots are free or taken:
 * no names, no emails, no notes, nothing about who booked what.
 */
export async function GET(req: NextRequest) {
	try {
		const supabase = getServiceRoleClient();

		const { data: settings, error: settingsError } = await supabase
			.from('appointment_settings')
			.select('*')
			.eq('id', 1)
			.maybeSingle();

		if (settingsError || !settings) {
			return NextResponse.json({ error: 'No hay configuración de citas' }, { status: 503 });
		}

		if (!settings.is_public_enabled) {
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

		const bookableDates = getBookableDates(availability);

		if (bookableDates.length === 0) {
			return NextResponse.json({
				days: [],
				slotDurationMinutes: availability.slot_duration_minutes,
			});
		}

		const firstDate = bookableDates[0];
		const lastDate = bookableDates[bookableDates.length - 1];

		const [{ data: taken }, { data: blocked }] = await Promise.all([
			supabase
				.from('appointments')
				.select('date, start_time, status')
				.gte('date', firstDate)
				.lte('date', lastDate),
			supabase
				.from('appointment_blocked_dates')
				.select('date')
				.gte('date', firstDate)
				.lte('date', lastDate),
		]);

		const blockedDates = (blocked ?? []).map((entry) => entry.date);

		const requestedDate = req.nextUrl.searchParams.get('date');
		const dates = requestedDate
			? bookableDates.filter((date) => date === requestedDate)
			: bookableDates;

		const days = dates
			.map((date) => ({
				date,
				slots: getSlotsForDate(date, availability, taken ?? [], blockedDates),
			}))
			.filter((day) => day.slots.length > 0);

		return NextResponse.json({
			days,
			slotDurationMinutes: availability.slot_duration_minutes,
		});
	} catch (error: any) {
		console.error('[appointments] Failed to build availability:', error);

		return NextResponse.json({ error: 'Error al obtener la disponibilidad' }, { status: 500 });
	}
}
