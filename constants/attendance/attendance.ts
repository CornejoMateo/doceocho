//modificar con la ubicación de la empresa
export const TARGET_LOCATION = {
	latitude: -33.13014693131956,
	longitude: -64.34463907854392,
};

export const DEFAULT_RADIUS_METERS = 50;

export const DEFAULT_PRICE_HOUR = 0;
export const DEFAULT_PRICE_HOUR_OVERTIME = 0;

export const ENTRY_TYPES = [
	{ value: 'regular_in', label: 'Entrada' },
	{ value: 'regular_out', label: 'Salida' },
	{ value: 'overtime_in', label: 'Entrada (horas extras)' },
	{ value: 'overtime_out', label: 'Salida (horas extras)' },
];
