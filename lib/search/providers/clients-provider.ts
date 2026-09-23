import { Users } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase-client';
import { buildIlikePattern } from '@/helpers/search/match';
import { RESULTS_PER_PROVIDER } from '@/constants/search/search';
import type { SearchProvider, SearchResult } from '@/lib/search/types';

type ClientRow = {
	id: number;
	name: string | null;
	last_name: string | null;
	locality: string | null;
	phone_number: string | null;
	identity_number: string | null;
};

function toResult(client: ClientRow): SearchResult {
	const fullName = `${client.last_name ?? ''} ${client.name ?? ''}`.trim() || 'Sin nombre';

	return {
		id: `clients:${client.id}`,
		title: fullName,
		subtitle: client.locality || client.phone_number || undefined,
		icon: Users,
		// Opens the client file directly, reusing the deep link the module supports.
		href: `/clients?clientId=${client.id}`,
		keywords: [client.phone_number, client.identity_number].filter((value): value is string =>
			Boolean(value)
		),
	};
}

export const clientsProvider: SearchProvider = {
	id: 'clients',
	label: 'Clientes',
	roles: ['Admin', 'Taller'],
	order: 1,
	async search(term, signal) {
		const supabase = getSupabaseClient();
		const pattern = buildIlikePattern(term);

		const { data, error } = await supabase
			.from('clients')
			.select('id, name, last_name, locality, phone_number, identity_number')
			.or(
				`name.ilike.${pattern},last_name.ilike.${pattern},locality.ilike.${pattern},identity_number.ilike.${pattern}`
			)
			.limit(RESULTS_PER_PROVIDER)
			.abortSignal(signal);

		if (error) throw error;

		return (data ?? []).map(toResult);
	},
};
