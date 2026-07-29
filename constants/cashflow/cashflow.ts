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
