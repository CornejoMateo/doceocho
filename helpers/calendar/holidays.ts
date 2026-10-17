import type { DaySchedule } from '@/helpers/appointments/availability';
import { normalizeTime } from '@/helpers/appointments/availability';

export type HolidayType = 'inamovible' | 'trasladable' | 'puente';

export type Holiday = {
	/** `YYYY-MM-DD` */
	date: string;
	name: string;
	type: HolidayType;
};

export type HolidayWorkDay = {
	id: number;
	date: string;
	/** `HH:MM:SS` or null to keep the regular weekly schedule. */
	start_time: string | null;
	end_time: string | null;
	note: string | null;
};

export type CalendarHoliday = Holiday & {
	workDay: HolidayWorkDay | null;
};

export const HOLIDAY_TYPE_LABELS: Record<HolidayType, string> = {
	inamovible: 'Feriado inamovible',
	trasladable: 'Feriado trasladable',
	puente: 'Día no laborable',
};

/** Every year touched by the range, so holidays can be fetched per year. */
export function getYearsInRange(from: string, to: string): number[] {
	const firstYear = Number(from.slice(0, 4));
	const lastYear = Number(to.slice(0, 4));
	const years: number[] = [];

	for (let year = firstYear; year <= lastYear; year++) years.push(year);

	return years;
}

/** Joins each holiday with the admin decision for that day, keyed by date. */
export function buildHolidayMap(
	holidays: Holiday[],
	workDays: HolidayWorkDay[]
): Record<string, CalendarHoliday> {
	const workDaysByDate = new Map(workDays.map((workDay) => [workDay.date, workDay]));
	const map: Record<string, CalendarHoliday> = {};

	for (const holiday of holidays) {
		map[holiday.date] = { ...holiday, workDay: workDaysByDate.get(holiday.date) ?? null };
	}

	return map;
}

/** Human readable status of a holiday, as the client sees it. */
export function describeHolidayStatus(holiday: CalendarHoliday): string {
	const { workDay } = holiday;

	if (!workDay) return 'No se trabaja';

	if (workDay.start_time && workDay.end_time) {
		return `Se trabaja de ${normalizeTime(workDay.start_time)} a ${normalizeTime(workDay.end_time)}`;
	}

	return 'Se trabaja en horario habitual';
}

/**
 * Turns holidays into what the booking logic understands:
 * holidays nobody works are blocked, worked ones with custom hours override the weekly schedule.
 */
export function resolveHolidayAvailability(
	holidays: Holiday[],
	workDays: HolidayWorkDay[]
): { blockedDates: string[]; dateOverrides: Record<string, DaySchedule> } {
	const blockedDates: string[] = [];
	const dateOverrides: Record<string, DaySchedule> = {};

	for (const holiday of Object.values(buildHolidayMap(holidays, workDays))) {
		const { workDay } = holiday;

		if (!workDay) {
			blockedDates.push(holiday.date);
		} else if (workDay.start_time && workDay.end_time) {
			dateOverrides[holiday.date] = {
				enabled: true,
				start: normalizeTime(workDay.start_time),
				end: normalizeTime(workDay.end_time),
			};
		}
	}

	return { blockedDates, dateOverrides };
}
