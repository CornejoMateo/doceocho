export interface BalanceReportRow {
	id: number;
	contractDate: string;
	contractDateRaw: Date;
	client: string;
	/** Null when the balance has no client; the name then shows as plain text. */
	clientId: number | null;
	work: string;
	concept: string;
	purchaseArs: number;
	deliveriesArs: number;
	balanceType: string;
	balanceAmountArs: number;
	usdContractRef: number;
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
