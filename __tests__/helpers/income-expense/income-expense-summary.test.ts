import {
	computeIncomeExpenseByCategory,
	computeIncomeExpenseByMonth,
} from '@/helpers/income-expense/income-expense-summary';
import type { IncomeExpenseEntry } from '@/hooks/income-expense/use-income-expense-tab';
import type { CashFlowCategory } from '@/lib/categories/categories';

function entry(overrides: Partial<IncomeExpenseEntry>): IncomeExpenseEntry {
	return {
		id: 1,
		date: '2026-01-15',
		voucher_number: null,
		voucher_type_id: 1,
		voucher_type_name: 'Factura A',
		work_id: null,
		work_name: null,
		party_id: 1,
		party_name: 'Cliente',
		category_id: 1,
		category_name: 'Categoria',
		description: null,
		net_amount: 100,
		iva_percent: 21,
		iva_amount: 21,
		total_amount: 121,
		...overrides,
	};
}

function category(overrides: Partial<CashFlowCategory>): CashFlowCategory {
	return {
		id: 1,
		created_at: '2026-01-01T00:00:00Z',
		name: 'Categoria',
		kind: 'income',
		is_active: true,
		...overrides,
	};
}

describe('computeIncomeExpenseByMonth', () => {
	it('returns 12 zero-filled months when there are no entries', () => {
		const rows = computeIncomeExpenseByMonth([]);

		expect(rows).toHaveLength(12);
		expect(rows.every((r) => r.net === 0 && r.iva === 0 && r.total === 0)).toBe(true);
		expect(rows.map((r) => r.month)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
	});

	it('buckets an entry dated January 1st into month 0', () => {
		const rows = computeIncomeExpenseByMonth([
			entry({ date: '2026-01-01', net_amount: 100, iva_amount: 21, total_amount: 121 }),
		]);

		expect(rows[0]).toEqual({ month: 0, net: 100, iva: 21, total: 121 });
	});

	it('buckets an entry dated December 31st into month 11', () => {
		const rows = computeIncomeExpenseByMonth([
			entry({ date: '2026-12-31', net_amount: 50, iva_amount: 0, total_amount: 50 }),
		]);

		expect(rows[11]).toEqual({ month: 11, net: 50, iva: 0, total: 50 });
	});

	it('sums multiple entries within the same month', () => {
		const rows = computeIncomeExpenseByMonth([
			entry({ date: '2026-03-01', net_amount: 100, iva_amount: 21, total_amount: 121 }),
			entry({ date: '2026-03-20', net_amount: 200, iva_amount: 42, total_amount: 242 }),
		]);

		expect(rows[2]).toEqual({ month: 2, net: 300, iva: 63, total: 363 });
	});

	it('the sum of all monthly totals matches the sum of all entry totals', () => {
		const entries = [
			entry({ date: '2026-01-05', net_amount: 100, iva_amount: 21, total_amount: 121 }),
			entry({ date: '2026-06-15', net_amount: 200, iva_amount: 0, total_amount: 200 }),
			entry({ date: '2026-12-25', net_amount: 33.33, iva_amount: 7, total_amount: 40.33 }),
		];
		const rows = computeIncomeExpenseByMonth(entries);

		const totalFromRows = rows.reduce((sum, r) => sum + r.total, 0);
		const totalFromEntries = entries.reduce((sum, e) => sum + e.total_amount, 0);
		expect(totalFromRows).toBeCloseTo(totalFromEntries, 2);
	});

	it('rounds accumulated cents instead of leaving floating point drift', () => {
		const rows = computeIncomeExpenseByMonth([
			entry({ date: '2026-02-01', net_amount: 0.1, iva_amount: 0, total_amount: 0.1 }),
			entry({ date: '2026-02-02', net_amount: 0.2, iva_amount: 0, total_amount: 0.2 }),
		]);

		expect(rows[1].net).toBe(0.3);
	});
});

describe('computeIncomeExpenseByCategory', () => {
	it('returns rows sorted by net amount descending', () => {
		const categories = [category({ id: 1, name: 'Chica' }), category({ id: 2, name: 'Grande' })];
		const entries = [
			entry({ category_id: 1, category_name: 'Chica', net_amount: 50 }),
			entry({ category_id: 2, category_name: 'Grande', net_amount: 500 }),
		];

		const rows = computeIncomeExpenseByCategory(entries, categories);

		expect(rows.map((r) => r.categoryName)).toEqual(['Grande', 'Chica']);
	});

	it('sums movements for the same category and returns the total', () => {
		const categories = [category({ id: 1 })];
		const entries = [
			entry({ category_id: 1, net_amount: 100 }),
			entry({ category_id: 1, net_amount: 50 }),
		];

		const rows = computeIncomeExpenseByCategory(entries, categories);

		expect(rows).toEqual([{ categoryId: 1, categoryName: 'Categoria', net: 150 }]);
	});

	it('includes an inactive category when it has movements', () => {
		const categories = [category({ id: 1, is_active: false, name: 'De baja' })];
		const entries = [entry({ category_id: 1, category_name: 'De baja', net_amount: 80 })];

		const rows = computeIncomeExpenseByCategory(entries, categories);

		expect(rows).toEqual([{ categoryId: 1, categoryName: 'De baja', net: 80 }]);
	});

	it('excludes an inactive category when it has no movements', () => {
		const categories = [category({ id: 1, is_active: false, name: 'De baja' })];

		const rows = computeIncomeExpenseByCategory([], categories);

		expect(rows).toEqual([]);
	});

	it('includes an active category with zero movements', () => {
		const categories = [category({ id: 1, is_active: true, name: 'Activa' })];

		const rows = computeIncomeExpenseByCategory([], categories);

		expect(rows).toEqual([{ categoryId: 1, categoryName: 'Activa', net: 0 }]);
	});

	it('includes entries whose category is not present in the categories list at all', () => {
		const entries = [entry({ category_id: 99, category_name: 'Eliminada', net_amount: 30 })];

		const rows = computeIncomeExpenseByCategory(entries, []);

		expect(rows).toEqual([{ categoryId: 99, categoryName: 'Eliminada', net: 30 }]);
	});

	it('rounds the accumulated net to 2 decimals', () => {
		const categories = [category({ id: 1 })];
		const entries = [
			entry({ category_id: 1, net_amount: 0.1 }),
			entry({ category_id: 1, net_amount: 0.2 }),
		];

		const rows = computeIncomeExpenseByCategory(entries, categories);

		expect(rows[0].net).toBe(0.3);
	});
});
