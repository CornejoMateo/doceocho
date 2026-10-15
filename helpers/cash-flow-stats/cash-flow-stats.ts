import { BankAccount } from '@/lib/cash-flow/cash-flow';
import { PaymentMethod } from '@/lib/payment-methods/payment-methods';
import { MovementTotal } from '@/lib/cash-flow-stats/cash-flow-stats';
import { normalizeMoney } from '@/utils/formats-money';

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function isLeapYear(year: number): boolean {
	return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

// Pure, no Date object: never parses a 'YYYY-MM-DD' string (which would shift a day under ART).
function daysInMonth(year: number, month: number): number {
	if (month === 2) return isLeapYear(year) ? 29 : 28;
	return DAYS_IN_MONTH[month - 1];
}

export function getMonthRange(year: number, month: number | null): { start: string; end: string } {
	const pad = (n: number) => String(n).padStart(2, '0');
	if (!month) {
		return { start: `${year}-01-01`, end: `${year}-12-31` };
	}
	const lastDay = daysInMonth(year, month);
	return { start: `${year}-${pad(month)}-01`, end: `${year}-${pad(month)}-${pad(lastDay)}` };
}

function findTotal(totals: MovementTotal[], groupId: number | null): MovementTotal | undefined {
	return totals.find((t) => t.groupId === groupId);
}

export type AccountBalanceRow = {
	accountId: number | null;
	name: string;
	type: string | null;
	initialBalance: number;
	incomes: number;
	expenses: number;
	currentBalance: number;
};

export type AccountBalanceSummary = {
	rows: AccountBalanceRow[];
	totals: Pick<AccountBalanceRow, 'initialBalance' | 'incomes' | 'expenses' | 'currentBalance'>;
};

function toAccountBalanceRow(
	account: {
		id: number | null;
		name: string;
		account_type: string | null;
		initial_balance: number;
	},
	total: MovementTotal | undefined
): AccountBalanceRow {
	const incomes = total?.totalIn ?? 0;
	const expenses = total?.totalOut ?? 0;
	return {
		accountId: account.id,
		name: account.name,
		type: account.account_type,
		initialBalance: account.initial_balance,
		incomes,
		expenses,
		currentBalance: normalizeMoney(account.initial_balance + incomes - expenses),
	};
}

export function buildAccountBalanceRows(
	accounts: BankAccount[],
	allTimeTotals: MovementTotal[]
): AccountBalanceSummary {
	const relevant = accounts.filter(
		(a) => a.is_active || !!findTotal(allTimeTotals, a.id) || a.initial_balance !== 0
	);

	const rows = relevant.map((account) =>
		toAccountBalanceRow(account, findTotal(allTimeTotals, account.id))
	);

	const sinCuentaTotal = findTotal(allTimeTotals, null);
	rows.push(
		toAccountBalanceRow(
			{ id: null, name: 'Sin cuenta', account_type: null, initial_balance: 0 },
			sinCuentaTotal
		)
	);

	const totals = rows.reduce(
		(acc, row) => ({
			initialBalance: normalizeMoney(acc.initialBalance + row.initialBalance),
			incomes: normalizeMoney(acc.incomes + row.incomes),
			expenses: normalizeMoney(acc.expenses + row.expenses),
			currentBalance: normalizeMoney(acc.currentBalance + row.currentBalance),
		}),
		{ initialBalance: 0, incomes: 0, expenses: 0, currentBalance: 0 }
	);

	return { rows, totals };
}

export type AccountPeriodRow = {
	accountId: number | null;
	name: string;
	incomes: number;
	expenses: number;
	netFlow: number;
	currentBalance: number;
};

export function buildAccountPeriodRows(
	accounts: BankAccount[],
	periodTotals: MovementTotal[],
	allTimeBalanceRows: AccountBalanceRow[]
): AccountPeriodRow[] {
	const relevant = accounts.filter((a) => a.is_active || !!findTotal(periodTotals, a.id));
	const currentBalanceByAccount = new Map(
		allTimeBalanceRows.map((r) => [r.accountId, r.currentBalance])
	);

	const rows: AccountPeriodRow[] = relevant.map((account) => {
		const total = findTotal(periodTotals, account.id);
		const incomes = total?.totalIn ?? 0;
		const expenses = total?.totalOut ?? 0;
		return {
			accountId: account.id,
			name: account.name,
			incomes,
			expenses,
			netFlow: normalizeMoney(incomes - expenses),
			currentBalance: currentBalanceByAccount.get(account.id) ?? 0,
		};
	});

	const sinCuentaTotal = findTotal(periodTotals, null);
	if (sinCuentaTotal) {
		rows.push({
			accountId: null,
			name: 'Sin cuenta',
			incomes: sinCuentaTotal.totalIn,
			expenses: sinCuentaTotal.totalOut,
			netFlow: normalizeMoney(sinCuentaTotal.totalIn - sinCuentaTotal.totalOut),
			currentBalance: currentBalanceByAccount.get(null) ?? 0,
		});
	}

	return rows;
}

export type PaymentMethodPeriodRow = {
	methodId: number | null;
	name: string;
	incomes: number;
	expenses: number;
	netFlow: number;
};

export function buildPaymentMethodPeriodRows(
	methods: PaymentMethod[],
	periodTotals: MovementTotal[]
): PaymentMethodPeriodRow[] {
	const relevant = methods.filter((m) => m.is_active || !!findTotal(periodTotals, m.id));

	const rows: PaymentMethodPeriodRow[] = relevant.map((method) => {
		const total = findTotal(periodTotals, method.id);
		const incomes = total?.totalIn ?? 0;
		const expenses = total?.totalOut ?? 0;
		return {
			methodId: method.id,
			name: method.name,
			incomes,
			expenses,
			netFlow: normalizeMoney(incomes - expenses),
		};
	});

	const sinMedioTotal = findTotal(periodTotals, null);
	if (sinMedioTotal) {
		rows.push({
			methodId: null,
			name: 'Sin medio',
			incomes: sinMedioTotal.totalIn,
			expenses: sinMedioTotal.totalOut,
			netFlow: normalizeMoney(sinMedioTotal.totalIn - sinMedioTotal.totalOut),
		});
	}

	return rows;
}

export type PeriodSummary = { incomes: number; expenses: number; netFlow: number };

export function sumPeriodTotals(periodTotals: MovementTotal[]): PeriodSummary {
	const incomes = normalizeMoney(periodTotals.reduce((sum, t) => sum + t.totalIn, 0));
	const expenses = normalizeMoney(periodTotals.reduce((sum, t) => sum + t.totalOut, 0));
	return { incomes, expenses, netFlow: normalizeMoney(incomes - expenses) };
}
