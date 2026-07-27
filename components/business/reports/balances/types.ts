export interface BalanceReportRow {
	id: number;
	contractDate: string;
	contractDateRaw: Date;
	client: string;
	work: string;
	concept: string;
	purchaseArs: number;
	deliveriesArs: number;
	balanceType: string;
	balanceAmountArs: number;
	usdContractRef: number;
	usdCurrentToCancel: number | null;
	balanceInUseUsd: number;
}

export interface BalanceFilters {
	balanceType: string;
	minPurchaseArs: string;
	maxPurchaseArs: string;
	minDeliveriesArs: string;
	maxDeliveriesArs: string;
	minBalanceArs: string;
	maxBalanceArs: string;
}

export interface BalanceFilterDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	filters: BalanceFilters;
	onFiltersChange: (filters: BalanceFilters) => void;
	onReset: () => void;
}
