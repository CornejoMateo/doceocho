import { getNavigationForViews } from '@/constants/navigation/navigation';
import { matchesTerm, sortByScore } from '@/helpers/search/match';
import type { SearchProvider, SearchResult } from '@/lib/search/types';

/**
 * Jumps to a module by name. Built per user instead of being a constant,
 * so the palette never offers a section the user cannot open.
 */
export function createNavigationProvider(views: string[]): SearchProvider {
	const items = getNavigationForViews(views).filter((item) => !item.disabled);

	return {
		id: 'navigation',
		label: 'Ir a',
		view: 'navigation',
		order: 0,
		// Static list: matched in the browser, no query needed.
		async search(term) {
			const matches: SearchResult[] = items
				.filter((item) => matchesTerm(term, item.name))
				.map((item) => ({
					id: `navigation:${item.href}`,
					title: item.name,
					icon: item.icon,
					href: item.href,
				}));

			return sortByScore(term, matches);
		},
	};
}
