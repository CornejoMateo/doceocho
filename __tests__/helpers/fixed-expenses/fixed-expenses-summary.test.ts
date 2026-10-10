import {
	computeFixedExpensePaymentTotals,
	groupFixedExpensePaymentsByCategory,
	groupFixedExpensePaymentsByMonth,
} from '@/helpers/fixed-expenses/fixed-expenses-summary';
import { FixedExpensePaymentWithDetails } from '@/lib/fixed-expenses/fixed-expense-payments';

function payment(
	overrides: Partial<FixedExpensePaymentWithDetails>
): FixedExpensePaymentWithDetails {
	return {
		id: 1,
		created_at: '2026-01-05T00:00:00Z',
		fixed_expense_id: 1,
		paid_date: '2026-01-05',
		period: '2026-01-01',
		net_amount: 1000,
		iva_percent: 21,
		iva_amount: 210,
		total_amount: 1210,
		payment_method_id: 1,
		bank_account_id: null,
		description: 'Alquiler mensual',
		category_id: 1,
		category_name: 'Alquiler',
		payment_method_name: 'Efectivo',
		bank_account_label: null,
		...overrides,
	};
}

describe('computeFixedExpensePaymentTotals', () => {
	it('sums net, iva and total across all payments', () => {
		const payments = [
			payment({}),
			payment({ net_amount: 500, iva_amount: 105, total_amount: 605 }),
		];

		expect(computeFixedExpensePaymentTotals(payments)).toEqual({
			net: 1500,
			iva: 315,
			total: 1815,
			count: 2,
			average: 907.5,
		});
	});

	it('averages the total amount (con IVA) per payment, matching the Excel PROMEDIO column', () => {
		const payments = [
			payment({ total_amount: 1000 }),
			payment({ total_amount: 2000 }),
			payment({ total_amount: 3000 }),
		];

		expect(computeFixedExpensePaymentTotals(payments).average).toBe(2000);
	});

	it('returns zeroed totals when there are no payments', () => {
		expect(computeFixedExpensePaymentTotals([])).toEqual({
			net: 0,
			iva: 0,
			total: 0,
			count: 0,
			average: 0,
		});
	});

	it('rounds sums to 2 decimals to avoid float noise', () => {
		const payments = [
			payment({ net_amount: 0.1, iva_amount: 0.1, total_amount: 0.2 }),
			payment({ net_amount: 0.2, iva_amount: 0.1, total_amount: 0.3 }),
		];

		expect(computeFixedExpensePaymentTotals(payments)).toEqual({
			net: 0.3,
			iva: 0.2,
			total: 0.5,
			count: 2,
			average: 0.25,
		});
	});
});

describe('groupFixedExpensePaymentsByMonth', () => {
	it('returns 12 rows, one per month, defaulting to zero', () => {
		const rows = groupFixedExpensePaymentsByMonth([]);

		expect(rows).toHaveLength(12);
		expect(rows.every((row) => row.net === 0 && row.iva === 0 && row.total === 0)).toBe(true);
	});

	it('groups payments by the month parsed from their period', () => {
		const payments = [
			payment({ period: '2026-01-01', net_amount: 1000, iva_amount: 210, total_amount: 1210 }),
			payment({ period: '2026-03-01', net_amount: 500, iva_amount: 105, total_amount: 605 }),
			payment({ period: '2026-01-01', net_amount: 200, iva_amount: 42, total_amount: 242 }),
		];

		const rows = groupFixedExpensePaymentsByMonth(payments);

		expect(rows[0]).toEqual({ month: 0, net: 1200, iva: 252, total: 1452 });
		expect(rows[2]).toEqual({ month: 2, net: 500, iva: 105, total: 605 });
		expect(rows[1]).toEqual({ month: 1, net: 0, iva: 0, total: 0 });
	});
});

describe('groupFixedExpensePaymentsByCategory', () => {
	const categories = [
		{ id: 1, created_at: '', name: 'Alquiler', kind: 'fixed_expense' as const, is_active: true },
		{ id: 2, created_at: '', name: 'Internet', kind: 'fixed_expense' as const, is_active: true },
		{ id: 3, created_at: '', name: 'Inactiva', kind: 'fixed_expense' as const, is_active: false },
	];

	it('includes all active categories, even with zero payments', () => {
		const payments = [payment({ category_id: 1, net_amount: 1000 })];

		const rows = groupFixedExpensePaymentsByCategory(payments, categories);

		expect(rows).toEqual([
			{ categoryId: 1, categoryName: 'Alquiler', net: 1000 },
			{ categoryId: 2, categoryName: 'Internet', net: 0 },
		]);
	});

	it('excludes inactive categories', () => {
		const rows = groupFixedExpensePaymentsByCategory([], categories);

		expect(rows.find((row) => row.categoryName === 'Inactiva')).toBeUndefined();
	});

	it('orders categories by name', () => {
		const rows = groupFixedExpensePaymentsByCategory([], categories);

		expect(rows.map((row) => row.categoryName)).toEqual(['Alquiler', 'Internet']);
	});

	it('includes an inactive category when it has payments, and the table sum matches the net total', () => {
		const payments = [
			payment({ category_id: 1, net_amount: 1000 }),
			payment({ category_id: 3, category_name: 'Inactiva', net_amount: 300 }),
		];

		const rows = groupFixedExpensePaymentsByCategory(payments, categories);

		expect(rows.find((row) => row.categoryName === 'Inactiva')).toEqual({
			categoryId: 3,
			categoryName: 'Inactiva',
			net: 300,
		});
		const tableSum = round2(rows.reduce((sum, row) => sum + row.net, 0));
		expect(tableSum).toBe(computeFixedExpensePaymentTotals(payments).net);
	});

	it('keeps an inactive category hidden when it has no payments', () => {
		const payments = [payment({ category_id: 1, net_amount: 1000 })];

		const rows = groupFixedExpensePaymentsByCategory(payments, categories);

		expect(rows.find((row) => row.categoryName === 'Inactiva')).toBeUndefined();
	});
});

function round2(value: number): number {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}
