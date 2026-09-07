import { buildGoogleCalendarUrl } from '@/lib/calendar/google-calendar';

describe('lib/calendar/google-calendar', () => {
	test('builds a TEMPLATE url with default times and zone', () => {
		const url = buildGoogleCalendarUrl({
			title: 'Entrega',
			type: 'Entrega',
			description: 'Entregar presupuesto',
			clientName: 'Juan Pérez',
			location: 'Av. Colón 1234',
			date: '2024-03-03',
		});

		const parsed = new URL(url);
		const params = parsed.searchParams;

		expect(parsed.origin + parsed.pathname).toBe('https://calendar.google.com/calendar/render');
		expect(params.get('action')).toBe('TEMPLATE');
		expect(params.get('text')).toBe('Entrega');
		expect(params.get('dates')).toBe('20240303T090000/20240303T100000');
		expect(params.get('details')).toBe(
			'Tipo: Entrega\nDescripción: Entregar presupuesto\nCliente: Juan Pérez'
		);
		expect(params.get('location')).toBe('Av. Colón 1234');
		expect(params.get('ctz')).toBe('America/Argentina/Cordoba');
	});

	test('uses provided time and adds one hour for end time', () => {
		const url = buildGoogleCalendarUrl({
			title: 'Reunión',
			date: '2024-03-03',
			time: '14:30',
		});

		const params = new URL(url).searchParams;
		expect(params.get('dates')).toBe('20240303T143000/20240303T153000');
	});

	test('applies fallbacks for missing optional fields', () => {
		const url = buildGoogleCalendarUrl({
			title: 'Sin datos',
			date: '2024-05-05',
		});

		const params = new URL(url).searchParams;
		expect(params.get('details')).toBe('Tipo: N/A\nDescripción: N/A\nCliente: N/A');
		expect(params.get('location')).toBe('');
	});

	test('allows a custom timezone', () => {
		const url = buildGoogleCalendarUrl({
			title: 'Evento',
			date: '2024-03-03',
			time: '09:00',
			timeZone: 'America/Argentina/Buenos_Aires',
		});

		const params = new URL(url).searchParams;
		expect(params.get('ctz')).toBe('America/Argentina/Buenos_Aires');
	});
});
