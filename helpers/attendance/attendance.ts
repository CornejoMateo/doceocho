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
			return 'text-green-500 dark:text-green-400';
		case 'regular_out':
			return 'text-red-500 dark:text-red-400';
		case 'overtime_in':
			return 'text-blue-500 dark:text-blue-400';
		case 'overtime_out':
			return 'text-orange-500 dark:text-orange-400';
		default:
			return 'text-muted-foreground';
	}
}

export function formatHours(hours: number): string {
	const totalMinutes = Math.round(hours * 60);
	const h = Math.floor(totalMinutes / 60);
	const m = totalMinutes % 60;
	return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
