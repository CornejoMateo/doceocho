'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSummaryMonthly, getFixedCostsMonthly } from '@/lib/cash-flow-stats/cash-flow-summary';
import {
	buildMonthlyChartData,
	MonthlyChartPoint,
} from '@/helpers/cash-flow-stats/cash-flow-summary';
import { FUTURE_YEARS_AHEAD, PAST_YEARS_BACK } from '@/constants/cashflow/fixed-expenses';
import { getLocalDate } from '@/utils/format-date';
import { translateError } from '@/lib/error-translator';

export function useMonthlyCashFlowTable() {
	const currentYear = Number(getLocalDate().slice(0, 4));
	const yearOptions = useMemo(
		() =>
			Array.from(
				{ length: FUTURE_YEARS_AHEAD + PAST_YEARS_BACK + 1 },
				(_, i) => currentYear + FUTURE_YEARS_AHEAD - i
			),
		[currentYear]
	);

	const [year, setYear] = useState(currentYear);
	const [chartData, setChartData] = useState<MonthlyChartPoint[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const requestIdRef = useRef(0);

	const fetchData = useCallback(async () => {
		const requestId = ++requestIdRef.current;
		setLoading(true);
		setError(null);
		try {
			const [summaryRes, fixedCostsRes] = await Promise.all([
				getSummaryMonthly(year),
				getFixedCostsMonthly(year),
			]);
			if (summaryRes.error) throw summaryRes.error;
			if (fixedCostsRes.error) throw fixedCostsRes.error;
			if (requestId !== requestIdRef.current) return;
			setChartData(buildMonthlyChartData(summaryRes.data ?? [], fixedCostsRes.data ?? [], null));
		} catch (err) {
			if (requestId !== requestIdRef.current) return;
			setError(translateError(err) || 'No se pudo cargar el flujo mensual.');
		} finally {
			if (requestId === requestIdRef.current) setLoading(false);
		}
	}, [year]);

	useEffect(() => {
		void fetchData();
	}, [fetchData]);

	return {
		year,
		setYear,
		yearOptions,
		chartData,
		loading,
		error,
		retry: fetchData,
	};
}

export type UseMonthlyCashFlowTableReturn = ReturnType<typeof useMonthlyCashFlowTable>;
