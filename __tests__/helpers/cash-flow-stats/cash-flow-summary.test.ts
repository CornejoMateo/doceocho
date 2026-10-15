import {
	filterByMonth,
	sumByWork,
	buildSummaryCards,
	buildMonthlyChartData,
	buildWorkResultRows,
} from '@/helpers/cash-flow-stats/cash-flow-summary';
import { SummaryMonthlyRow, FixedCostsMonthlyRow } from '@/lib/cash-flow-stats/cash-flow-summary';

function row(over: Partial<SummaryMonthlyRow> = {}): SummaryMonthlyRow {
	return {
		month: 1,
		workId: null,
		incomeNet: 0,
		incomeIva: 0,
		expenseNet: 0,
		expenseIva: 0,
		collectionAmount: 0,
		paymentAmount: 0,
		...over,
	};
}

function fixedRow(over: Partial<FixedCostsMonthlyRow> = {}): FixedCostsMonthlyRow {
	return { month: 1, net: 0, iva: 0, total: 0, ...over };
}

describe('filterByMonth', () => {
	it('returns every row when month is null (Todos)', () => {
		const rows = [row({ month: 1 }), row({ month: 5 })];
		expect(filterByMonth(rows, null)).toEqual(rows);
	});

	it('returns every row when month is 0', () => {
		const rows = [row({ month: 1 }), row({ month: 5 })];
		expect(filterByMonth(rows, 0)).toEqual(rows);
	});

	it('filters to the matching month only', () => {
		const rows = [row({ month: 1 }), row({ month: 5 }), row({ month: 5 })];
		expect(filterByMonth(rows, 5)).toHaveLength(2);
	});
});

describe('sumByWork', () => {
	it('sums every row (incl. "Sin obra") when workId is null', () => {
		const rows = [
			row({ workId: 1, incomeNet: 100, expenseNet: 40 }),
			row({ workId: null, incomeNet: 50, expenseNet: 10 }),
		];
		expect(sumByWork(rows, null)).toEqual(
			expect.objectContaining({ incomeNet: 150, expenseNet: 50 })
		);
	});

	it('sums only the matching obra when workId is given', () => {
		const rows = [
			row({ workId: 1, incomeNet: 100, expenseNet: 40 }),
			row({ workId: 2, incomeNet: 999, expenseNet: 999 }),
		];
		expect(sumByWork(rows, 1)).toEqual(expect.objectContaining({ incomeNet: 100, expenseNet: 40 }));
	});

	it('returns all-zero totals for an obra with no rows', () => {
		expect(sumByWork([], 1)).toEqual({
			incomeNet: 0,
			incomeIva: 0,
			expenseNet: 0,
			expenseIva: 0,
			collectionAmount: 0,
			paymentAmount: 0,
		});
	});
});

describe('buildSummaryCards', () => {
	it('includes fixed costs in Gastos/Pagos/IVA only when workId is null (Todos)', () => {
		const periodRows = [row({ workId: null, expenseNet: 100, expenseIva: 21, paymentAmount: 50 })];
		const fixedCosts = [fixedRow({ net: 1000, iva: 210, total: 1210 })];

		const cards = buildSummaryCards(periodRows, fixedCosts, null);

		expect(cards.expenseNet).toBe(1100);
		expect(cards.payments).toBe(1260);
		expect(cards.ivaOfMonth).toBe(231); // (21 + 210) - 0
	});

	it('excludes fixed costs when a specific obra is selected', () => {
		const periodRows = [row({ workId: 1, expenseNet: 100, expenseIva: 21, paymentAmount: 50 })];
		const fixedCosts = [fixedRow({ net: 1000, iva: 210, total: 1210 })];

		const cards = buildSummaryCards(periodRows, fixedCosts, 1);

		expect(cards.expenseNet).toBe(100);
		expect(cards.payments).toBe(50);
		expect(cards.ivaOfMonth).toBe(21);
	});

	it('computes margin as ingresos - gastos', () => {
		const periodRows = [row({ incomeNet: 1000, expenseNet: 400 })];
		const cards = buildSummaryCards(periodRows, [], null);
		expect(cards.margin).toBe(600);
	});

	it('returns 0 profitability when income is 0 (never divides by zero)', () => {
		const periodRows = [row({ incomeNet: 0, expenseNet: 400 })];
		const cards = buildSummaryCards(periodRows, [], null);
		expect(cards.profitability).toBe(0);
	});

	it('computes profitability as margin / income when income is non-zero', () => {
		const periodRows = [row({ incomeNet: 1000, expenseNet: 750 })];
		const cards = buildSummaryCards(periodRows, [], null);
		expect(cards.profitability).toBeCloseTo(0.25);
	});

	it('IVA del mes can go negative (crédito a favor) when ingresos IVA exceeds the rest', () => {
		const periodRows = [row({ expenseIva: 10, incomeIva: 100 })];
		const cards = buildSummaryCards(periodRows, [], null);
		expect(cards.ivaOfMonth).toBe(-90);
	});
});

