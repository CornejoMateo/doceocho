import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchArgentineHolidaysForYears } from '@/lib/calendar/argentine-holidays';
import { getYearsInRange, resolveHolidayAvailability } from '@/helpers/calendar/holidays';

/**
 * Server only. Holidays inside the range, already resolved against the admin's
 * "se trabaja" decisions, ready to feed the availability helpers.
 */
export async function loadHolidayAvailability(supabase: SupabaseClient, from: string, to: string) {
	const [holidays, { data: workDays }] = await Promise.all([
		fetchArgentineHolidaysForYears(getYearsInRange(from, to)),
		supabase.from('holiday_work_days').select('*').gte('date', from).lte('date', to),
	]);

	const inRange = holidays.filter((holiday) => holiday.date >= from && holiday.date <= to);

	return resolveHolidayAvailability(inRange, workDays ?? []);
}
