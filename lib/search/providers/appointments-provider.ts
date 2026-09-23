import { CalendarClock } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase-client';
import { buildIlikePattern } from '@/helpers/search/match';
import { formatCreatedAt } from '@/utils/format-date';
import { RESULTS_PER_PROVIDER } from '@/constants/search/search';
import type { SearchProvider, SearchResult } from '@/lib/search/types';

type AppointmentRow = {
	id: number;
	client_name: string;
	client_email: string;
	date: string;
	start_time: string;
	status: string;
};

function toResult(appointment: AppointmentRow): SearchResult {
	const schedule = `${formatCreatedAt(appointment.date)} ${appointment.start_time.slice(0, 5)}`;

	return {
		id: `appointments:${appointment.id}`,
		title: appointment.client_name,
		subtitle: `${schedule} · ${appointment.status}`,
		icon: CalendarClock,
		// Appointments are reviewed from the Citas tab of the calendar.
		href: '/calendar',
		keywords: [appointment.client_email],
	};
}

export const appointmentsProvider: SearchProvider = {
	id: 'appointments',
	label: 'Citas',
	// Matches the table's own RLS, which is admin only.
	roles: ['Admin'],
	order: 7,
	async search(term, signal) {
		const supabase = getSupabaseClient();
		const pattern = buildIlikePattern(term);

		const { data, error } = await supabase
			.from('appointments')
			.select('id, client_name, client_email, date, start_time, status')
			.or(`client_name.ilike.${pattern},client_email.ilike.${pattern}`)
			.order('date', { ascending: false })
			.limit(RESULTS_PER_PROVIDER)
			.abortSignal(signal);

		if (error) throw error;

		return (data ?? []).map(toResult);
	},
};
