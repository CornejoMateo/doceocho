export const EXPENSES_CATEGORIES = [
	{ value: 'salary', label: 'Pago de Sueldo' },
	{ value: 'suppliers', label: 'Pago a Proveedores' },
	{ value: 'services', label: 'Servicios' },
	{ value: 'other', label: 'Otros Gastos' },
];

export const getExpenseCategoryLabel = (value: string): string => {
	const category = EXPENSES_CATEGORIES.find((category) => category.value === value);
	return category ? category.label : value ? value : 'Categoría desconocida';
};

export const ACCOUNT_TYPES = [
	{ value: 'checking', label: 'Cuenta Corriente' },
	{ value: 'savings', label: 'Caja de Ahorro' },
	{ value: 'other', label: 'Otro' },
];

export const getAccountTypeLabel = (value: string): string => {
	const accountType = ACCOUNT_TYPES.find((type) => type.value === value);
	return accountType ? accountType.label : value ? value : 'Tipo de cuenta desconocido';
};
