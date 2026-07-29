export const PAYMENT_METHODS = [
	{ value: 'cash', label: 'Efectivo' },
	{ value: 'credit_card', label: 'Tarjeta de Crédito' },
	{ value: 'debit_card', label: 'Tarjeta de Débito' },
	{ value: 'bank_transfer', label: 'Transferencia Bancaria' },
	{ value: 'check', label: 'Cheque fisico' },
	{ value: 'echeck', label: 'Echeck' },
	{ value: 'dollar', label: 'Dólar' },
	{ value: 'other', label: 'Otro' },
];

export const getPaymentMethodLabel = (value: string): string => {
	const method = PAYMENT_METHODS.find((method) => method.value === value);
	return method ? method.label : value ? value : 'Método desconocido';
};
