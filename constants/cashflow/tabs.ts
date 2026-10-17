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

export const CASH_FLOW_TABS: {
	value: CashFlowTabValue;
	label: string;
	title: string;
	description: string;
}[] = [
	{
		value: 'summary',
		label: 'Resumen',
		title: 'Resumen',
		description: 'Vista general de ingresos, gastos y resultado por obra y por mes.',
	},
	{
		value: 'incomes',
		label: 'Ingresos',
		title: 'Ingresos',
		description:
			'Solo FACTURAS de venta / certificaciones. También se pueden configurar los tipos de comprobante y las categorías.',
	},
	{
		value: 'expenses',
		label: 'Gastos',
		title: 'Gastos',
		description:
			'Solo FACTURAS de compra. También se pueden configurar los tipos de comprobante y las categorías.',
	},
	{
		value: 'collections',
		label: 'Cobros',
		title: 'Cobros',
		description:
			'Cobranzas recibidas de clientes. Alimenta la Cuenta Corriente (HABER de clientes). También se pueden configurar las categorías de cobros.',
	},
	{
		value: 'payments',
		label: 'Pagos',
		title: 'Pagos',
		description:
			'Pagos realizados a proveedores. Alimenta la Cuenta Corriente (HABER de proveedores). También se pueden configurar las categorías de pagos.',
	},
	{
		value: 'fixed-expenses',
		label: 'Costos fijos',
		title: 'Costos fijos',
		description:
			'Gastos de estructura que no pertenecen a una obra puntual (alquiler, sueldos, seguros, etc.). Impactan en Bancos y en el resumen general.',
	},
	{
		value: 'checking-accounts',
		label: 'Cuentas corrientes',
		title: 'Cuentas corrientes',
		description: 'Saldos y movimientos con clientes y proveedores.',
	},
	{
		value: 'suppliers',
		label: 'Proveedores',
		title: 'Proveedores',
		description:
			'Alta y gestión de proveedores. Gestión de DEBE y HABER con proveedores, en base a la carga de compras y los pagos.',
	},
	{
		value: 'bank-accounts',
		label: 'Bancos y Caja',
		title: 'Bancos y Caja',
		description:
			'Cuentas bancarias y sus movimientos. Se puede configurar el saldo inicial de cada cuenta editándola.',
	},
	{
		value: 'vat-settlement',
		label: 'Liquidación IVA',
		title: 'Liquidación IVA',
		description: 'Cálculo del IVA a liquidar.',
	},
];
