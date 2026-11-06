import { SummaryMonthlyRow } from '@/lib/cash-flow-stats/cash-flow-summary';
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

export type SummaryCards = {
	incomeNet: number;
	expenseNet: number;
	expenseWithIva: number; // gastos + IVA gastos
	debe: number; // expenseWithIva - pagos
	collections: number;
	payments: number;
	ivaOfMonth: number;
};

export function buildSummaryCards(
	periodRows: SummaryMonthlyRow[],
	workId: number | null
): SummaryCards {
	const totals = sumByWork(periodRows, workId);

	const incomeNet = totals.incomeNet;
	const expenseNet = totals.expenseNet;
	const payments = totals.paymentAmount;
	const ivaOfMonth = roundToTwoDecimals(totals.expenseIva - totals.incomeIva);
	const expenseWithIva = roundToTwoDecimals(totals.expenseNet + totals.expenseIva);
	const debe = roundToTwoDecimals(expenseWithIva - payments);

	return {
		incomeNet,
		expenseNet,
		expenseWithIva,
		debe,
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
	workId: number | null
): MonthlyChartPoint[] {
	return MONTH_LABELS_ES.map((label, index) => {
		const month = index + 1;
		const totals = sumByWork(
			rows.filter((row) => row.month === month),
			workId
		);
		return {
			month,
			label,
			incomeNet: totals.incomeNet,
			expenseNet: totals.expenseNet,
		};
	});
}

export type MonthlyCollectionsPaymentsPoint = {
	month: number;
	label: string;
	collections: number;
	payments: number;
};

export function buildMonthlyCollectionsPaymentsChartData(
	rows: SummaryMonthlyRow[],
	workId: number | null
): MonthlyCollectionsPaymentsPoint[] {
	return MONTH_LABELS_ES.map((label, index) => {
		const month = index + 1;
		const totals = sumByWork(
			rows.filter((row) => row.month === month),
			workId
		);
		return {
			month,
			label,
			collections: totals.collectionAmount,
			payments: totals.paymentAmount,
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
