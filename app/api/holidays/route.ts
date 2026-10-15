import { NextRequest, NextResponse } from 'next/server';
import { fetchArgentineHolidays } from '@/lib/calendar/argentine-holidays';

const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

/** Argentine national holidays for a year. Proxied so the browser hits our cache, not the API. */
export async function GET(req: NextRequest) {
	const year = Number(req.nextUrl.searchParams.get('year') ?? new Date().getFullYear());

	if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) {
		return NextResponse.json({ error: 'Año inválido' }, { status: 400 });
	}

	return NextResponse.json(await fetchArgentineHolidays(year));
}
