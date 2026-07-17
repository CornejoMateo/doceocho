import { useState } from 'react';
import type { BudgetFilters } from '@/components/business/reports/budgets/types';
import { BUDGET_FILTER_DEFAULTS } from '@/constants/budgets/budgets-report';

export function useBudgetFilters() {
	const [filters, setFilters] = useState<BudgetFilters>(BUDGET_FILTER_DEFAULTS);
	const [filterDialogOpen, setFilterDialogOpen] = useState(false);

	const updateFilter = (key: keyof BudgetFilters, value: string) => {
		setFilters((prev) => ({ ...prev, [key]: value }));
	};

	const updateFilters = (newFilters: BudgetFilters) => {
		setFilters(newFilters);
	};

	const resetFilters = () => {
		setFilters(BUDGET_FILTER_DEFAULTS);
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
