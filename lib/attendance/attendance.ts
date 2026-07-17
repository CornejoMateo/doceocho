import { getSupabaseClient } from '../supabase-client';

export interface AttendanceEntry {
	attendance_id: number;
	type: string;
	entry_time: string;
	latitude: number;
	longitude: number;
}

export interface Attendance {
	id: number;
	date: string;
	user_id: string;
	status: string | null;
	description: string | null;
}

export interface AttendanceSettings {
	id: number;
	square_meters: number | null;
	tolerance_quantity_minutes: number | null;
	default_check_in_time: string | null;
	default_check_out_time: string | null;
}

export interface AttendanceEntryWithDate extends AttendanceEntry {
	id: number;
	attendance_date: string;
	user_id: string;
	user_name?: string;
}

export interface UserAttendanceSummary {
	user_id: string;
	user_name: string;
	total_hours: number;
	entries: AttendanceEntryWithDate[];
}

/**
 * Create a new attendance record for the current user
 */
export async function createAttendance(
	date: string,
	userId: string
): Promise<{ data: Attendance | null; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from('attendance')
		.insert({
			date,
			user_id: userId,
		})
		.select()
		.single();

	return { data, error };
}

/**
 * Get attendance for the current user for a specific date
 */
export async function getAttendanceByDate(
	date: string,
	userId: string
): Promise<{ data: Attendance | null; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from('attendance')
		.select('*')
		.eq('date', date)
		.eq('user_id', userId)
		.maybeSingle();

	return { data, error };
}

/**
 * Create an attendance entry (entry/exit)
 */
export async function createAttendanceEntry(
	entry: AttendanceEntry
): Promise<{ data: AttendanceEntry | null; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase.from('attendance_entries').insert(entry).select().single();

	return { data, error };
}

/**
 * Get attendance settings (for square_meters radius)
 */
export async function getAttendanceSettings(): Promise<{
	data: AttendanceSettings | null;
	error: any;
}> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase.from('attendance_settings').select('*').single();

	return { data, error };
}

/**
 * Update attendance settings (for square_meters radius)
 */
export async function updateAttendanceSettings(
	settings: Partial<AttendanceSettings>
): Promise<{ data: AttendanceSettings | null; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from('attendance_settings')
		.upsert(settings)
		.select()
		.single();

	return { data, error };
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
 * Get all attendance entries with user info for admin
 */
export async function getAllAttendanceHistory(): Promise<{
	data: AttendanceEntryWithDate[] | null;
	error: any;
}> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from('attendance_entries')
		.select(
			`
			*,
			attendance!inner (
				date,
				user_id,
				users (
					name,
					last_name,
					username
				)
			)
		`
		)
		.order('entry_time', { ascending: false });

	if (error) return { data: null, error };

	const entriesWithDate = data?.map((entry: any) => ({
		...entry,
		attendance_date: entry.attendance.date,
		user_id: entry.attendance.user_id,
		user_name:
			`${entry.attendance.users?.name || ''} ${entry.attendance.users?.last_name || ''}`.trim() ||
			entry.attendance.users?.username ||
			'Desconocido',
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
 * Get attendance entries filtered by period
 */
export function getEntriesByPeriod(
	entries: AttendanceEntryWithDate[],
	period: 'day' | 'week' | 'month',
	date?: string
): AttendanceEntryWithDate[] {
	if (!date) {
		date = new Date().toISOString().split('T')[0];
	}

	const targetDate = new Date(date);
	const targetDateStr = targetDate.toISOString().split('T')[0];

	if (period === 'day') {
		return entries.filter((entry) => entry.attendance_date === targetDateStr);
	}

	if (period === 'week') {
		const startOfWeek = new Date(targetDate);
		const day = startOfWeek.getDay();
		const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
		startOfWeek.setDate(diff);

		const endOfWeek = new Date(startOfWeek);
		endOfWeek.setDate(startOfWeek.getDate() + 6);

		return entries.filter((entry) => {
			const entryDate = new Date(entry.attendance_date);
			return entryDate >= startOfWeek && entryDate <= endOfWeek;
		});
	}

	if (period === 'month') {
		const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
		const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);

		return entries.filter((entry) => {
			const entryDate = new Date(entry.attendance_date);
			return entryDate >= startOfMonth && entryDate <= endOfMonth;
		});
	}

	return entries;
}

/**
 * Get human-readable label for entry type
 */
export function getEntryTypeLabel(type: string): string {
	switch (type) {
		case 'regular_in':
			return 'Entrada';
		case 'regular_out':
			return 'Salida';
		case 'overtime_in':
			return 'Entrada (HE)';
		case 'overtime_out':
			return 'Salida (HE)';
		default:
			return type;
	}
}

/**
 * Get color class for entry type
 */
export function getEntryTypeColor(type: string): string {
	switch (type) {
		case 'regular_in':
			return 'text-green-600';
		case 'regular_out':
			return 'text-red-600';
		case 'overtime_in':
			return 'text-blue-600';
		case 'overtime_out':
			return 'text-orange-600';
		default:
			return 'text-gray-600';
	}
}

/**
 * Format hours in human-readable format
 */
export function formatHours(hours: number): string {
	const h = Math.floor(hours);
	const m = Math.round((hours - h) * 60);
	return m > 0 ? `${h}h ${m}m` : `${h}h`;
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
