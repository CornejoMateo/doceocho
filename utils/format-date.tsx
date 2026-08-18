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

	// If it's already in the correct format (HH:MM), return it as is
	if (/^\d{1,2}:\d{2}$/.test(timeString)) {
		return timeString;
	}

	// If it includes seconds (HH:MM:SS), remove the seconds
	if (/^\d{1,2}:\d{2}:\d{2}$/.test(timeString)) {
		return timeString.substring(0, 5);
	}

	// If it's a timestamp, try to format it
	try {
		const date = new Date(timeString);
		if (!isNaN(date.getTime())) {
			return new Intl.DateTimeFormat('es-AR', {
				hour: '2-digit',
				minute: '2-digit',
				hour12: false,
			}).format(date);
		}
	} catch (error) {
		console.error('Error formatting time:', error);
	}

	// Return original string if no formatting worked
	return timeString;
}
