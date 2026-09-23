import { getSearchProviders } from '@/lib/search/registry';

/** Domains whose table is restricted to admins by RLS. */
const ADMIN_ONLY_PROVIDERS = ['budgets', 'appointments', 'employees'];

describe('lib/search/registry', () => {
	test('an admin gets every group, navigation first', () => {
		const ids = getSearchProviders('Admin').map((provider) => provider.id);

		expect(ids[0]).toBe('navigation');
		expect(ids).toEqual([
			'navigation',
			'clients',
			'works',
			'budgets',
			'supplies',
			'events',
			'kanban',
			'appointments',
			'employees',
		]);
	});

	test('taller never queries an admin-only table', () => {
		const ids = getSearchProviders('Taller').map((provider) => provider.id);

		ADMIN_ONLY_PROVIDERS.forEach((restricted) => expect(ids).not.toContain(restricted));
		expect(ids).toEqual(
			expect.arrayContaining(['clients', 'works', 'supplies', 'events', 'kanban'])
		);
	});

	test('the QR device account gets no data providers', () => {
		expect(getSearchProviders('QR').map((provider) => provider.id)).toEqual(['navigation']);
	});

	test('no role means nothing to search', () => {
		expect(getSearchProviders(undefined)).toEqual([]);
	});

	test('admin-only domains never declare another role', () => {
		const providers = getSearchProviders('Admin').filter((provider) =>
			ADMIN_ONLY_PROVIDERS.includes(provider.id)
		);

		expect(providers).toHaveLength(ADMIN_ONLY_PROVIDERS.length);
		providers.forEach((provider) => expect(provider.roles).toEqual(['Admin']));
	});

	test('every provider has a unique id', () => {
		const ids = getSearchProviders('Admin').map((provider) => provider.id);

		expect(new Set(ids).size).toBe(ids.length);
	});

	test('no two providers share an order, so the groups never swap places', () => {
		const orders = getSearchProviders('Admin').map((provider) => provider.order);

		expect(new Set(orders).size).toBe(orders.length);
		expect(orders).toEqual([...orders].sort((a, b) => a - b));
	});

	test('every provider declares a group heading', () => {
		getSearchProviders('Admin').forEach((provider) => {
			expect(provider.label.trim().length).toBeGreaterThan(0);
		});
	});
});
