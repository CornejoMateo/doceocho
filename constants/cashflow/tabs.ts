export type CashFlowTabValue =
	| 'summary'
	| 'incomes'
	| 'expenses'
	| 'collections'
	| 'payments'
	| 'fixed-expenses'
	| 'checking-accounts'
	| 'suppliers'
	| 'bank-accounts'
	| 'vat-settlement';

export const CASH_FLOW_TABS: { value: CashFlowTabValue; label: string }[] = [
	{ value: 'summary', label: 'Resumen' },
	{ value: 'incomes', label: 'Ingresos' },
	{ value: 'expenses', label: 'Gastos' },
	{ value: 'collections', label: 'Cobros' },
	{ value: 'payments', label: 'Pagos' },
	{ value: 'fixed-expenses', label: 'Gastos fijos' },
	{ value: 'checking-accounts', label: 'Cuentas corrientes' },
	{ value: 'suppliers', label: 'Proveedores' },
	{ value: 'bank-accounts', label: 'Cuentas bancarias' },
	{ value: 'vat-settlement', label: 'Liquidación IVA' },
];
