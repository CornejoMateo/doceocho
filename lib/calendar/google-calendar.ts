export type GoogleCalendarInput = {
	title: string;
	type?: string | null;
	description?: string | null;
	clientName?: string | null;
	location?: string | null;
	date: string; // YYYY-MM-DD
	time?: string | null; // HH:mm
	timeZone?: string;
};

export function buildGoogleCalendarUrl({
	title,
	type,
	description,
	clientName,
	location,
	date,
	time,
	timeZone = 'America/Argentina/Cordoba',
}: GoogleCalendarInput): string {
	const cleanDate = date.replace(/-/g, '');

	const startTime = time ? time.replace(':', '') + '00' : '090000';
	const endTime = time
		? String(parseInt(time.split(':')[0], 10) + 1).padStart(2, '0') + time.split(':')[1] + '00'
		: '100000';

	const details = [
		`Tipo: ${type || 'N/A'}`,
		`Descripción: ${description || 'N/A'}`,
		`Cliente: ${clientName || 'N/A'}`,
	].join('\n');

	const params = new URLSearchParams({
		action: 'TEMPLATE',
		text: title,
		dates: `${cleanDate}T${startTime}/${cleanDate}T${endTime}`,
		details,
		location: location || '',
		ctz: timeZone,
	});

	return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
