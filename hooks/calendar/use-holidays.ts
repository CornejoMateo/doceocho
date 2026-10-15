import { useCallback, useEffect, useMemo, useState } from 'react';
import { listHolidays, listHolidayWorkDays } from '@/lib/calendar/holidays';
import { buildHolidayMap, Holiday, HolidayWorkDay } from '@/helpers/calendar/holidays';

/** National holidays of a year joined with the admin's "se trabaja" decisions, keyed by date. */
export function useHolidays(year: number) {
	const [holidays, setHolidays] = useState<Holiday[]>([]);
	const [workDays, setWorkDays] = useState<HolidayWorkDay[]>([]);

	const refreshWorkDays = useCallback(async () => {
		const { data, error } = await listHolidayWorkDays(`${year}-01-01`, `${year}-12-31`);
		if (error) console.error('Error fetching holiday work days:', error);
		setWorkDays(data);
	}, [year]);

	useEffect(() => {
		listHolidays(year).then(({ data, error }) => {
			if (error) console.error('Error fetching holidays:', error);
			setHolidays(data);
		});
		refreshWorkDays();
	}, [year, refreshWorkDays]);

	const holidaysByDate = useMemo(() => buildHolidayMap(holidays, workDays), [holidays, workDays]);

	return { holidaysByDate, refreshWorkDays };
}
