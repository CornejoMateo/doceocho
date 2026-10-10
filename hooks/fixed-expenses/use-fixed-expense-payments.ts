'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CashFlowCategory } from '@/lib/categories/categories';
import {
	FixedExpensePaymentWithDetails,
	listFixedExpensePayments,
} from '@/lib/fixed-expenses/fixed-expense-payments';
import {
	computeFixedExpensePaymentTotals,
	groupFixedExpensePaymentsByCategory,
	groupFixedExpensePaymentsByMonth,
} from '@/helpers/fixed-expenses/fixed-expenses-summary';
import { getLocalDate } from '@/utils/format-date';
import { translateError } from '@/lib/error-translator';
import { FUTURE_YEARS_AHEAD, PAST_YEARS_BACK } from '@/constants/cashflow/fixed-expenses';

export function useFixedExpensePayments(categories: CashFlowCategory[]) {
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
	const [payments, setPayments] = useState<FixedExpensePaymentWithDetails[]>([]);
	const [loadingPayments, setLoadingPayments] = useState(false);
	const [paymentsError, setPaymentsError] = useState<string | null>(null);
	const paymentsRequestIdRef = useRef(0);

	const paymentTotals = useMemo(() => computeFixedExpensePaymentTotals(payments), [payments]);
	const paymentsByMonth = useMemo(() => groupFixedExpensePaymentsByMonth(payments), [payments]);
	const paymentsByCategory = useMemo(
		() => groupFixedExpensePaymentsByCategory(payments, categories),
		[payments, categories]
	);

	const fetchPayments = async (targetYear: number) => {
		const requestId = ++paymentsRequestIdRef.current;
		setLoadingPayments(true);
		setPaymentsError(null);
		try {
			const { data, error } = await listFixedExpensePayments({ year: targetYear });
			if (error) throw error;
			if (requestId !== paymentsRequestIdRef.current) return;
			setPayments(data ?? []);
		} catch (error) {
			if (requestId !== paymentsRequestIdRef.current) return;
			setPaymentsError(translateError(error) || 'No se pudieron cargar los pagos.');
		} finally {
			if (requestId === paymentsRequestIdRef.current) setLoadingPayments(false);
		}
	};

	useEffect(() => {
		void fetchPayments(year);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [year]);

	return {
		year,
		setYear,
		yearOptions,
		payments,
		loadingPayments,
		paymentsError,
		fetchPayments,
		paymentTotals,
		paymentsByMonth,
		paymentsByCategory,
	};
}