describe('buildMonthlyChartData', () => {
	it('always returns 12 months, zero-filled for months with no data', () => {
		const data = buildMonthlyChartData([], [], null);
		expect(data).toHaveLength(12);
		expect(data.every((d) => d.incomeNet === 0 && d.expenseNet === 0)).toBe(true);
		expect(data[0].label).toBe('Ene');
		expect(data[11].label).toBe('Dic');
	});

	it('scopes income/expense to the selected obra, ignoring the Mes filter', () => {
		const rows = [
			row({ month: 3, workId: 1, incomeNet: 100, expenseNet: 40 }),
			row({ month: 3, workId: 2, incomeNet: 999, expenseNet: 999 }),
		];
		const data = buildMonthlyChartData(rows, [], 1);
		expect(data[2]).toEqual(expect.objectContaining({ month: 3, incomeNet: 100, expenseNet: 40 }));
	});

	it('adds fixed costs to Gastos only when the obra filter is Todos', () => {
		const rows = [row({ month: 3, workId: 1, expenseNet: 40 })];
		const fixedCosts = [fixedRow({ month: 3, net: 1000 })];

		const allObras = buildMonthlyChartData(rows, fixedCosts, null);
		expect(allObras[2].expenseNet).toBe(1040);

		const oneObra = buildMonthlyChartData(rows, fixedCosts, 1);
		expect(oneObra[2].expenseNet).toBe(40);
	});
});

describe('buildWorkResultRows', () => {
	it('excludes the "Sin obra" bucket (workId null) entirely', () => {
		const rows = [row({ workId: null, incomeNet: 500 }), row({ workId: 1, incomeNet: 100 })];
		const result = buildWorkResultRows(rows, new Map());
		expect(result).toHaveLength(1);
		expect(result[0].workId).toBe(1);
	});

	it('sorts by resultado descending', () => {
		const rows = [
			row({ workId: 1, incomeNet: 100, expenseNet: 90 }), // result 10
			row({ workId: 2, incomeNet: 500, expenseNet: 100 }), // result 400
			row({ workId: 3, incomeNet: 10, expenseNet: 50 }), // result -40
		];
		const result = buildWorkResultRows(rows, new Map());
		expect(result.map((r) => r.workId)).toEqual([2, 1, 3]);
	});

	it('falls back to "Obra #<id>" when the work name is unknown', () => {
		const rows = [row({ workId: 1, incomeNet: 100 })];
		const result = buildWorkResultRows(rows, new Map());
		expect(result[0].workName).toBe('Obra #1');
	});

	it('uses the resolved work name when available', () => {
		const rows = [row({ workId: 1, incomeNet: 100 })];
		const result = buildWorkResultRows(rows, new Map([[1, 'Casa Belgrano']]));
		expect(result[0].workName).toBe('Casa Belgrano');
	});

	it('aggregates multiple rows (different months) for the same obra', () => {
		const rows = [
			row({ month: 1, workId: 1, incomeNet: 100, expenseNet: 40 }),
			row({ month: 2, workId: 1, incomeNet: 50, expenseNet: 10 }),
		];
		const result = buildWorkResultRows(rows, new Map());
		expect(result[0]).toEqual(
			expect.objectContaining({ incomeNet: 150, expenseNet: 50, result: 100 })
		);
	});
});
