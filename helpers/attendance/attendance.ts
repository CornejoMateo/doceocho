export function getEntryTypeLabel(type: string): string {
	switch (type) {
		case 'regular_in':
			return 'Entrada';
		case 'regular_out':
			return 'Salida';
		case 'overtime_in':
			return 'Entrada (HE)';
		case 'overtime_out':
			return 'Salida (HE)';
		default:
			return type;
	}
}

export function getEntryTypeColor(type: string): string {
	switch (type) {
		case 'regular_in':
			return 'text-green-600';
		case 'regular_out':
			return 'text-red-600';
		case 'overtime_in':
			return 'text-blue-600';
		case 'overtime_out':
			return 'text-orange-600';
		default:
			return 'text-gray-600';
	}
}

export function formatHours(hours: number): string {
	const h = Math.floor(hours);
	const m = Math.round((hours - h) * 60);
	return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
