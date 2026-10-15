'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Work, listWorks } from '@/lib/works/works';
import {
	getSummaryMonthly,
	getFixedCostsMonthly,
	SummaryMonthlyRow,
	FixedCostsMonthlyRow,
} from '@/lib/cash-flow-stats/cash-flow-summary';
import {
	filterByMonth,
	buildSummaryCards,
	buildMonthlyChartData,
	buildWorkResultRows,
} from '@/helpers/cash-flow-stats/cash-flow-summary';
import { MONTH_LABELS_ES } from '@/helpers/fixed-expenses/fixed-expenses-summary';
import { FUTURE_YEARS_AHEAD, PAST_YEARS_BACK } from '@/constants/cashflow/fixed-expenses';
import { getLocalDate } from '@/utils/format-date';
import { translateError } from '@/lib/error-translator';

export type MonthOption = { value: number; label: string }; // 0 = "Todos"
export type WorkOption = { value: number; label: string }; // 0 = "Todos"

// month/work 0 means "Todos" in the selects; the pure helpers expect null for that case.
function toFilter(value: number): number | null {
	return value === 0 ? null : value;
}

export function useSummaryTab() {
	const currentYear = Number(getLocalDate().slice(0, 4));
	const yearOptions = useMemo(
		() =>
			Array.from(
				{ length: FUTURE_YEARS_AHEAD + PAST_YEARS_BACK + 1 },
				(_, i) => currentYear + FUTURE_YEARS_AHEAD - i
			),
		[currentYear]
	);
	const monthOptions: MonthOption[] = useMemo(
		() => [
			{ value: 0, label: 'Todos' },
			...MONTH_LABELS_ES.map((label, i) => ({ value: i + 1, label })),
		],
		[]
	);

	const [year, setYear] = useState(currentYear);
	const [month, setMonth] = useState(0);
	const [workId, setWorkId] = useState(0);
	const [works, setWorks] = useState<Work[]>([]);
	const [rows, setRows] = useState<SummaryMonthlyRow[]>([]);
	const [fixedCostRows, setFixedCostRows] = useState<FixedCostsMonthlyRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const requestIdRef = useRef(0);

	const fetchSummary = useCallback(async () => {
		const requestId = ++requestIdRef.current;
		setLoading(true);
		setError(null);
		try {
			const [worksRes, summaryRes, fixedCostsRes] = await Promise.all([
				listWorks(),
				getSummaryMonthly(year),
				getFixedCostsMonthly(year),
			]);
			if (worksRes.error) throw worksRes.error;
			if (summaryRes.error) throw summaryRes.error;
			if (fixedCostsRes.error) throw fixedCostsRes.error;
			if (requestId !== requestIdRef.current) return;
			setWorks(worksRes.data ?? []);
			setRows(summaryRes.data ?? []);
			setFixedCostRows(fixedCostsRes.data ?? []);
		} catch (err) {
			if (requestId !== requestIdRef.current) return;
			setError(translateError(err) || 'No se pudo cargar el resumen.');
		} finally {
			if (requestId === requestIdRef.current) setLoading(false);
		}
	}, [year]);

	useEffect(() => {
		void fetchSummary();
	}, [fetchSummary]);

	const workOptions: WorkOption[] = useMemo(
		() => [
			{ value: 0, label: 'Todos' },
			...works.map((work) => ({ value: work.id, label: work.name || `Obra #${work.id}` })),
		],
		[works]
	);

	const workFilter = toFilter(workId);
	const monthFilter = toFilter(month);

	const periodRows = useMemo(() => filterByMonth(rows, monthFilter), [rows, monthFilter]);
	const periodFixedCosts = useMemo(
		() => filterByMonth(fixedCostRows, monthFilter),
		[fixedCostRows, monthFilter]
	);

	const cards = useMemo(
		() => buildSummaryCards(periodRows, periodFixedCosts, workFilter),
		[periodRows, periodFixedCosts, workFilter]
	);
	const chartData = useMemo(
		() => buildMonthlyChartData(rows, fixedCostRows, workFilter),
		[rows, fixedCostRows, workFilter]
	);
	const workNames = useMemo(
		() => new Map(works.map((w) => [w.id, w.name || `Obra #${w.id}`])),
		[works]
	);
	const workResultRows = useMemo(
		() => buildWorkResultRows(periodRows, workNames),
		[periodRows, workNames]
	);

	return {
		year,
		setYear,
		yearOptions,
		month,
		setMonth,
		monthOptions,
		workId,
		setWorkId,
		workOptions,
		cards,
		chartData,
		workResultRows,
		loading,
		error,
		retry: fetchSummary,
	};
}

export type UseSummaryTabReturn = ReturnType<typeof useSummaryTab>;
