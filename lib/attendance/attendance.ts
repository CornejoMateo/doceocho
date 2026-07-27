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
	price_hour: number | null;
	price_hour_overtime: number | null;
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

export interface PaymentSummary {
	user_id: string;
	user_name: string;
	daily: {
		date: string;
		regular_hours: number;
		overtime_hours: number;
		total_payment: number;
	}[];
	weekly: {
		week_start: string;
		week_end: string;
		regular_hours: number;
		overtime_hours: number;
		total_payment: number;
	}[];
	monthly: {
		month: string;
		regular_hours: number;
		overtime_hours: number;
		total_payment: number;
	}[];
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

	const { data, error } = await supabase
		.from('attendance_entries')
		.insert(entry)
		.select()
		.maybeSingle();

	return { data, error };
}

/**
 * Update an attendance entry
 */
export async function updateAttendanceEntry(
	id: number,
	updates: Partial<AttendanceEntry>
): Promise<{ data: AttendanceEntry | null; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from('attendance_entries')
		.update(updates)
		.eq('id', id)
		.select()
		.single();

	return { data, error };
}

/**
 * Delete an attendance entry
 */
export async function deleteAttendanceEntry(
	id: number
): Promise<{ data: AttendanceEntry | null; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from('attendance_entries')
		.delete()
		.eq('id', id)
		.select()
		.single();

	return { data, error };
}

/**
 * Create an attendance entry for admin (manual entry)
 */
export async function createAdminAttendanceEntry(
	userId: string,
	type: 'regular_in' | 'regular_out' | 'overtime_in' | 'overtime_out',
	entryTime: string
): Promise<{ data: AttendanceEntryWithDate | null; error: any }> {
	const supabase = getSupabaseClient();

	// First, ensure attendance record exists for the date
	const date = new Date(entryTime).toISOString().split('T')[0];
	const { data: attendance, error: attendanceError } = await supabase
		.from('attendance')
		.select('id')
		.eq('date', date)
		.eq('user_id', userId)
		.maybeSingle();

	if (attendanceError) return { data: null, error: attendanceError };

	let attendanceId: number;
	if (!attendance) {
		// Create attendance record if it doesn't exist
		const { data: newAttendance, error: createError } = await supabase
			.from('attendance')
			.insert({ date, user_id: userId })
			.select()
			.single();

		if (createError) return { data: null, error: createError };
		attendanceId = newAttendance.id;
	} else {
		attendanceId = attendance.id;
	}

	// Create the entry
	const entry = {
		attendance_id: attendanceId,
		type,
		entry_time: entryTime,
		latitude: 0,
		longitude: 0,
	};

	const { data, error } = await supabase
		.from('attendance_entries')
		.insert(entry)
		.select(
			`
			*,
			attendance (
				date,
				user_id
			)
		`
		)
		.single();

	if (error) return { data: null, error };

	const entryWithDate = {
		...data,
		attendance_date: data.attendance.date,
		user_id: data.attendance.user_id,
	} as AttendanceEntryWithDate;

	return { data: entryWithDate, error: null };
}

/**
 * Get attendance settings (for square_meters radius)
 */
export async function getAttendanceSettings(): Promise<{
	data: AttendanceSettings | null;
	error: any;
}> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from('attendance_settings')
		.select('*')
		.eq('id', 1)
		.single();

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
		.update(settings)
		.eq('id', 1)
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
 * Calculate payment summary for a user
 */
