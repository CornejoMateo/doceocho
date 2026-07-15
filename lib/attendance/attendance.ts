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
