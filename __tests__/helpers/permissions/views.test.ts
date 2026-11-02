import {
	ALL_VIEW_KEYS,
	canView,
	getDefaultViews,
	parseViewsInput,
	resolveViews,
	sanitizeViews,
} from '@/helpers/permissions/views';

describe('helpers/permissions/views', () => {
	describe('getDefaultViews', () => {
		test('taller keeps what the role saw before: no budgets, no cash flow', () => {
			const views = getDefaultViews('Taller');

			expect(views).toEqual(
				expect.arrayContaining(['clients', 'clients.works', 'clients.images', 'supplies'])
			);
			expect(views).not.toContain('clients.budgets');
			expect(views).not.toContain('cash-flow');
		});

		test('admin gets every client tab and cash flow', () => {
			const views = getDefaultViews('Admin');

			expect(views).toEqual(
				expect.arrayContaining(['clients.info', 'clients.budgets', 'clients.balances', 'cash-flow'])
			);
		});

		test('the QR account only reaches clocking in', () => {
			expect(getDefaultViews('QR')).toEqual(['employees', 'employees.fichar']);
		});

		test('no role means no views', () => {
			expect(getDefaultViews(undefined)).toEqual([]);
		});
	});

	describe('resolveViews', () => {
		test('a customization replaces the role defaults', () => {
			expect(resolveViews('Taller', ['clients', 'clients.budgets'])).toEqual([
				'clients',
				'clients.budgets',
			]);
		});

		test('without customization the role defaults apply', () => {
			expect(resolveViews('Taller', null)).toEqual(getDefaultViews('Taller'));
		});

		test('superadmin always sees everything, whatever is stored', () => {
			expect(resolveViews('Superadmin', ['clients'])).toEqual(ALL_VIEW_KEYS);
		});
	});

	describe('canView', () => {
		test('a tab needs its module too', () => {
			expect(canView(['clients', 'clients.budgets'], 'clients.budgets')).toBe(true);
			expect(canView(['clients.budgets'], 'clients.budgets')).toBe(false);
		});

		test('a module on its own', () => {
			expect(canView(['kanban'], 'kanban')).toBe(true);
			expect(canView([], 'kanban')).toBe(false);
		});
	});

	describe('sanitizeViews', () => {
		test('drops unknown keys and repeats', () => {
			expect(sanitizeViews(['clients', 'hack', 'clients'])).toEqual(['clients']);
		});

		test('anything that is not a list means no customization', () => {
			expect(sanitizeViews('clients')).toBeNull();
		});
	});

	describe('parseViewsInput', () => {
		test('undefined leaves the stored views untouched', () => {
			expect(parseViewsInput(undefined, 'Taller')).toEqual({});
		});

		test('null goes back to the role defaults', () => {
			expect(parseViewsInput(null, 'Taller')).toEqual({ views: null });
		});

		test('nothing is stored for a superadmin', () => {
			expect(parseViewsInput(['clients'], 'Superadmin')).toEqual({ views: null });
		});

		test('a customization without any module is rejected', () => {
			expect(parseViewsInput(['clients.budgets'], 'Taller').error).toBeDefined();
			expect(parseViewsInput([], 'Taller').error).toBeDefined();
		});

		test('a valid customization is cleaned and kept', () => {
			expect(parseViewsInput(['clients', 'clients.budgets', 'nope'], 'Taller')).toEqual({
				views: ['clients', 'clients.budgets'],
			});
		});
	});
});
