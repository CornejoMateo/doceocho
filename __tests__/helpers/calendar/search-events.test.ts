import { matchesSearchText, matchesWorkData } from '@/helpers/calendar/search-events';

const event = {
	id: 1,
	title: 'Entrega presupuesto',
	client_name: 'Juan Pérez',
	description: 'Documentación de obra',
	type: 'reuniones',
	work_location: 'Av. Colón 1234',
	work_id: 1,
	date: '2024-03-03',
	type_id: 1,
};

const workDataMap = {
	1: {
		id: 1,
		locality: 'Palermo',
		address: 'Av. Santa Fe 1234',
		zone: 'Norte',
		hood: 'Palermo Soho',
	},
};

describe('helpers/calendar/search-events', () => {
	describe('matchesWorkData', () => {
		test('matches by locality', () => {
			expect(matchesWorkData(event as any, 'palermo', workDataMap as any)).toBe(true);
		});

		test('matches by address', () => {
			expect(matchesWorkData(event as any, 'santa fe', workDataMap as any)).toBe(true);
		});

		test('matches by zone', () => {
			expect(matchesWorkData(event as any, 'norte', workDataMap as any)).toBe(true);
		});

		test('matches by hood', () => {
			expect(matchesWorkData(event as any, 'soho', workDataMap as any)).toBe(true);
		});

		test('returns false when there is no match', () => {
			expect(matchesWorkData(event as any, 'córdoba', workDataMap as any)).toBe(false);
		});

		test('returns false when the event has no work data', () => {
			expect(
				matchesWorkData({ ...event, work_id: null } as any, 'palermo', workDataMap as any)
			).toBe(false);
		});
	});

	describe('matchesSearchText', () => {
		test('matches everything when search is empty', () => {
			expect(matchesSearchText(event as any, '', workDataMap as any)).toBe(true);
		});

		test('matches by title', () => {
			expect(matchesSearchText(event as any, 'presupuesto', workDataMap as any)).toBe(true);
		});

		test('matches by client name', () => {
			expect(matchesSearchText(event as any, 'juan pérez', workDataMap as any)).toBe(true);
		});

		test('matches by description', () => {
			expect(matchesSearchText(event as any, 'documentación', workDataMap as any)).toBe(true);
		});

		test('matches by type', () => {
			expect(matchesSearchText(event as any, 'reuniones', workDataMap as any)).toBe(true);
		});

		test('matches by manual work location', () => {
			expect(matchesSearchText(event as any, 'colón', workDataMap as any)).toBe(true);
		});

		test('matches by work data', () => {
			expect(matchesSearchText(event as any, 'palermo', workDataMap as any)).toBe(true);
		});

		test('returns false when nothing matches', () => {
			expect(matchesSearchText(event as any, 'inexistente', workDataMap as any)).toBe(false);
		});
	});
});
