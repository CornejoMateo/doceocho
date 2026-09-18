import {
	AvailabilitySettings,
	buildDaySlots,
	getBookableDates,
	getSlotsForDate,
	minutesToTime,
	normalizeTime,
	timeToMinutes,
} from '@/helpers/appointments/availability';

const openDay = { enabled: true, start: '09:00', end: '12:00' };
const closedDay = { enabled: false, start: '09:00', end: '12:00' };

function makeSettings(overrides: Partial<AvailabilitySettings> = {}): AvailabilitySettings {
	return {
		// 0 = domingo cerrado, resto abierto.
		weekly_schedule: [closedDay, openDay, openDay, openDay, openDay, openDay, closedDay],
		slot_duration_minutes: 60,
		min_notice_hours: 0,
		max_days_ahead: 7,
		...overrides,
	};
}

describe('helpers/appointments/availability', () => {
	describe('time conversion', () => {
		test('converts back and forth', () => {
			expect(timeToMinutes('09:30')).toBe(570);
			expect(minutesToTime(570)).toBe('09:30');
			expect(minutesToTime(60)).toBe('01:00');
		});

		test('trims the seconds Postgres returns', () => {
			expect(normalizeTime('09:30:00')).toBe('09:30');
		});
	});

	describe('buildDaySlots', () => {
		test('splits the working hours into slots', () => {
			expect(buildDaySlots(openDay, 60)).toEqual([
				{ start: '09:00', end: '10:00' },
				{ start: '10:00', end: '11:00' },
				{ start: '11:00', end: '12:00' },
			]);
		});

		test('drops a slot that does not fit whole', () => {
			const slots = buildDaySlots({ enabled: true, start: '09:00', end: '10:30' }, 60);

			expect(slots).toEqual([{ start: '09:00', end: '10:00' }]);
		});

		test('returns nothing for a disabled day', () => {
			expect(buildDaySlots(closedDay, 60)).toEqual([]);
			expect(buildDaySlots(undefined, 60)).toEqual([]);
		});
	});

	describe('getSlotsForDate', () => {
		// 2026-09-14 is a Monday.
		const monday = '2026-09-14';
		const now = new Date('2026-09-01T08:00:00');

		test('marks a taken slot as unavailable without leaking who took it', () => {
			const slots = getSlotsForDate(
				monday,
				makeSettings(),
				[{ date: monday, start_time: '10:00:00', status: 'Aceptada' }],
				[],
				now
			);

			expect(slots).toEqual([
				{ start: '09:00', end: '10:00', available: true },
				{ start: '10:00', end: '11:00', available: false },
				{ start: '11:00', end: '12:00', available: true },
			]);
		});

		test('a pending request also holds the slot', () => {
			const slots = getSlotsForDate(
				monday,
				makeSettings(),
				[{ date: monday, start_time: '09:00:00', status: 'Pendiente' }],
				[],
				now
			);

			expect(slots[0].available).toBe(false);
		});

		test('a rejected request frees the slot again', () => {
			const slots = getSlotsForDate(
				monday,
				makeSettings(),
				[{ date: monday, start_time: '09:00:00', status: 'Rechazada' }],
				[],
				now
			);

			expect(slots[0].available).toBe(true);
		});

		test('returns nothing on a blocked date', () => {
			expect(getSlotsForDate(monday, makeSettings(), [], [monday], now)).toEqual([]);
		});

		test('returns nothing on a disabled weekday', () => {
			// 2026-09-13 is a Sunday.
			expect(getSlotsForDate('2026-09-13', makeSettings(), [], [], now)).toEqual([]);
		});

		test('hides slots inside the minimum notice window', () => {
			const slots = getSlotsForDate(
				monday,
				makeSettings({ min_notice_hours: 24 }),
				[],
				[],
				new Date('2026-09-14T08:00:00')
			);

			expect(slots).toEqual([]);
		});

		test('ignores appointments of another date', () => {
			const slots = getSlotsForDate(
				monday,
				makeSettings(),
				[{ date: '2026-09-15', start_time: '09:00:00', status: 'Aceptada' }],
				[],
				now
			);

			expect(slots.every((slot) => slot.available)).toBe(true);
		});
	});

	describe('getBookableDates', () => {
		test('only lists days the schedule has enabled', () => {
			// Monday 2026-09-14, horizon of 7 days: skips both weekends days that are off.
			const dates = getBookableDates(makeSettings(), new Date('2026-09-14T08:00:00'));

			expect(dates).toEqual([
				'2026-09-14',
				'2026-09-15',
				'2026-09-16',
				'2026-09-17',
				'2026-09-18',
				'2026-09-21',
			]);
		});
	});
});
