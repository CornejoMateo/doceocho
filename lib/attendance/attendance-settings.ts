import { getSupabaseClient } from '../supabase-client';

export interface AttendanceSettings {
	id: number;
	square_meters: number | null;
	tolerance_quantity_minutes: number | null;
	default_check_in_time: string | null;
	default_check_out_time: string | null;
	price_hour: number | null;
	price_hour_overtime: number | null;
	target_latitude: number | null;
	target_longitude: number | null;
}

export async function getAttendanceSettings(): Promise<{
	data: AttendanceSettings | null;
	error: any;
}> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from('attendance_settings')
		.select('*')
		.eq('id', 1)
		.maybeSingle();

	return { data, error };
}

export async function updateAttendanceSettings(
	settings: Partial<AttendanceSettings>
): Promise<{ data: AttendanceSettings | null; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from('attendance_settings')
		.upsert({ ...settings, id: 1 })
		.select()
		.single();

	return { data, error };
}
