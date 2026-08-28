import { getServerSupabaseClient } from '@/lib/get-server-supabase-client';
import { getLocalDate } from '@/utils/format-date';
import { Attendance } from './attendance';
import { AttendanceEntry } from '@/lib/attendance/attendance-entries';

export async function createAttendanceEntry(
	entry: AttendanceEntry
): Promise<{ data: AttendanceEntry | null; error: any }> {
	const supabase = await getServerSupabaseClient();

	const { data, error } = await supabase
		.from('attendance_entries')
		.insert(entry)
		.select()
		.maybeSingle();

	return { data, error };
}

export async function createAttendance(
	date: string,
	userId: string
): Promise<{ data: Attendance | null; error: any }> {
	const supabase = await getServerSupabaseClient();

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

export async function getAttendanceByDate(
	date: string,
	userId: string
): Promise<{ data: Attendance | null; error: any }> {
	const supabase = await getServerSupabaseClient();

	const { data, error } = await supabase
		.from('attendance')
		.select('*')
		.eq('date', date)
		.eq('user_id', userId)
		.maybeSingle();

	return { data, error };
}

export async function getLastAttendanceEntry(
	attendanceId: number,
	isOvertime: boolean
): Promise<{ data: AttendanceEntry | null; error: any }> {
	const supabase = await getServerSupabaseClient();

	const types = isOvertime ? ['overtime_in', 'overtime_out'] : ['regular_in', 'regular_out'];

	const { data, error } = await supabase
		.from('attendance_entries')
		.select('*')
		.eq('attendance_id', attendanceId)
		.in('type', types)
		.order('entry_time', { ascending: false })
		.limit(1)
		.maybeSingle();

	return { data, error };
}
