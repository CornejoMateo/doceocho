import type { BudgetReportRow, BudgetFilters } from '@/components/business/reports/budgets/types';
import { parseArsToNumber } from '@/utils/formats-money';

/**
 * Applies advanced filters to budget report rows
 * @param rows - The budget rows to filter
 * @param filters - The filter criteria
 * @returns Filtered budget rows
 */
export function applyBudgetFilters(
	rows: BudgetReportRow[],
	filters: BudgetFilters
): BudgetReportRow[] {
	let filtered = rows;

	// Filter by status
	if (filters.status !== 'all') {
		filtered = filtered.filter((r) => r.status === filters.status);
	}

	// Filter by minimum ARS amount
	if (filters.minAmountArs) {
		const minArs = parseArsToNumber(filters.minAmountArs);
		if (!isNaN(minArs)) {
			filtered = filtered.filter((r) => r.amountArs >= minArs);
		}
	}

	// Filter by maximum ARS amount
	if (filters.maxAmountArs) {
		const maxArs = parseArsToNumber(filters.maxAmountArs);
		if (!isNaN(maxArs)) {
			filtered = filtered.filter((r) => r.amountArs <= maxArs);
		}
	}

	// Filter by minimum USD amount
	if (filters.minAmountUsd) {
		const minUsd = parseArsToNumber(filters.minAmountUsd);
		if (!isNaN(minUsd)) {
			filtered = filtered.filter((r) => r.amountUsd >= minUsd);
		}
	}

	// Filter by maximum USD amount
	if (filters.maxAmountUsd) {
		const maxUsd = parseArsToNumber(filters.maxAmountUsd);
		if (!isNaN(maxUsd)) {
			filtered = filtered.filter((r) => r.amountUsd <= maxUsd);
		}
	}

	return filtered;
}

/**
 * Checks if any filter is active (non-default)
 * @param filters - The filter criteria
 * @returns True if any filter is active
 */
export function hasActiveFilters(filters: BudgetFilters): boolean {
	return (
		filters.status !== 'all' ||
		filters.minAmountArs !== '' ||
		filters.maxAmountArs !== '' ||
		filters.minAmountUsd !== '' ||
		filters.maxAmountUsd !== ''
	);
}
