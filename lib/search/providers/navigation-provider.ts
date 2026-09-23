import { getNavigationForRole } from '@/constants/navigation/navigation';
import { matchesTerm, sortByScore } from '@/helpers/search/match';
import type { SearchProvider, SearchResult } from '@/lib/search/types';
import type { UserRole } from '@/constants/users/user-role';

/**
 * Jumps to a module by name. Built per role instead of being a constant,
 * so the palette never offers a section the user cannot open.
 */
export function createNavigationProvider(role: UserRole | undefined): SearchProvider {
	const items = getNavigationForRole(role).filter((item) => !item.disabled);

	return {
		id: 'navigation',
		label: 'Ir a',
		roles: role ? [role] : [],
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
