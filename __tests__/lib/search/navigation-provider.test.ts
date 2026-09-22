import { createNavigationProvider } from '@/lib/search/providers/navigation-provider';

const signal = new AbortController().signal;

describe('lib/search/providers/navigation-provider', () => {
	test('finds a module by name, ignoring accents', async () => {
		const results = await createNavigationProvider('Admin').search('calendario', signal);

		expect(results).toHaveLength(1);
		expect(results[0].href).toBe('/calendar');
	});

	test('only offers modules the role can open', async () => {
		const adminResults = await createNavigationProvider('Admin').search('fondos', signal);
		const tallerResults = await createNavigationProvider('Taller').search('fondos', signal);

		expect(adminResults).toHaveLength(1);
		expect(tallerResults).toHaveLength(0);
	});

	test('never offers a module that is switched off for everyone', async () => {
		const results = await createNavigationProvider('Admin').search('diario', signal);

		expect(results).toHaveLength(0);
	});

	test('returns nothing when the term matches no module', async () => {
		const results = await createNavigationProvider('Admin').search('zzzz', signal);

		expect(results).toEqual([]);
	});

	test('results carry a unique, prefixed id', async () => {
		const results = await createNavigationProvider('Admin').search('clientes', signal);

		expect(results[0].id).toBe('navigation:/clients');
	});
});
