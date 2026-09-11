import { ACTIVE_APPOINTMENT_STATUSES } from '@/constants/appointments/appointments';

export type DaySchedule = {
	enabled: boolean;
	/** `HH:MM` */
	start: string;
	/** `HH:MM` */
	end: string;
};

export type AvailabilitySettings = {
	weekly_schedule: DaySchedule[];
	slot_duration_minutes: number;
	min_notice_hours: number;
	max_days_ahead: number;
};

export type TakenSlot = {
	date: string;
	start_time: string;
	status: string;
};

export type Slot = {
	/** `HH:MM` */
	start: string;
	/** `HH:MM` */
	end: string;
	available: boolean;
};

export function timeToMinutes(time: string): number {
	const [hours, minutes] = time.split(':').map(Number);

	if (Number.isNaN(hours) || Number.isNaN(minutes)) return Number.NaN;

	return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes: number): string {
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;

	return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** Postgres returns `HH:MM:SS`; the UI works with `HH:MM`. */
export function normalizeTime(time: string): string {
	return time.slice(0, 5);
}

/** Parses a plain date without letting the local timezone shift the day. */
export function parseDateOnly(value: string): Date {
	return new Date(`${value}T00:00:00`);
}

export function formatDateOnly(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');

	return `${year}-${month}-${day}`;
}

/** Every slot the weekly schedule defines for that date, before any filtering. */
export function buildDaySlots(
	schedule: DaySchedule | undefined,
	slotDurationMinutes: number
): Array<{ start: string; end: string }> {
	if (!schedule?.enabled || slotDurationMinutes <= 0) return [];

	const startMinutes = timeToMinutes(schedule.start);
	const endMinutes = timeToMinutes(schedule.end);

	if (Number.isNaN(startMinutes) || Number.isNaN(endMinutes)) return [];

	const slots: Array<{ start: string; end: string }> = [];

	// A slot only counts when it fits whole inside the working hours.
	for (
		let cursor = startMinutes;
		cursor + slotDurationMinutes <= endMinutes;
		cursor += slotDurationMinutes
	) {
		slots.push({
			start: minutesToTime(cursor),
			end: minutesToTime(cursor + slotDurationMinutes),
		});
	}

	return slots;
}

/**
 * Slots offered to a client for one date, each flagged free or taken.
 * Nothing about who booked a slot is included: only whether it is free.
 */
export function getSlotsForDate(
	date: string,
	settings: AvailabilitySettings,
	takenSlots: TakenSlot[],
	blockedDates: string[],
	now: Date = new Date()
): Slot[] {
	if (blockedDates.includes(date)) return [];

	const target = parseDateOnly(date);

	if (Number.isNaN(target.getTime())) return [];

	const schedule = settings.weekly_schedule?.[target.getDay()];
	const slots = buildDaySlots(schedule, settings.slot_duration_minutes);

	if (slots.length === 0) return [];

	const earliestAllowed = new Date(now.getTime() + settings.min_notice_hours * 60 * 60 * 1000);

	const takenStarts = new Set(
		takenSlots
			.filter(
				(slot) =>
					slot.date === date && (ACTIVE_APPOINTMENT_STATUSES as string[]).includes(slot.status)
			)
			.map((slot) => normalizeTime(slot.start_time))
	);

	return slots
		.filter((slot) => {
			const slotStart = new Date(`${date}T${slot.start}:00`);
			return slotStart >= earliestAllowed;
		})
		.map((slot) => ({
			...slot,
			available: !takenStarts.has(slot.start),
		}));
}

/** Dates a client is allowed to browse, from today up to the configured horizon. */
export function getBookableDates(settings: AvailabilitySettings, now: Date = new Date()): string[] {
	const dates: string[] = [];

	for (let offset = 0; offset <= settings.max_days_ahead; offset++) {
		const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
		const schedule = settings.weekly_schedule?.[date.getDay()];

		if (schedule?.enabled) {
			dates.push(formatDateOnly(date));
		}
	}

	return dates;
}
