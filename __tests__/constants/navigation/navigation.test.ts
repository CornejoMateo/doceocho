import { getNavigationForRole, isRouteAllowedForRole } from '@/constants/navigation/navigation';

describe('constants/navigation', () => {
	describe('isRouteAllowedForRole', () => {
		test('allows a module route the role can open', () => {
			expect(isRouteAllowedForRole('/kanban', 'Admin')).toBe(true);
			expect(isRouteAllowedForRole('/kanban', 'Taller')).toBe(true);
		});

		// Without this a board page bounced the user back to the home route,
		// because the nested path never matched the module's own href.
		test('a module owns its sub-routes', () => {
			expect(isRouteAllowedForRole('/kanban/37', 'Admin')).toBe(true);
			expect(isRouteAllowedForRole('/kanban/37', 'Taller')).toBe(true);
		});

		test('a sub-route stays forbidden when the module is', () => {
			expect(isRouteAllowedForRole('/cash-flow', 'Taller')).toBe(false);
			expect(isRouteAllowedForRole('/cash-flow/anything', 'Taller')).toBe(false);
		});

		test('the panel does not swallow every other route', () => {
			// '/' is a module too; a nested path must not match it by prefix.
			expect(isRouteAllowedForRole('/', 'Admin')).toBe(true);
			expect(isRouteAllowedForRole('/', 'Taller')).toBe(false);
			expect(isRouteAllowedForRole('/supplies', 'Taller')).toBe(true);
		});

		test('an unknown route is never allowed', () => {
			expect(isRouteAllowedForRole('/does-not-exist', 'Admin')).toBe(false);
			expect(isRouteAllowedForRole('/kanbanX', 'Admin')).toBe(false);
		});

		test('a module that is switched off stays unreachable', () => {
			expect(isRouteAllowedForRole('/claims', 'Admin')).toBe(false);
			expect(isRouteAllowedForRole('/budgets', 'Admin')).toBe(false);
		});

		test('no role means no access', () => {
			expect(isRouteAllowedForRole('/kanban', undefined)).toBe(false);
		});

		test('the QR device account only reaches the employees screen', () => {
			expect(isRouteAllowedForRole('/employees', 'QR')).toBe(true);
			expect(isRouteAllowedForRole('/clients', 'QR')).toBe(false);
		});
	});

	describe('getNavigationForRole', () => {
		test('every visible item is a route the role can open', () => {
			(['Admin', 'Taller', 'QR'] as const).forEach((role) => {
				getNavigationForRole(role).forEach((item) => {
					expect(isRouteAllowedForRole(item.href, role)).toBe(true);
				});
			});
		});

		test('no role means an empty menu', () => {
			expect(getNavigationForRole(undefined)).toEqual([]);
		});
	});
});
