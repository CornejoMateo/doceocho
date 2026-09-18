import { getSupabaseClient } from '@/lib/supabase-client';
import type { DaySchedule } from '@/helpers/appointments/availability';

const SETTINGS_TABLE = 'appointment_settings';
const BLOCKED_DATES_TABLE = 'appointment_blocked_dates';
const SETTINGS_ID = 1;

export type AppointmentSettings = {
	id: number;
	weekly_schedule: DaySchedule[];
	slot_duration_minutes: number;
	min_notice_hours: number;
	max_days_ahead: number;
	is_public_enabled: boolean;
	event_type_id: number | null;
};

export type BlockedDate = {
	id: number;
	date: string;
	reason: string | null;
};

export async function getAppointmentSettings(): Promise<{
	data: AppointmentSettings | null;
	error: any;
}> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from(SETTINGS_TABLE)
		.select('*')
		.eq('id', SETTINGS_ID)
		.maybeSingle();

	return { data, error };
}

export async function updateAppointmentSettings(
	changes: Partial<Omit<AppointmentSettings, 'id'>>
): Promise<{ data: AppointmentSettings | null; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from(SETTINGS_TABLE)
		.update(changes)
		.eq('id', SETTINGS_ID)
		.select()
		.single();

	return { data, error };
}

export async function listBlockedDates(): Promise<{ data: BlockedDate[] | null; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from(BLOCKED_DATES_TABLE)
		.select('*')
		.order('date', { ascending: true });

	if (error) {
		return { data: null, error };
	}

	return { data: data ?? [], error: null };
}

export async function createBlockedDate(
	date: string,
	reason?: string | null
): Promise<{ data: BlockedDate | null; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from(BLOCKED_DATES_TABLE)
		.insert({ date, reason: reason || null })
		.select()
		.single();

	return { data, error };
}

export async function deleteBlockedDate(id: number): Promise<{ error: any }> {
	const supabase = getSupabaseClient();

	const { error } = await supabase.from(BLOCKED_DATES_TABLE).delete().eq('id', id);

	return { error };
}
