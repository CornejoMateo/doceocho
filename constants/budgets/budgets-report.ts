export const BUDGETS_REPORT_TITLE = 'Presupuestos';

export const BUDGETS_REPORT_COLUMNS = {
	date: 'FECHA',
	client: 'CLIENTE',
	number: 'NÚMERO',
	type: 'TIPO',
	work: 'OBRA',
	amountArs: 'MONTO ARS',
	amountUsd: 'MONTO USD',
	status: 'ESTADO',
} as const;

export const BUDGET_STATUS = {
	PENDING: 'Pendiente',
	ACCEPTED: 'Aceptado',
	SOLD: 'Vendido',
} as const;

export const BUDGET_FILTER_DEFAULTS = {
	status: 'all',
	minAmountArs: '',
	maxAmountArs: '',
	minAmountUsd: '',
	maxAmountUsd: '',
} as const;

export const BUDGET_FILTER_LABELS = {
	status: 'Estado',
	minAmountArs: 'Monto mínimo ARS',
	maxAmountArs: 'Monto máximo ARS',
	minAmountUsd: 'Monto mínimo USD',
	maxAmountUsd: 'Monto máximo USD',
} as const;
