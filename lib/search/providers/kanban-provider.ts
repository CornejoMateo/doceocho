import { LayoutList } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase-client';
import { buildIlikePattern } from '@/helpers/search/match';
import { RESULTS_PER_PROVIDER } from '@/constants/search/search';
import type { SearchProvider, SearchResult } from '@/lib/search/types';

type CardRow = {
	id: number;
	title: string;
	description: string | null;
	list: { name: string | null; board_id: number | null } | null;
};

function toResult(card: CardRow): SearchResult {
	const boardId = card.list?.board_id ?? null;

	return {
		id: `kanban:${card.id}`,
		title: card.title,
		subtitle: card.list?.name || undefined,
		icon: LayoutList,
		href: boardId ? `/kanban/${boardId}` : '/kanban',
		keywords: [card.description].filter((value): value is string => Boolean(value)),
	};
}

export const kanbanProvider: SearchProvider = {
	id: 'kanban',
	label: 'Tarjetas de Kanban',
	// The table's RLS already narrows this to boards the user belongs to.
	roles: ['Admin', 'Taller'],
	order: 6,
	async search(term, signal) {
		const supabase = getSupabaseClient();
		const pattern = buildIlikePattern(term);

		const { data, error } = await supabase
			.from('kanban_cards')
			.select('id, title, description, list:kanban_lists(name, board_id)')
			.or(`title.ilike.${pattern},description.ilike.${pattern}`)
			.limit(RESULTS_PER_PROVIDER)
			.abortSignal(signal)
			.returns<CardRow[]>();

		if (error) throw error;

		return (data ?? []).map(toResult);
	},
};
