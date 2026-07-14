export const BALANCES_REPORT_TITLE = 'Cuentas corrientes';

export const BALANCES_REPORT_COLUMNS = {
	contractDate: 'FECHA 1ER PRESUPUESTO CONTRATADO',
	client: 'CLIENTE',
	work: 'OBRA',
	concept: 'CONCEPTO',
	purchase: 'COMPRA',
	deliveries: 'ENTREGAS',
	balanceType: 'TIPO DE SALDO',
	balanceAmount: 'MONTO DE SALDO',
} as const;

export const BALANCE_TYPES = {
	DEBTOR: 'DEUDOR',
	CREDITOR: 'ACREEDOR',
	CANCELLED: 'CANCELADO',
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
	balanceType: 'Tipo de saldo',
	minPurchaseArs: 'Compra ARS mínima',
	maxPurchaseArs: 'Compra ARS máxima',
	minDeliveriesArs: 'Entregas ARS mínimas',
	maxDeliveriesArs: 'Entregas ARS máximas',
	minBalanceArs: 'Saldo ARS mínimo',
	maxBalanceArs: 'Saldo ARS máximo',
} as const;
