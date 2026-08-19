import { getSupabaseClient } from '../supabase-client';
import { AttendanceEntryWithDate } from './attendance-entries';

export interface Attendance {
	id: number;
	date: string;
	user_id: string;
}

export interface UserAttendanceSummary {
	user_id: string;
	user_name: string;
	total_hours: number;
	entries: AttendanceEntryWithDate[];
}

/**
 * Get attendance history for a user with entries
 */
export async function getUserAttendanceHistory(
	userId: string
): Promise<{ data: AttendanceEntryWithDate[] | null; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from('attendance_entries')
		.select(
			`
			*,
			attendance!inner (
				date,
				user_id
			)
		`
		)
		.eq('attendance.user_id', userId)
		.order('entry_time', { ascending: false });

	if (error) return { data: null, error };

	const entriesWithDate = data?.map((entry: any) => ({
		...entry,
		attendance_date: entry.attendance.date,
		user_id: entry.attendance.user_id,
	})) as AttendanceEntryWithDate[];

	return { data: entriesWithDate || null, error: null };
}

/**
 * Calculate hours worked from entries
 */
export function calculateHoursWorked(entries: AttendanceEntryWithDate[]): number {
	let totalHours = 0;
	const pairedEntries: { [key: string]: AttendanceEntryWithDate[] } = {};

	// Group entries by date and user
	entries.forEach((entry) => {
		const key = `${entry.attendance_date}_${entry.user_id}`;
		if (!pairedEntries[key]) {
			pairedEntries[key] = [];
		}
		pairedEntries[key].push(entry);
	});

	// Calculate hours for each pair
	Object.values(pairedEntries).forEach((dayEntries) => {
		const sortedEntries = dayEntries.sort(
			(a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime()
		);

		// Maintain separate pending entries for regular and overtime
		const pendingRegularIn: AttendanceEntryWithDate[] = [];
		const pendingOvertimeIn: AttendanceEntryWithDate[] = [];

		for (const entry of sortedEntries) {
			if (entry.type === 'regular_in') {
				pendingRegularIn.push(entry);
			} else if (entry.type === 'regular_out' && pendingRegularIn.length > 0) {
				const matchingIn = pendingRegularIn.shift();
				if (matchingIn) {
					const startTime = new Date(matchingIn.entry_time).getTime();
					const endTime = new Date(entry.entry_time).getTime();
					const hours = (endTime - startTime) / (1000 * 60 * 60);
					totalHours += hours;
				}
			} else if (entry.type === 'overtime_in') {
				pendingOvertimeIn.push(entry);
			} else if (entry.type === 'overtime_out' && pendingOvertimeIn.length > 0) {
				const matchingIn = pendingOvertimeIn.shift();
				if (matchingIn) {
					const startTime = new Date(matchingIn.entry_time).getTime();
					const endTime = new Date(entry.entry_time).getTime();
					const hours = (endTime - startTime) / (1000 * 60 * 60);
					totalHours += hours;
				}
			}
		}
	});

	return totalHours;
}

/**
 * Check if an entry has a matching pair (in/out)
 */
export function hasMatchingPair(
	entry: AttendanceEntryWithDate,
	allEntries: AttendanceEntryWithDate[]
): boolean {
	const userEntries = allEntries.filter(
		(e) => e.user_id === entry.user_id && e.attendance_date === entry.attendance_date
	);

	const sortedEntries = userEntries.sort(
		(a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime()
	);

	const pendingRegularIn: AttendanceEntryWithDate[] = [];
	const pendingOvertimeIn: AttendanceEntryWithDate[] = [];

	for (const e of sortedEntries) {
		if (e.id === entry.id) {
			// Check if current entry has a matching pair
			if (entry.type === 'regular_in') {
				const hasMatchingOut = sortedEntries.some(
					(laterEntry) =>
						laterEntry.id !== entry.id &&
						laterEntry.type === 'regular_out' &&
						new Date(laterEntry.entry_time) > new Date(entry.entry_time)
				);
				return hasMatchingOut;
			} else if (entry.type === 'regular_out') {
				const hasMatchingIn = pendingRegularIn.length > 0;
				return hasMatchingIn;
			} else if (entry.type === 'overtime_in') {
				const hasMatchingOut = sortedEntries.some(
					(laterEntry) =>
						laterEntry.id !== entry.id &&
						laterEntry.type === 'overtime_out' &&
						new Date(laterEntry.entry_time) > new Date(entry.entry_time)
				);
				return hasMatchingOut;
			} else if (entry.type === 'overtime_out') {
				const hasMatchingIn = pendingOvertimeIn.length > 0;
				return hasMatchingIn;
			}
		}

		// Track pending entries
		if (e.type === 'regular_in') {
			pendingRegularIn.push(e);
		} else if (e.type === 'regular_out' && pendingRegularIn.length > 0) {
			pendingRegularIn.shift();
		} else if (e.type === 'overtime_in') {
			pendingOvertimeIn.push(e);
		} else if (e.type === 'overtime_out' && pendingOvertimeIn.length > 0) {
			pendingOvertimeIn.shift();
		}
	}

	return false;
}

/**
 * Get attendance summary grouped by user
 */
export function getUserAttendanceSummaries(
	entries: AttendanceEntryWithDate[]
): UserAttendanceSummary[] {
	const userMap: { [key: string]: UserAttendanceSummary } = {};

	entries.forEach((entry) => {
		if (!userMap[entry.user_id]) {
			userMap[entry.user_id] = {
				user_id: entry.user_id,
				user_name: entry.user_name || 'Desconocido',
				total_hours: 0,
				entries: [],
			};
		}
		userMap[entry.user_id].entries.push(entry);
	});

	// Calculate hours for each user
	Object.values(userMap).forEach((summary) => {
		summary.total_hours = calculateHoursWorked(summary.entries);
	});

	return Object.values(userMap);
}
