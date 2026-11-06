import {
	filterByMonth,
	sumByWork,
	buildSummaryCards,
	buildMonthlyChartData,
	buildMonthlyCollectionsPaymentsChartData,
	buildWorkResultRows,
} from '@/helpers/cash-flow-stats/cash-flow-summary';
import { SummaryMonthlyRow } from '@/lib/cash-flow-stats/cash-flow-summary';
import { roundToTwoDecimals } from '@/utils/formats-money';

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
	it('computes debe as gastos con IVA menos pagos (positive: se debe)', () => {
		const periodRows = [row({ expenseNet: 100, expenseIva: 21, paymentAmount: 50 })];
		const cards = buildSummaryCards(periodRows, null);
		expect(cards.debe).toBe(71); // (100 + 21) - 50
	});

	it('computes debe as zero when gastos con IVA equal pagos', () => {
		const periodRows = [row({ expenseNet: 100, expenseIva: 21, paymentAmount: 121 })];
		const cards = buildSummaryCards(periodRows, null);
		expect(cards.debe).toBe(0);
	});

	it('computes debe as negative when pagos exceed gastos con IVA (overpaid)', () => {
		const periodRows = [row({ expenseNet: 100, expenseIva: 21, paymentAmount: 500 })];
		const cards = buildSummaryCards(periodRows, null);
		expect(cards.debe).toBe(-379); // (100 + 21) - 500
	});

	it('scopes expenseNet/payments/ivaOfMonth to the selected obra', () => {
		const periodRows = [row({ workId: 1, expenseNet: 100, expenseIva: 21, paymentAmount: 50 })];
		const cards = buildSummaryCards(periodRows, 1);

		expect(cards.expenseNet).toBe(100);
		expect(cards.payments).toBe(50);
		expect(cards.ivaOfMonth).toBe(21);
	});

	it('respects the month filter already applied to periodRows', () => {
		const periodRows = [row({ month: 3, expenseNet: 100, expenseIva: 21, paymentAmount: 50 })];
		const cards = buildSummaryCards(periodRows, null);
		expect(cards.debe).toBe(71);
	});

	it('IVA del mes can go negative (crédito a favor) when ingresos IVA exceeds the rest', () => {
		const periodRows = [row({ expenseIva: 10, incomeIva: 100 })];
		const cards = buildSummaryCards(periodRows, null);
		expect(cards.ivaOfMonth).toBe(-90);
	});

	describe('expenseWithIva', () => {
		it('equals expenseNet + expenseIva', () => {
			const periodRows = [row({ expenseNet: 100, expenseIva: 21 })];
			const cards = buildSummaryCards(periodRows, null);
			expect(cards.expenseWithIva).toBe(121);
		});

		it('is zero when there are no expenses', () => {
			const cards = buildSummaryCards([], null);
			expect(cards.expenseWithIva).toBe(0);
		});

		it('respects the month filter already applied to periodRows', () => {
			const periodRows = [row({ month: 3, expenseNet: 100, expenseIva: 21 })];
			const cards = buildSummaryCards(periodRows, null);
			expect(cards.expenseWithIva).toBe(121);
		});

		it('matches debe + payments, so the two can never diverge', () => {
			const periodRows = [row({ expenseNet: 100, expenseIva: 21, paymentAmount: 50 })];
			const cards = buildSummaryCards(periodRows, null);
			expect(cards.debe).toBe(roundToTwoDecimals(cards.expenseWithIva - cards.payments));
		});
	});
});

describe('buildMonthlyChartData', () => {
	it('always returns 12 months, zero-filled for months with no data', () => {
		const data = buildMonthlyChartData([], null);
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
		const data = buildMonthlyChartData(rows, 1);
		expect(data[2]).toEqual(expect.objectContaining({ month: 3, incomeNet: 100, expenseNet: 40 }));
	});
});

describe('buildMonthlyCollectionsPaymentsChartData (Cobros vs Pagos)', () => {
	it('always returns 12 months, zero-filled for months with no data', () => {
		const data = buildMonthlyCollectionsPaymentsChartData([], null);
		expect(data).toHaveLength(12);
		expect(data.every((d) => d.collections === 0 && d.payments === 0)).toBe(true);
		expect(data[0].label).toBe('Ene');
		expect(data[11].label).toBe('Dic');
	});

	it('computes collections/payments per month from collectionAmount/paymentAmount', () => {
		const rows = [
			row({ month: 3, workId: 1, collectionAmount: 500, paymentAmount: 200 }),
			row({ month: 3, workId: 2, collectionAmount: 300, paymentAmount: 100 }),
		];
		const data = buildMonthlyCollectionsPaymentsChartData(rows, null);
		expect(data[2]).toEqual(expect.objectContaining({ month: 3, collections: 800, payments: 300 }));
	});

	it('gives zeros for a month with no data', () => {
		const rows = [row({ month: 3, collectionAmount: 500, paymentAmount: 200 })];
		const data = buildMonthlyCollectionsPaymentsChartData(rows, null);
		expect(data[0]).toEqual(expect.objectContaining({ month: 1, collections: 0, payments: 0 }));
	});

	it('the sum of the 12 months of payments/collections equals the Pagos/Cobros KPI cards (Todos)', () => {
		const rows = [
			row({ month: 1, workId: 1, collectionAmount: 500, paymentAmount: 200 }),
			row({ month: 2, workId: null, collectionAmount: 300, paymentAmount: 100 }),
			row({ month: 6, workId: 2, collectionAmount: 50, paymentAmount: 400 }),
		];

		const chart = buildMonthlyCollectionsPaymentsChartData(rows, null);
		const chartPaymentsSum = roundToTwoDecimals(chart.reduce((sum, p) => sum + p.payments, 0));
		const chartCollectionsSum = roundToTwoDecimals(
			chart.reduce((sum, p) => sum + p.collections, 0)
		);

		const cards = buildSummaryCards(rows, null);
		expect(chartPaymentsSum).toBe(cards.payments);
		expect(chartCollectionsSum).toBe(cards.collections);
	});

	it('the sum of the 12 months of payments/collections equals the Pagos/Cobros KPI cards (one obra)', () => {
		const rows = [
			row({ month: 1, workId: 1, collectionAmount: 500, paymentAmount: 200 }),
			row({ month: 2, workId: 1, collectionAmount: 300, paymentAmount: 100 }),
			row({ month: 6, workId: 2, collectionAmount: 50, paymentAmount: 400 }),
		];

		const chart = buildMonthlyCollectionsPaymentsChartData(rows, 1);
		const chartPaymentsSum = roundToTwoDecimals(chart.reduce((sum, p) => sum + p.payments, 0));
		const chartCollectionsSum = roundToTwoDecimals(
			chart.reduce((sum, p) => sum + p.collections, 0)
		);

		const cards = buildSummaryCards(rows, 1);
		expect(chartPaymentsSum).toBe(cards.payments);
		expect(chartCollectionsSum).toBe(cards.collections);
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
