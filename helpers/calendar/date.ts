export function formatDateString(year: number, month: number, day: number): string {
	return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function toISODate(date: string | undefined): string | null {
	if (!date) return null;
	return date.split('T')[0];
}