export async function calculatePaymentSummary(
	userId: string,
	userName: string
): Promise<{ data: PaymentSummary | null; error: any }> {
	const { data: entries, error } = await getUserAttendanceHistory(userId);

	if (error || !entries) {
		return { data: null, error };
	}

	const { data: settings } = await getAttendanceSettings();
	const priceHour = settings?.price_hour || 0;
	const priceHourOvertime = settings?.price_hour_overtime || 0;

	// Group entries by date
	const entriesByDate: { [key: string]: AttendanceEntryWithDate[] } = {};
	entries.forEach((entry: AttendanceEntryWithDate) => {
		const key = entry.attendance_date;
		if (!entriesByDate[key]) {
			entriesByDate[key] = [];
		}
		entriesByDate[key].push(entry);
	});

	// Calculate daily payments
	const daily: PaymentSummary['daily'] = [];
	Object.keys(entriesByDate).forEach((date) => {
		const dayEntries = entriesByDate[date];
		const sortedEntries = dayEntries.sort(
			(a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime()
		);

		let regularHours = 0;
		let overtimeHours = 0;
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
					regularHours += hours;
				}
			} else if (entry.type === 'overtime_in') {
				pendingOvertimeIn.push(entry);
			} else if (entry.type === 'overtime_out' && pendingOvertimeIn.length > 0) {
				const matchingIn = pendingOvertimeIn.shift();
				if (matchingIn) {
					const startTime = new Date(matchingIn.entry_time).getTime();
					const endTime = new Date(entry.entry_time).getTime();
					const hours = (endTime - startTime) / (1000 * 60 * 60);
					overtimeHours += hours;
				}
			}
		}

		const totalPayment = regularHours * priceHour + overtimeHours * priceHourOvertime;
		daily.push({
			date,
			regular_hours: Math.round(regularHours * 100) / 100,
			overtime_hours: Math.round(overtimeHours * 100) / 100,
			total_payment: Math.round(totalPayment * 100) / 100,
		});
	});

	// Calculate weekly payments
	const weekly: PaymentSummary['weekly'] = [];
	const entriesByWeek: { [key: string]: { regular_hours: number; overtime_hours: number } } = {};

	daily.forEach((day) => {
		const date = new Date(day.date);
		const weekStart = new Date(date);
		weekStart.setDate(date.getDate() - date.getDay());
		const weekKey = weekStart.toISOString().split('T')[0];

		if (!entriesByWeek[weekKey]) {
			entriesByWeek[weekKey] = { regular_hours: 0, overtime_hours: 0 };
		}
		entriesByWeek[weekKey].regular_hours += day.regular_hours;
		entriesByWeek[weekKey].overtime_hours += day.overtime_hours;
	});

	Object.keys(entriesByWeek).forEach((weekStart) => {
		const weekData = entriesByWeek[weekStart];
		const weekEndDate = new Date(weekStart);
		weekEndDate.setDate(weekEndDate.getDate() + 6);
		const weekEnd = weekEndDate.toISOString().split('T')[0];

		const totalPayment =
			weekData.regular_hours * priceHour + weekData.overtime_hours * priceHourOvertime;
		weekly.push({
			week_start: weekStart,
			week_end: weekEnd,
			regular_hours: Math.round(weekData.regular_hours * 100) / 100,
			overtime_hours: Math.round(weekData.overtime_hours * 100) / 100,
			total_payment: Math.round(totalPayment * 100) / 100,
		});
	});

	// Calculate monthly payments
	const monthly: PaymentSummary['monthly'] = [];
	const entriesByMonth: { [key: string]: { regular_hours: number; overtime_hours: number } } = {};

	daily.forEach((day) => {
		const monthKey = day.date.substring(0, 7); // YYYY-MM

		if (!entriesByMonth[monthKey]) {
			entriesByMonth[monthKey] = { regular_hours: 0, overtime_hours: 0 };
		}
		entriesByMonth[monthKey].regular_hours += day.regular_hours;
		entriesByMonth[monthKey].overtime_hours += day.overtime_hours;
	});

	Object.keys(entriesByMonth).forEach((month) => {
		const monthData = entriesByMonth[month];
		const totalPayment =
			monthData.regular_hours * priceHour + monthData.overtime_hours * priceHourOvertime;
		monthly.push({
			month,
			regular_hours: Math.round(monthData.regular_hours * 100) / 100,
			overtime_hours: Math.round(monthData.overtime_hours * 100) / 100,
			total_payment: Math.round(totalPayment * 100) / 100,
		});
	});

	return {
		data: {
			user_id: userId,
			user_name: userName,
			daily: daily.sort((a, b) => b.date.localeCompare(a.date)),
			weekly: weekly.sort((a, b) => b.week_start.localeCompare(a.week_start)),
			monthly: monthly.sort((a, b) => b.month.localeCompare(a.month)),
		},
		error: null,
	};
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
