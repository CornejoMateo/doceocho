import { Calendar } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase-client';
import { buildIlikePattern } from '@/helpers/search/match';
import { formatCreatedAt } from '@/utils/format-date';
import { RESULTS_PER_PROVIDER } from '@/constants/search/search';
import type { SearchProvider, SearchResult } from '@/lib/search/types';

type EventRow = {
	id: number;
	title: string | null;
	description: string | null;
	date: string;
	client_name: string | null;
};

function toResult(event: EventRow): SearchResult {
	const details = [formatCreatedAt(event.date), event.client_name].filter(Boolean).join(' · ');

	return {
		id: `events:${event.id}`,
		title: event.title || 'Evento sin título',
		subtitle: details || undefined,
		icon: Calendar,
		href: '/calendar',
		keywords: [event.description].filter((value): value is string => Boolean(value)),
	};
}

export const eventsProvider: SearchProvider = {
	id: 'events',
	label: 'Eventos',
	roles: ['Admin', 'Taller'],
	order: 5,
	async search(term, signal) {
		const supabase = getSupabaseClient();
		const pattern = buildIlikePattern(term);

		const { data, error } = await supabase
			.from('events')
			.select('id, title, description, date, client_name')
			.or(`title.ilike.${pattern},description.ilike.${pattern},client_name.ilike.${pattern}`)
			// Closest dates first: an event from last year is rarely the one being looked for.
			.order('date', { ascending: false })
			.limit(RESULTS_PER_PROVIDER)
			.abortSignal(signal);

		if (error) throw error;

		return (data ?? []).map(toResult);
	},
};
