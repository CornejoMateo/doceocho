import { ClipboardCheck } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase-client';
import { buildIlikePattern } from '@/helpers/search/match';
import { RESULTS_PER_PROVIDER } from '@/constants/search/search';
import type { SearchProvider, SearchResult } from '@/lib/search/types';

type WorkRow = {
	id: number;
	name: string | null;
	locality: string | null;
	address: string | null;
	client_id: number | null;
};

function toResult(work: WorkRow): SearchResult {
	const location = [work.locality, work.address].filter(Boolean).join(' · ');

	return {
		id: `works:${work.id}`,
		title: work.name || location || 'Obra sin nombre',
		subtitle: work.name ? location || undefined : undefined,
		icon: ClipboardCheck,
		// Works live inside the client file, so that is where the result lands.
		href: work.client_id ? `/clients?clientId=${work.client_id}` : '/works',
		keywords: [work.address, work.locality].filter((value): value is string => Boolean(value)),
	};
}

export const worksProvider: SearchProvider = {
	id: 'works',
	label: 'Obras',
	roles: ['Admin', 'Taller'],
	order: 2,
	async search(term, signal) {
		const supabase = getSupabaseClient();
		const pattern = buildIlikePattern(term);

		const { data, error } = await supabase
			.from('works')
			.select('id, name, locality, address, client_id')
			.or(`name.ilike.${pattern},locality.ilike.${pattern},address.ilike.${pattern}`)
			.limit(RESULTS_PER_PROVIDER)
			.abortSignal(signal);

		if (error) throw error;

		return (data ?? []).map(toResult);
	},
};
