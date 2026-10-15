import {
	buildAccountBalanceRows,
	buildAccountPeriodRows,
	buildPaymentMethodPeriodRows,
	getMonthRange,
	sumPeriodTotals,
} from '@/helpers/cash-flow-stats/cash-flow-stats';
import { BankAccount } from '@/lib/cash-flow/cash-flow';
import { PaymentMethod } from '@/lib/payment-methods/payment-methods';
import { MovementTotal } from '@/lib/cash-flow-stats/cash-flow-stats';

function account(over: Partial<BankAccount> = {}): BankAccount {
	return {
		id: 1,
		name: 'Cuenta A',
		bank: 'Galicia',
		account_number: '111',
		account_type: 'checking',
		is_active: true,
		initial_balance: 0,
		...over,
	};
}

function method(over: Partial<PaymentMethod> = {}): PaymentMethod {
	return { id: 1, created_at: '2026-01-01', name: 'Efectivo', is_active: true, ...over };
}

function total(over: Partial<MovementTotal> = {}): MovementTotal {
	return { groupId: 1, totalIn: 0, totalOut: 0, ...over };
}

describe('getMonthRange', () => {
	it('returns the full year when month is null (Todos)', () => {
		expect(getMonthRange(2026, null)).toEqual({ start: '2026-01-01', end: '2026-12-31' });
	});

	it('returns the full year when month is 0', () => {
		expect(getMonthRange(2026, 0)).toEqual({ start: '2026-01-01', end: '2026-12-31' });
	});

	it('returns the first/last day of a 31-day month', () => {
		expect(getMonthRange(2026, 1)).toEqual({ start: '2026-01-01', end: '2026-01-31' });
	});

	it('returns the first/last day of a 30-day month', () => {
		expect(getMonthRange(2026, 4)).toEqual({ start: '2026-04-01', end: '2026-04-30' });
	});

	it('returns 28 days for February on a non-leap year', () => {
		expect(getMonthRange(2026, 2)).toEqual({ start: '2026-02-01', end: '2026-02-28' });
	});

	it('returns 29 days for February on a leap year', () => {
		expect(getMonthRange(2024, 2)).toEqual({ start: '2024-02-01', end: '2024-02-29' });
	});

	it('pads single-digit months', () => {
		expect(getMonthRange(2026, 9)).toEqual({ start: '2026-09-01', end: '2026-09-30' });
	});
});

describe('buildAccountBalanceRows', () => {
	it('computes saldo actual as initial + incomes - expenses, and always appends a "Sin cuenta" row', () => {
		const accounts = [account({ id: 1, initial_balance: 1000 })];
		const totals = [total({ groupId: 1, totalIn: 500, totalOut: 200 })];

		const { rows } = buildAccountBalanceRows(accounts, totals);

		expect(rows).toEqual([
			{
				accountId: 1,
				name: 'Cuenta A',
				type: 'checking',
				initialBalance: 1000,
				incomes: 500,
				expenses: 200,
				currentBalance: 1300,
			},
			{
				accountId: null,
				name: 'Sin cuenta',
				type: null,
				initialBalance: 0,
				incomes: 0,
				expenses: 0,
				currentBalance: 0,
			},
		]);
	});

	it('supports a negative initial balance (overdraft)', () => {
		const accounts = [account({ id: 1, initial_balance: -300 })];

		const { rows } = buildAccountBalanceRows(accounts, []);

		expect(rows[0].currentBalance).toBe(-300);
	});

	it('includes "Sin cuenta" movements when present', () => {
		const totals = [total({ groupId: null, totalIn: 50, totalOut: 10 })];

		const { rows } = buildAccountBalanceRows([], totals);

		expect(rows).toEqual([
			{
				accountId: null,
				name: 'Sin cuenta',
				type: null,
				initialBalance: 0,
				incomes: 50,
				expenses: 10,
				currentBalance: 40,
			},
		]);
	});

	it('hides an inactive account with no movements and a zero initial balance', () => {
		const accounts = [account({ id: 1, is_active: false, initial_balance: 0 })];

		const { rows } = buildAccountBalanceRows(accounts, []);

		expect(rows.map((r) => r.accountId)).toEqual([null]);
	});

	it('shows an inactive account that has all-time movements', () => {
		const accounts = [account({ id: 1, is_active: false, initial_balance: 0 })];
		const totals = [total({ groupId: 1, totalIn: 10, totalOut: 0 })];

		const { rows } = buildAccountBalanceRows(accounts, totals);

		expect(rows.map((r) => r.accountId)).toEqual([1, null]);
	});

	it('shows an inactive account with a non-zero initial balance even without movements', () => {
		const accounts = [account({ id: 1, is_active: false, initial_balance: 500 })];

		const { rows } = buildAccountBalanceRows(accounts, []);

		expect(rows.map((r) => r.accountId)).toEqual([1, null]);
	});

	it('computes a TOTALES row summing every row, including "Sin cuenta"', () => {
		const accounts = [
			account({ id: 1, initial_balance: 100 }),
			account({ id: 2, initial_balance: -50 }),
		];
		const totals = [
			total({ groupId: 1, totalIn: 100, totalOut: 50 }),
			total({ groupId: 2, totalIn: 20, totalOut: 10 }),
			total({ groupId: null, totalIn: 5, totalOut: 0 }),
		];

		const { totals: summary } = buildAccountBalanceRows(accounts, totals);

		expect(summary).toEqual({
			initialBalance: 50,
			incomes: 125,
			expenses: 60,
			currentBalance: 115,
		});
	});
});

