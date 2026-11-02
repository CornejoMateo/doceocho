import { hasPermission } from '@/helpers/permissions/edits';

describe('hasPermission (server-side check for API routes)', () => {
	test('no requirement: any user with a profile passes', () => {
		expect(hasPermission('Taller', null, null, {})).toBe(true);
	});

	test('edit: any of the listed permissions is enough', () => {
		const check = { edit: ['clients.balances', 'cash-flow.checking-accounts'] };

		expect(hasPermission('Admin', null, null, check)).toBe(true);
		expect(hasPermission('Taller', null, null, check)).toBe(false);
		expect(
			hasPermission(
				'Taller',
				['cash-flow', 'cash-flow.checking-accounts'],
				['cash-flow.checking-accounts'],
				check
			)
		).toBe(true);
	});

	test('a customized admin loses what was taken away', () => {
		expect(hasPermission('Admin', ['supplies'], [], { edit: ['supplies'] })).toBe(false);
		expect(hasPermission('Admin', ['supplies'], [], { view: ['supplies'] })).toBe(true);
	});

	test('superadmin always passes', () => {
		expect(hasPermission('Superadmin', [], [], { edit: ['supplies'] })).toBe(true);
	});
});
