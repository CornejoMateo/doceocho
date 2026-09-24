import { useEffect, useMemo, useState } from 'react';
import { useOptimizedRealtime } from '@/hooks/use-optimized-realtime';
import { useBalanceFilters } from '@/hooks/balances/use-balance-filters';
import { formatShortDate } from '@/utils/format-date';
import { normalizeMoney } from '@/utils/formats-money';
import { calculateBalanceStats } from '@/helpers/balances/stats';
import { applyBalanceFilters } from '@/helpers/balances/filter-balances';
import { BALANCE_TYPES, DEFAULT_FALLBACK } from '@/constants/balances/balances-report';
import { BalanceWithBudgetAndClient, listBalancesForReport } from '@/lib/balances/balances';
import { getTotalsByBalanceIds } from '@/lib/balances/balance_transactions';
import type { BalanceReportRow } from '@/components/business/cash-flow/balances-tab/types';

const NOT_BUILT = Symbol('not-built');

export function useBalancesReport() {
	const [searchTerm, setSearchTerm] = useState('');
	const [rows, setRows] = useState<BalanceReportRow[]>([]);

	const [builtFor, setBuiltFor] = useState<unknown>(NOT_BUILT);
	const [buildError, setBuildError] = useState<string | null>(null);
	const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
	const [sortField, setSortField] = useState<keyof BalanceReportRow>('contractDate');
	const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

	const { filters, updateFilters, resetFilters, filterDialogOpen, setFilterDialogOpen } =
		useBalanceFilters();

	const stats = useMemo(() => calculateBalanceStats(rows), [rows]);

	const {
		data: balances,
		loading: realtimeLoading,
		error: realtimeError,
		refresh,
	} = useOptimizedRealtime<BalanceWithBudgetAndClient>(
		'balances',
		async () => {
			const { data } = await listBalancesForReport();
			return data ?? [];
		},
		'balances_report_cache'
	);

	// True until the async row build for the current balances has finished
	const isBuilding = builtFor !== balances;
	const loading = realtimeLoading || isBuilding;
	// Loading flag for the very first load only; later refreshes keep the rows visible
	const initialLoading = loading && !hasLoadedOnce;
	const error = buildError ?? realtimeError ?? null;

	useEffect(() => {
		if (!loading) setHasLoadedOnce(true);
	}, [loading]);

	useEffect(() => {
		let cancelled = false;

		const build = async () => {
			if (!balances?.length) {
				setRows([]);
				setBuildError(null);
				return;
			}

			const ids = balances.map((b) => b.id);
			const { data: totals, error } = await getTotalsByBalanceIds(ids);
			if (error || !totals) throw error ?? new Error('Sin datos de pagos');

			const next: BalanceReportRow[] = balances.map((b) => {
				const totalPaid = totals?.[b.id]?.totalAmount ?? 0;
				const totalPaidUSD = totals?.[b.id]?.totalAmountUSD ?? 0;
				const budgetUsd = b.balance_amount_usd ?? 0;
				const budgetArs = b.balance_amount_ars ?? 0;
				const remainingArs = normalizeMoney(budgetArs - totalPaid);
				const remainingUsd = normalizeMoney(budgetUsd - totalPaidUSD);

				const clientName =
					`${b.client?.last_name ?? ''} ${b.client?.name ?? ''}`.trim() || DEFAULT_FALLBACK;
				const workLocality = b.budget?.folder_budget?.work?.locality ?? '';
				const workAddress = b.budget?.folder_budget?.work?.address ?? '';
				const work =
					b.budget?.folder_budget?.work?.name ||
					`${workLocality}${workLocality && workAddress ? ' - ' : ''}${workAddress}`.trim() ||
					DEFAULT_FALLBACK;

				const conceptParts = [b.budget?.number ?? '', b.budget?.type ?? ''].filter(Boolean);
				const concept = conceptParts.join(' - ') || DEFAULT_FALLBACK;

				const usdContractRef = Number(b.contract_date_usd) || 0;

				const balanceType = b.is_settled
					? BALANCE_TYPES.CANCELLED
					: remainingArs > 0
						? BALANCE_TYPES.DEBTOR
						: remainingArs < 0
							? BALANCE_TYPES.CREDITOR
							: BALANCE_TYPES.CANCELLED;

				const contractDateRaw = new Date(b.start_date || b.created_at);

				return {
					id: b.id,
					contractDate: formatShortDate(b.start_date || b.created_at),
					contractDateRaw,
					client: clientName,
					work,
					concept,
					purchaseArs: budgetArs,
					deliveriesArs: totalPaid,
					balanceType,
					balanceAmountArs: remainingArs,
					usdContractRef,
					balanceInUseUsd: remainingUsd,
				};
			});

			if (!cancelled) {
				setRows(next);
				setBuildError(null);
			}
		};

		build()
			.catch((err) => {
				// Keep the previously built rows instead of showing wrong zeroed data
				console.error('Error building balances report:', err);
				if (!cancelled) {
					setBuildError(
						typeof err?.message === 'string' && err.message
							? err.message
							: 'Error al cargar las cuentas corrientes'
					);
				}
			})
			.finally(() => {
				if (!cancelled) setBuiltFor(balances);
			});

		return () => {
			cancelled = true;
		};
	}, [balances]);

	const filteredRows = useMemo(() => {
		let filtered = rows;

		// Apply advanced filters (balance type, amount ranges)
		filtered = applyBalanceFilters(filtered, filters);

		// Filter to text
		const s = searchTerm.trim().toLowerCase();
		if (s) {
			filtered = filtered.filter((r) => {
				return (
					r.client.toLowerCase().includes(s) ||
					r.work.toLowerCase().includes(s) ||
					r.concept.toLowerCase().includes(s) ||
					r.balanceType.toLowerCase().includes(s)
				);
			});
		}

		// Order
		return [...filtered].sort((a, b) => {
			let aVal = a[sortField];
			let bVal = b[sortField];

			// for date, use camp raw Date
			if (sortField === 'contractDate') {
				aVal = a.contractDateRaw;
				bVal = b.contractDateRaw;
			}

			// Management of strings vs numbers
			if (typeof aVal === 'string' && typeof bVal === 'string') {
				aVal = aVal.toLowerCase();
				bVal = bVal.toLowerCase();
			}

			if (aVal == null) aVal = '';
			if (bVal == null) bVal = '';
			if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
			if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
			return 0;
		});
	}, [rows, searchTerm, sortField, sortDirection, filters]);

	const handleSort = (field: keyof BalanceReportRow) => {
		if (sortField === field) {
			setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
		} else {
			setSortField(field);
			setSortDirection('asc');
		}
	};

	return {
		loading,
		initialLoading,
		error,
		hasRows: rows.length > 0,
		refresh,
		stats,
		filteredRows,
		searchTerm,
		setSearchTerm,
		sortField,
		sortDirection,
		handleSort,
		filters,
		updateFilters,
		resetFilters,
		filterDialogOpen,
		setFilterDialogOpen,
	};
}

export type BalancesReportState = ReturnType<typeof useBalancesReport>;
