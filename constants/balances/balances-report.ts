export const BALANCES_REPORT_TITLE = 'Cuentas corrientes';

export const BALANCES_REPORT_COLUMNS = {
	contractDate: 'FECHA DE VENTA',
	client: 'CLIENTE',
	work: 'OBRA',
	concept: 'CONCEPTO',
	purchase: 'COMPRA',
	deliveries: 'ENTREGAS',
	balanceType: 'TIPO DE CUENTA CORRIENTE',
	balanceAmount: 'MONTO',
} as const;

export const BALANCE_TYPES = {
	DEBTOR: 'DEUDOR',
	CREDITOR: 'ACREEDOR',
	CANCELLED: 'SALDADO',
	TOTAL: 'TOTAL',
} as const;

export const DEFAULT_FALLBACK = '-';

export const BALANCE_FILTER_DEFAULTS = {
	balanceType: 'all',
	minPurchaseArs: '',
	maxPurchaseArs: '',
	minDeliveriesArs: '',
	maxDeliveriesArs: '',
	minBalanceArs: '',
	maxBalanceArs: '',
} as const;

export const BALANCE_FILTER_LABELS = {
	balanceType: 'Tipo de cuenta corriente',
	minPurchaseArs: 'Compra ARS mínima',
	maxPurchaseArs: 'Compra ARS máxima',
	minDeliveriesArs: 'Entregas ARS mínimas',
	maxDeliveriesArs: 'Entregas ARS máximas',
	minBalanceArs: 'Monto de cuenta corriente mínima (ARS)',
	maxBalanceArs: 'Monto de cuenta corriente máxima (ARS)',
} as const;
