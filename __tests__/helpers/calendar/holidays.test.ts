import {
	buildHolidayMap,
	describeHolidayStatus,
	getYearsInRange,
	Holiday,
	HolidayWorkDay,
	resolveHolidayAvailability,
} from '@/helpers/calendar/holidays';
import {
	AvailabilitySettings,
	getBookableDates,
	getSlotsForDate,
} from '@/helpers/appointments/availability';

const holidays: Holiday[] = [
	{ date: '2026-11-23', name: 'Día de la Soberanía Nacional', type: 'trasladable' },
	{ date: '2026-12-08', name: 'Inmaculada Concepción de María', type: 'inamovible' },
	{ date: '2026-12-25', name: 'Navidad', type: 'inamovible' },
];

const workDay = (date: string, start: string | null = null, end: string | null = null) =>
	({ id: 1, date, start_time: start, end_time: end, note: null }) as HolidayWorkDay;

describe('helpers/calendar/holidays', () => {
	test('getYearsInRange covers every year touched', () => {
		expect(getYearsInRange('2026-12-20', '2027-01-10')).toEqual([2026, 2027]);
		expect(getYearsInRange('2026-03-01', '2026-03-31')).toEqual([2026]);
	});

	test('buildHolidayMap attaches the admin decision', () => {
		const map = buildHolidayMap(holidays, [workDay('2026-12-08')]);

		expect(map['2026-12-08'].workDay).not.toBeNull();
		expect(map['2026-12-25'].workDay).toBeNull();
	});

	test('describeHolidayStatus explains each case', () => {
		const map = buildHolidayMap(holidays, [
			workDay('2026-11-23'),
			workDay('2026-12-08', '09:00:00', '13:00:00'),
		]);

		expect(describeHolidayStatus(map['2026-12-25'])).toBe('No se trabaja');
		expect(describeHolidayStatus(map['2026-11-23'])).toBe('Se trabaja en horario habitual');
		expect(describeHolidayStatus(map['2026-12-08'])).toBe('Se trabaja de 09:00 a 13:00');
	});

	test('resolveHolidayAvailability blocks off days and overrides custom hours', () => {
		const result = resolveHolidayAvailability(holidays, [
			workDay('2026-11-23'),
			workDay('2026-12-08', '09:00:00', '11:00:00'),
		]);

		expect(result.blockedDates).toEqual(['2026-12-25']);
		expect(result.dateOverrides).toEqual({
			'2026-12-08': { enabled: true, start: '09:00', end: '11:00' },
		});
	});
});

describe('availability with holiday overrides', () => {
	const openDay = { enabled: true, start: '09:00', end: '18:00' };
	const closedDay = { enabled: false, start: '09:00', end: '18:00' };
	const settings: AvailabilitySettings = {
		weekly_schedule: [closedDay, openDay, openDay, openDay, openDay, openDay, closedDay],
		slot_duration_minutes: 60,
		min_notice_hours: 0,
		max_days_ahead: 7,
		// 2026-12-08 is a Tuesday, 2026-12-13 a Sunday.
		date_overrides: {
			'2026-12-08': { enabled: true, start: '09:00', end: '11:00' },
			'2026-12-13': { enabled: true, start: '10:00', end: '11:00' },
		},
	};
	const now = new Date('2026-12-07T00:00:00');

	test('a worked holiday only offers its custom hours', () => {
		const slots = getSlotsForDate('2026-12-08', settings, [], [], now);

		expect(slots.map((slot) => slot.start)).toEqual(['09:00', '10:00']);
	});

	test('an override can open a day the weekly schedule keeps closed', () => {
		expect(getBookableDates(settings, now)).toContain('2026-12-13');
	});
});
