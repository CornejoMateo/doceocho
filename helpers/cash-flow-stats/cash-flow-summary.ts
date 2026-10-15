import { SummaryMonthlyRow, FixedCostsMonthlyRow } from '@/lib/cash-flow-stats/cash-flow-summary';
import { roundToTwoDecimals } from '@/utils/formats-money';
import { MONTH_LABELS_ES } from '@/helpers/fixed-expenses/fixed-expenses-summary';

export function filterByMonth<T extends { month: number }>(rows: T[], month: number | null): T[] {
	if (!month) return rows;
	return rows.filter((row) => row.month === month);
}

type SummaryTotals = {
	incomeNet: number;
	incomeIva: number;
	expenseNet: number;
	expenseIva: number;
	collectionAmount: number;
	paymentAmount: number;
};

export function sumByWork(rows: SummaryMonthlyRow[], workId: number | null): SummaryTotals {
	const relevant = workId === null ? rows : rows.filter((row) => row.workId === workId);
	const totals = relevant.reduce<SummaryTotals>(
		(acc, row) => ({
			incomeNet: acc.incomeNet + row.incomeNet,
			incomeIva: acc.incomeIva + row.incomeIva,
			expenseNet: acc.expenseNet + row.expenseNet,
			expenseIva: acc.expenseIva + row.expenseIva,
			collectionAmount: acc.collectionAmount + row.collectionAmount,
			paymentAmount: acc.paymentAmount + row.paymentAmount,
		}),
		{
			incomeNet: 0,
			incomeIva: 0,
			expenseNet: 0,
			expenseIva: 0,
			collectionAmount: 0,
			paymentAmount: 0,
		}
	);
	return {
		incomeNet: roundToTwoDecimals(totals.incomeNet),
		incomeIva: roundToTwoDecimals(totals.incomeIva),
		expenseNet: roundToTwoDecimals(totals.expenseNet),
		expenseIva: roundToTwoDecimals(totals.expenseIva),
		collectionAmount: roundToTwoDecimals(totals.collectionAmount),
		paymentAmount: roundToTwoDecimals(totals.paymentAmount),
	};
}

function sumFixedCosts(rows: FixedCostsMonthlyRow[]): { net: number; iva: number; total: number } {
	const totals = rows.reduce(
		(acc, row) => ({
			net: acc.net + row.net,
			iva: acc.iva + row.iva,
			total: acc.total + row.total,
		}),
		{ net: 0, iva: 0, total: 0 }
	);
	return {
		net: roundToTwoDecimals(totals.net),
		iva: roundToTwoDecimals(totals.iva),
		total: roundToTwoDecimals(totals.total),
	};
}

export type SummaryCards = {
	incomeNet: number;
	expenseNet: number;
	margin: number;
	profitability: number; // ratio (margin/income), 0 when income is 0. Multiply by 100 for %.
	collections: number;
	payments: number;
	ivaOfMonth: number; // (IVA gastos + IVA costos fijos) - IVA ingresos. Crédito - débito.
};

export function buildSummaryCards(
	periodRows: SummaryMonthlyRow[],
	periodFixedCosts: FixedCostsMonthlyRow[],
	workId: number | null
): SummaryCards {
	const totals = sumByWork(periodRows, workId);
	const fixed = workId === null ? sumFixedCosts(periodFixedCosts) : { net: 0, iva: 0, total: 0 };

	const incomeNet = totals.incomeNet;
	const expenseNet = roundToTwoDecimals(totals.expenseNet + fixed.net);
	const margin = roundToTwoDecimals(incomeNet - expenseNet);
	const profitability = incomeNet === 0 ? 0 : margin / incomeNet;
	const payments = roundToTwoDecimals(totals.paymentAmount + fixed.total);
	const ivaOfMonth = roundToTwoDecimals(totals.expenseIva + fixed.iva - totals.incomeIva);

	return {
		incomeNet,
		expenseNet,
		margin,
		profitability,
		collections: totals.collectionAmount,
		payments,
		ivaOfMonth,
	};
}

export type MonthlyChartPoint = {
	month: number;
	label: string;
	incomeNet: number;
	expenseNet: number;
};

export function buildMonthlyChartData(
	rows: SummaryMonthlyRow[],
	fixedCostRows: FixedCostsMonthlyRow[],
	workId: number | null
): MonthlyChartPoint[] {
	const fixedByMonth = new Map(fixedCostRows.map((row) => [row.month, row.net]));

	return MONTH_LABELS_ES.map((label, index) => {
		const month = index + 1;
		const totals = sumByWork(
			rows.filter((row) => row.month === month),
			workId
		);
		const fixedNet = workId === null ? (fixedByMonth.get(month) ?? 0) : 0;
		return {
			month,
			label,
			incomeNet: totals.incomeNet,
			expenseNet: roundToTwoDecimals(totals.expenseNet + fixedNet),
		};
	});
}

export type WorkResultRow = {
	workId: number;
	workName: string;
	incomeNet: number;
	expenseNet: number;
	result: number;
};

export function buildWorkResultRows(
	periodRows: SummaryMonthlyRow[],
	workNames: Map<number, string>
): WorkResultRow[] {
	const totalsByWork = new Map<number, { incomeNet: number; expenseNet: number }>();

	for (const row of periodRows) {
		if (row.workId === null) continue;
		const current = totalsByWork.get(row.workId) ?? { incomeNet: 0, expenseNet: 0 };
		totalsByWork.set(row.workId, {
			incomeNet: current.incomeNet + row.incomeNet,
			expenseNet: current.expenseNet + row.expenseNet,
		});
	}

	const rows: WorkResultRow[] = Array.from(totalsByWork.entries()).map(([workId, totals]) => {
		const incomeNet = roundToTwoDecimals(totals.incomeNet);
		const expenseNet = roundToTwoDecimals(totals.expenseNet);
		return {
			workId,
			workName: workNames.get(workId) ?? `Obra #${workId}`,
			incomeNet,
			expenseNet,
			result: roundToTwoDecimals(incomeNet - expenseNet),
		};
	});

	return rows.sort((a, b) => b.result - a.result);
}
