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

/**
 * Create a new attendance record for the current user
 */
export async function createAttendance(
	date: string
): Promise<{ data: Attendance | null; error: any }> {
	const supabase = getSupabaseClient();
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();

	if (userError || !user) {
		return { data: null, error: userError || new Error('Usuario no autenticado') };
	}

	const { data, error } = await supabase
		.from('attendance')
		.insert({
			date,
			user_id: user.id,
		})
		.select()
		.single();

	return { data, error };
}

/**
 * Get attendance for the current user for a specific date
 */
export async function getAttendanceByDate(
	date: string
): Promise<{ data: Attendance | null; error: any }> {
	const supabase = getSupabaseClient();
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();

	if (userError || !user) {
		return { data: null, error: userError || new Error('Usuario no autenticado') };
	}

	const { data, error } = await supabase
		.from('attendance')
		.select('*')
		.eq('date', date)
		.eq('user_id', user.id)
		.single();

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
