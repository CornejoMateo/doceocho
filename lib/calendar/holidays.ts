import { getSupabaseClient } from '@/lib/supabase-client';
import type { Holiday, HolidayWorkDay } from '@/helpers/calendar/holidays';

const WORK_DAYS_TABLE = 'holiday_work_days';

export type HolidayWorkDayInput = {
	date: string;
	start_time: string | null;
	end_time: string | null;
	note?: string | null;
};

export async function listHolidays(year: number): Promise<{ data: Holiday[]; error: any }> {
	try {
		const response = await fetch(`/api/holidays?year=${year}`);

		if (!response.ok) return { data: [], error: new Error('No se pudieron cargar los feriados') };

		return { data: await response.json(), error: null };
	} catch (error) {
		return { data: [], error };
	}
}

export async function listHolidayWorkDays(
	from: string,
	to: string
): Promise<{ data: HolidayWorkDay[]; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from(WORK_DAYS_TABLE)
		.select('*')
		.gte('date', from)
		.lte('date', to);

	return { data: data ?? [], error };
}

/** Marks a holiday as a working day, or updates its hours. */
export async function saveHolidayWorkDay(
	input: HolidayWorkDayInput
): Promise<{ data: HolidayWorkDay | null; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from(WORK_DAYS_TABLE)
		.upsert({ ...input, note: input.note || null }, { onConflict: 'date' })
		.select()
		.single();

	return { data, error };
}

/** Back to a regular holiday: nobody works that day. */
export async function deleteHolidayWorkDay(date: string): Promise<{ error: any }> {
	const supabase = getSupabaseClient();

	const { error } = await supabase.from(WORK_DAYS_TABLE).delete().eq('date', date);

	return { error };
}
