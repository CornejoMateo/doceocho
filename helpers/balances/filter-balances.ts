import type {
	BalanceReportRow,
	BalanceFilters,
} from '@/components/business/reports/balances/types';
import { parseArsToNumber } from '@/utils/formats-money';

/**
 * Applies advanced filters to balance report rows
 * @param rows - The balance rows to filter
 * @param filters - The filter criteria
 * @returns Filtered balance rows
 */
export function applyBalanceFilters(
	rows: BalanceReportRow[],
	filters: BalanceFilters
): BalanceReportRow[] {
	let filtered = rows;

	// Filter by balance type
	if (filters.balanceType !== 'all') {
		filtered = filtered.filter((r) => r.balanceType === filters.balanceType);
	}

	// Filter by minimum purchase ARS amount
	if (filters.minPurchaseArs) {
		const minPurchase = parseArsToNumber(filters.minPurchaseArs);
		if (!isNaN(minPurchase)) {
			filtered = filtered.filter((r) => r.purchaseArs >= minPurchase);
		}
	}

	// Filter by maximum purchase ARS amount
	if (filters.maxPurchaseArs) {
		const maxPurchase = parseArsToNumber(filters.maxPurchaseArs);
		if (!isNaN(maxPurchase)) {
			filtered = filtered.filter((r) => r.purchaseArs <= maxPurchase);
		}
	}

	// Filter by minimum deliveries ARS amount
	if (filters.minDeliveriesArs) {
		const minDeliveries = parseArsToNumber(filters.minDeliveriesArs);
		if (!isNaN(minDeliveries)) {
			filtered = filtered.filter((r) => r.deliveriesArs >= minDeliveries);
		}
	}

	// Filter by maximum deliveries ARS amount
	if (filters.maxDeliveriesArs) {
		const maxDeliveries = parseArsToNumber(filters.maxDeliveriesArs);
		if (!isNaN(maxDeliveries)) {
			filtered = filtered.filter((r) => r.deliveriesArs <= maxDeliveries);
		}
	}

	// Filter by minimum balance ARS amount
	if (filters.minBalanceArs) {
		const minBalance = parseArsToNumber(filters.minBalanceArs);
		if (!isNaN(minBalance)) {
			filtered = filtered.filter((r) => r.balanceAmountArs >= minBalance);
		}
	}

	// Filter by maximum balance ARS amount
	if (filters.maxBalanceArs) {
		const maxBalance = parseArsToNumber(filters.maxBalanceArs);
		if (!isNaN(maxBalance)) {
			filtered = filtered.filter((r) => r.balanceAmountArs <= maxBalance);
		}
	}

	return filtered;
}

/**
 * Checks if any filter is active (non-default)
 * @param filters - The filter criteria
 * @returns True if any filter is active
 */
export function hasActiveFilters(filters: BalanceFilters): boolean {
	return (
		filters.balanceType !== 'all' ||
		filters.minPurchaseArs !== '' ||
		filters.maxPurchaseArs !== '' ||
		filters.minDeliveriesArs !== '' ||
		filters.maxDeliveriesArs !== '' ||
		filters.minBalanceArs !== '' ||
		filters.maxBalanceArs !== ''
	);
}
