export const ACCOUNT_TYPES = [
	{ value: 'checking', label: 'Cuenta Corriente' },
	{ value: 'savings', label: 'Caja de Ahorro' },
	{ value: 'other', label: 'Otro' },
];

export const getAccountTypeLabel = (value: string): string => {
	const accountType = ACCOUNT_TYPES.find((type) => type.value === value);
	return accountType ? accountType.label : value ? value : 'Tipo de cuenta desconocido';
};
