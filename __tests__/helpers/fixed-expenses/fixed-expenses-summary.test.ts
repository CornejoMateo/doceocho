import {
	computeFixedExpenseTotals,
	groupFixedExpensesByCategory,
} from '@/helpers/fixed-expenses/fixed-expenses-summary';
import { FixedExpenseWithCategory } from '@/lib/fixed-expenses/fixed-expenses';

function expense(overrides: Partial<FixedExpenseWithCategory>): FixedExpenseWithCategory {
	return {
		id: 1,
		created_at: '2026-01-05T00:00:00Z',
		category_id: 1,
		kind: 'expense',
		net_amount: 1000,
		iva_percent: 21,
		iva_amount: 210,
		amount: 1210,
		description: 'Alquiler mensual',
		is_active: true,
		last_expense_period: null,
		category_name: 'Alquiler',
		...overrides,
	};
}

describe('computeFixedExpenseTotals', () => {
	it('sums net, iva and total across all fixed expenses', () => {
		const expenses = [expense({}), expense({ net_amount: 500, iva_amount: 105, amount: 605 })];

		expect(computeFixedExpenseTotals(expenses)).toEqual({
			net: 1500,
			iva: 315,
			total: 1815,
			count: 2,
			average: 907.5,
		});
	});

	it('averages the monthly total (con IVA) per fixed expense', () => {
		const expenses = [
			expense({ amount: 1000 }),
			expense({ amount: 2000 }),
			expense({ amount: 3000 }),
		];

		expect(computeFixedExpenseTotals(expenses).average).toBe(2000);
	});

	it('returns zeroed totals when there are no fixed expenses', () => {
		expect(computeFixedExpenseTotals([])).toEqual({
			net: 0,
			iva: 0,
			total: 0,
			count: 0,
			average: 0,
		});
	});

	it('rounds sums to 2 decimals to avoid float noise', () => {
		const expenses = [
			expense({ net_amount: 0.1, iva_amount: 0.1, amount: 0.2 }),
			expense({ net_amount: 0.2, iva_amount: 0.1, amount: 0.3 }),
		];

		expect(computeFixedExpenseTotals(expenses)).toEqual({
			net: 0.3,
			iva: 0.2,
			total: 0.5,
			count: 2,
			average: 0.25,
		});
	});
});

describe('groupFixedExpensesByCategory', () => {
	const categories = [
		{ id: 1, created_at: '', name: 'Alquiler', kind: 'expense' as const, is_active: true },
		{ id: 2, created_at: '', name: 'Internet', kind: 'expense' as const, is_active: true },
		{ id: 3, created_at: '', name: 'Inactiva', kind: 'expense' as const, is_active: false },
	];

	it('includes all active categories, even with no active fixed expenses', () => {
		const expenses = [expense({ category_id: 1, net_amount: 1000 })];

		const rows = groupFixedExpensesByCategory(expenses, categories);

		expect(rows).toEqual([
			{ categoryId: 1, categoryName: 'Alquiler', net: 1000 },
			{ categoryId: 2, categoryName: 'Internet', net: 0 },
		]);
	});

	it('excludes inactive categories', () => {
		const rows = groupFixedExpensesByCategory([], categories);

		expect(rows.find((row) => row.categoryName === 'Inactiva')).toBeUndefined();
	});

	it('orders categories by name', () => {
		const rows = groupFixedExpensesByCategory([], categories);

		expect(rows.map((row) => row.categoryName)).toEqual(['Alquiler', 'Internet']);
	});

	it('includes an inactive category when it has a fixed expense, and the table sum matches the net total', () => {
		const expenses = [
			expense({ category_id: 1, net_amount: 1000 }),
			expense({ category_id: 3, category_name: 'Inactiva', net_amount: 300 }),
		];

		const rows = groupFixedExpensesByCategory(expenses, categories);

		expect(rows.find((row) => row.categoryName === 'Inactiva')).toEqual({
			categoryId: 3,
			categoryName: 'Inactiva',
			net: 300,
		});
		const tableSum = round2(rows.reduce((sum, row) => sum + row.net, 0));
		expect(tableSum).toBe(computeFixedExpenseTotals(expenses).net);
	});

	it('keeps an inactive category hidden when it has no fixed expenses', () => {
		const expenses = [expense({ category_id: 1, net_amount: 1000 })];

		const rows = groupFixedExpensesByCategory(expenses, categories);

		expect(rows.find((row) => row.categoryName === 'Inactiva')).toBeUndefined();
	});
});

function round2(value: number): number {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}
