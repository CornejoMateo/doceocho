import { appointmentsProvider } from '@/lib/search/providers/appointments-provider';
import { budgetsProvider } from '@/lib/search/providers/budgets-provider';
import { clientsProvider } from '@/lib/search/providers/clients-provider';
import { eventsProvider } from '@/lib/search/providers/events-provider';
import { kanbanProvider } from '@/lib/search/providers/kanban-provider';
import { employeesProvider } from '@/lib/search/providers/employees-provider';
import { createNavigationProvider } from '@/lib/search/providers/navigation-provider';
import { suppliesProvider } from '@/lib/search/providers/supplies-provider';
import { worksProvider } from '@/lib/search/providers/works-provider';
import type { SearchProvider } from '@/lib/search/types';
import { canView } from '@/helpers/permissions/views';

/** Every domain the palette can search. Add a provider here to add a group. */
const DATA_PROVIDERS: SearchProvider[] = [
	clientsProvider,
	worksProvider,
	budgetsProvider,
	suppliesProvider,
	eventsProvider,
	kanbanProvider,
	appointmentsProvider,
	employeesProvider,
];

/**
 * Providers the user's views allow, in display order.
 * Filtering here means a forbidden table is never even asked for.
 */
export function getSearchProviders(views: string[]): SearchProvider[] {
	if (views.length === 0) return [];

	const allowed = DATA_PROVIDERS.filter((provider) => canView(views, provider.view));

	return [createNavigationProvider(views), ...allowed].sort((a, b) => a.order - b.order);
}