describe('buildAccountPeriodRows', () => {
	it('computes period incomes/expenses/flujo neto and reuses the all-time saldo actual', () => {
		const accounts = [account({ id: 1 })];
		const periodTotals = [total({ groupId: 1, totalIn: 300, totalOut: 100 })];
		const allTimeRows = [
			{
				accountId: 1,
				name: 'Cuenta A',
				type: 'checking',
				initialBalance: 1000,
				incomes: 800,
				expenses: 300,
				currentBalance: 1500,
			},
		];

		const rows = buildAccountPeriodRows(accounts, periodTotals, allTimeRows);

		expect(rows).toEqual([
			{
				accountId: 1,
				name: 'Cuenta A',
				incomes: 300,
				expenses: 100,
				netFlow: 200,
				currentBalance: 1500,
			},
		]);
	});

	it('omits "Sin cuenta" when it has no period movements', () => {
		const rows = buildAccountPeriodRows([], [], []);

		expect(rows).toEqual([]);
	});

	it('includes "Sin cuenta" when it has period movements', () => {
		const periodTotals = [total({ groupId: null, totalIn: 40, totalOut: 15 })];

		const rows = buildAccountPeriodRows([], periodTotals, []);

		expect(rows).toEqual([
			{
				accountId: null,
				name: 'Sin cuenta',
				incomes: 40,
				expenses: 15,
				netFlow: 25,
				currentBalance: 0,
			},
		]);
	});

	it('hides an inactive account with no period movements', () => {
		const accounts = [account({ id: 1, is_active: false })];

		const rows = buildAccountPeriodRows(accounts, [], []);

		expect(rows).toEqual([]);
	});

	it('shows an inactive account that has period movements', () => {
		const accounts = [account({ id: 1, is_active: false })];
		const periodTotals = [total({ groupId: 1, totalIn: 10, totalOut: 0 })];

		const rows = buildAccountPeriodRows(accounts, periodTotals, []);

		expect(rows).toHaveLength(1);
		expect(rows[0].accountId).toBe(1);
	});
});

describe('buildPaymentMethodPeriodRows', () => {
	it('computes period incomes/expenses/flujo neto per method', () => {
		const methods = [method({ id: 1, name: 'Efectivo' })];
		const periodTotals = [total({ groupId: 1, totalIn: 200, totalOut: 50 })];

		const rows = buildPaymentMethodPeriodRows(methods, periodTotals);

		expect(rows).toEqual([
			{ methodId: 1, name: 'Efectivo', incomes: 200, expenses: 50, netFlow: 150 },
		]);
	});

	it('includes "Sin medio" when present', () => {
		const periodTotals = [total({ groupId: null, totalIn: 30, totalOut: 5 })];

		const rows = buildPaymentMethodPeriodRows([], periodTotals);

		expect(rows).toEqual([
			{ methodId: null, name: 'Sin medio', incomes: 30, expenses: 5, netFlow: 25 },
		]);
	});

	it('hides an inactive method with no period movements', () => {
		const methods = [method({ id: 1, is_active: false })];

		const rows = buildPaymentMethodPeriodRows(methods, []);

		expect(rows).toEqual([]);
	});

	it('shows an inactive method that has period movements', () => {
		const methods = [method({ id: 1, is_active: false })];
		const periodTotals = [total({ groupId: 1, totalIn: 10, totalOut: 0 })];

		const rows = buildPaymentMethodPeriodRows(methods, periodTotals);

		expect(rows).toHaveLength(1);
	});
});

describe('sumPeriodTotals', () => {
	it('sums incomes/expenses across every group, including null (Sin cuenta/Sin medio)', () => {
		const totals = [
			total({ groupId: 1, totalIn: 100, totalOut: 40 }),
			total({ groupId: 2, totalIn: 50, totalOut: 10 }),
			total({ groupId: null, totalIn: 5, totalOut: 0 }),
		];

		expect(sumPeriodTotals(totals)).toEqual({ incomes: 155, expenses: 50, netFlow: 105 });
	});

	it('returns zeros for an empty list', () => {
		expect(sumPeriodTotals([])).toEqual({ incomes: 0, expenses: 0, netFlow: 0 });
	});
});
