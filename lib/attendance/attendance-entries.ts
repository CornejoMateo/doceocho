import { getSupabaseClient } from '../supabase-client';

export interface AttendanceEntry {
	attendance_id: number;
	type: string;
	entry_time: string;
	latitude: number;
	longitude: number;
	description: string | null;
}

export interface AttendanceStatus {
	regularOpen: boolean;
	overtimeOpen: boolean;
}

export interface AttendanceEntryWithDate extends AttendanceEntry {
	id: number;
	attendance_date: string;
	user_id: string;
	user_name?: string;
}

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

export async function createAdminAttendanceEntry(
	userId: string,
	type: 'regular_in' | 'regular_out' | 'overtime_in' | 'overtime_out',
	entryTime: string,
	description: string | null
): Promise<{ data: AttendanceEntryWithDate | null; error: any }> {
	const supabase = getSupabaseClient();

	// First, ensure attendance record exists for the date
	const entryDate = new Date(entryTime);
	const date = [
		entryDate.getFullYear(),
		String(entryDate.getMonth() + 1).padStart(2, '0'),
		String(entryDate.getDate()).padStart(2, '0'),
	].join('-');
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
		description: description || null,
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

export async function getAttendanceStatus(
	userId: string
): Promise<{ data: AttendanceStatus | null; error: any }> {
	const supabase = getSupabaseClient();

	const today = new Date().toISOString().split('T')[0];

	const { data, error } = await supabase
		.from('attendance_entries')
		.select(
			`
			type,
			entry_time,
			description,
			attendance!inner (
				date,
				user_id
			)
		`
		)
		.eq('attendance.date', today)
		.eq('attendance.user_id', userId)
		.order('entry_time', { ascending: false });

	if (error) {
		return { data: null, error };
	}

	const lastRegular = data.find((e) => e.type === 'regular_in' || e.type === 'regular_out');

	const lastOvertime = data.find((e) => e.type === 'overtime_in' || e.type === 'overtime_out');

	return {
		data: {
			regularOpen: lastRegular?.type === 'regular_in',
			overtimeOpen: lastOvertime?.type === 'overtime_in',
		},
		error: null,
	};
}
