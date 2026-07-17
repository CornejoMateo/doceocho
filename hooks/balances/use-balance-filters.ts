import { useState } from 'react';
import type { BalanceFilters } from '@/components/business/reports/balances/types';
import { BALANCE_FILTER_DEFAULTS } from '@/constants/balances/balances-report';

export function useBalanceFilters() {
	const [filters, setFilters] = useState<BalanceFilters>(BALANCE_FILTER_DEFAULTS);
	const [filterDialogOpen, setFilterDialogOpen] = useState(false);

	const updateFilter = (key: keyof BalanceFilters, value: string) => {
		setFilters((prev) => ({ ...prev, [key]: value }));
	};

	const updateFilters = (newFilters: BalanceFilters) => {
		setFilters(newFilters);
	};

	const resetFilters = () => {
		setFilters(BALANCE_FILTER_DEFAULTS);
	};

	return {
		filters,
		setFilters,
		updateFilter,
		updateFilters,
		resetFilters,
		filterDialogOpen,
		setFilterDialogOpen,
	};
}
