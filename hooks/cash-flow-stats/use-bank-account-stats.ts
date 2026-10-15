'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BankAccount } from '@/lib/cash-flow/cash-flow';
import { listPaymentMethods, PaymentMethod } from '@/lib/payment-methods/payment-methods';
import { getMovementTotals, MovementTotal } from '@/lib/cash-flow-stats/cash-flow-stats';
import { getMonthRange } from '@/helpers/cash-flow-stats/cash-flow-stats';
import { MONTH_LABELS_ES } from '@/helpers/fixed-expenses/fixed-expenses-summary';
import { FUTURE_YEARS_AHEAD, PAST_YEARS_BACK } from '@/constants/cashflow/fixed-expenses';
import { getLocalDate } from '@/utils/format-date';
import { translateError } from '@/lib/error-translator';

export type MonthOption = { value: number; label: string }; // 0 = "Todos"

function toMonthFilter(month: number): number | null {
	return month === 0 ? null : month;
}

export function useBankAccountStats(bankAccounts: BankAccount[]) {
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
	const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
	const [allTimeByAccount, setAllTimeByAccount] = useState<MovementTotal[]>([]);
	const [periodByAccount, setPeriodByAccount] = useState<MovementTotal[]>([]);
	const [periodByMethod, setPeriodByMethod] = useState<MovementTotal[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const requestIdRef = useRef(0);

	const fetchStats = useCallback(async () => {
		const requestId = ++requestIdRef.current;
		setLoading(true);
		setError(null);
		try {
			const { start, end } = getMonthRange(year, toMonthFilter(month));
			const [methodsRes, allTimeRes, periodAccountRes, periodMethodRes] = await Promise.all([
				listPaymentMethods(),
				getMovementTotals('bank_account', null, null),
				getMovementTotals('bank_account', start, end),
				getMovementTotals('payment_method', start, end),
			]);
			if (methodsRes.error) throw methodsRes.error;
			if (allTimeRes.error) throw allTimeRes.error;
			if (periodAccountRes.error) throw periodAccountRes.error;
			if (periodMethodRes.error) throw periodMethodRes.error;
			if (requestId !== requestIdRef.current) return;
			setPaymentMethods(methodsRes.data ?? []);
			setAllTimeByAccount(allTimeRes.data ?? []);
			setPeriodByAccount(periodAccountRes.data ?? []);
			setPeriodByMethod(periodMethodRes.data ?? []);
		} catch (err) {
			if (requestId !== requestIdRef.current) return;
			setError(translateError(err) || 'No se pudieron cargar las estadísticas de cuentas.');
		} finally {
			if (requestId === requestIdRef.current) setLoading(false);
		}
	}, [year, month]);

	useEffect(() => {
		void fetchStats();
	}, [fetchStats]);

	return {
		year,
		setYear,
		yearOptions,
		month,
		setMonth,
		monthOptions,
		bankAccounts,
		paymentMethods,
		allTimeByAccount,
		periodByAccount,
		periodByMethod,
		loading,
		error,
		retry: fetchStats,
	};
}

export type UseBankAccountStatsReturn = ReturnType<typeof useBankAccountStats>;
