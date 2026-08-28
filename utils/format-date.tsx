import { format, toZonedTime } from 'date-fns-tz';

const ARGENTINA_TIME_ZONE = 'America/Argentina/Buenos_Aires';

export function getLocalDate(date: Date | string | number = new Date()): string {
	return format(toZonedTime(new Date(date), ARGENTINA_TIME_ZONE), 'yyyy-MM-dd');
}

// The method we should always use to display timestampz data
export const formatCreatedAt = (dateValue: unknown) => {
	if (!dateValue) return 'N/A';
	const d = new Date(String(dateValue));
	if (isNaN(d.getTime())) return 'N/A';
	const day = String(d.getUTCDate()).padStart(2, '0');
	const month = String(d.getUTCMonth() + 1).padStart(2, '0');
	const year = d.getUTCFullYear();
	return `${day}/${month}/${year}`;
};

export function formatShortDate(value: string | null | undefined) {
	if (!value) return '-';
	try {
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '-';
		return date.toLocaleDateString('es-AR');
	} catch {
		return '-';
	}
}

export const formatCreatedAtChat = (dateValue: unknown) => {
	if (!dateValue) return 'N/A';

	const date = new Date(String(dateValue));
	if (isNaN(date.getTime())) return 'N/A';

	const now = new Date();

	const isToday =
		date.getDate() === now.getDate() &&
		date.getMonth() === now.getMonth() &&
		date.getFullYear() === now.getFullYear();

	if (isToday) {
		return date.toLocaleTimeString('es-AR', {
			hour: '2-digit',
			minute: '2-digit',
		});
	}

	return date.toLocaleString('es-AR', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
};

export function formatTime(timestamp: string | Date | null | undefined): string {
	if (!timestamp) return '';

	const date = new Date(timestamp);
	if (isNaN(date.getTime())) return '';

	return new Intl.DateTimeFormat('es-AR', {
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	}).format(date);
}

export function formatSimpleTime(timeString: string | null | undefined): string {
	if (!timeString) return '';

	// Simple split to remove seconds if present
	const parts = timeString.split(':');
	if (parts.length >= 2) {
		return `${parts[0]}:${parts[1]}`;
	}

	// Return original string if format is unexpected
	return timeString;
}
