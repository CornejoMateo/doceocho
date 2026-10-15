import type { Holiday, HolidayType } from '@/helpers/calendar/holidays';

// Public API kept up to date with every decree, so new or moved holidays show up on their own.
const HOLIDAYS_API_URL = 'https://api.argentinadatos.com/v1/feriados';
const ONE_DAY_SECONDS = 60 * 60 * 24;

type ApiHoliday = {
	fecha: string;
	tipo: HolidayType;
	nombre: string;
};

/**
 * Server only. Argentine national holidays for a year, cached for a day.
 * Returns an empty list on failure so the calendar and bookings keep working.
 */
export async function fetchArgentineHolidays(year: number): Promise<Holiday[]> {
	try {
		const response = await fetch(`${HOLIDAYS_API_URL}/${year}`, {
			next: { revalidate: ONE_DAY_SECONDS },
		});

		if (!response.ok) {
			console.error(`[holidays] API responded ${response.status} for ${year}`);
			return [];
		}

		const data = (await response.json()) as ApiHoliday[];

		return data.map((holiday) => ({
			date: holiday.fecha,
			name: holiday.nombre,
			type: holiday.tipo,
		}));
	} catch (error) {
		console.error(`[holidays] Failed to fetch holidays for ${year}:`, error);
		return [];
	}
}

export async function fetchArgentineHolidaysForYears(years: number[]): Promise<Holiday[]> {
	const results = await Promise.all(years.map(fetchArgentineHolidays));

	return results.flat();
}
