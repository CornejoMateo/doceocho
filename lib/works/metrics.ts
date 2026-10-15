import { getLocalDate, isValidDateOnly } from '@/utils/format-date';
import type { WorkWithProgress } from '@/lib/works/works';

export const NO_DATA_LABEL = 'Sin dato';
export const NO_DATA_KEY = 'sin dato';
export const OTHERS_KEY = '__otros__';
export const OTHERS_LABEL = 'Otros';

export const STATUS_LABELS: Record<string, string> = {
	pending: 'Pendiente',
	in_progress: 'En progreso',
	completed: 'Finalizada',
	paused: 'Pausada',
};

export type MultiSelectDimension = 'locality' | 'hood' | 'zone' | 'architect' | 'client' | 'status';
export type BudgetFilter = 'all' | 'with' | 'without';
export type DateRange = { from: string; to: string };

/**
 * Period preset for a date basis. 'lastMonths' is stored relative (N) and resolved against
 * today's Argentina date at filter time, so it stays correct across days.
 */
export type PeriodFilter =
	{ mode: 'none' } | { mode: 'year'; year: number } | { mode: 'lastMonths'; months: number };

export const NO_PERIOD: PeriodFilter = { mode: 'none' };
export const MAX_LAST_MONTHS = 12;

export type WorksFilters = {
	localities: string[];
	hoods: string[];
	zones: string[];
	architects: string[];
	clients: string[];
	statuses: string[];
	hasBudget: BudgetFilter;
	progress: [number, number];
	createdAt: DateRange;
	completionDate: DateRange;
	createdPeriod: PeriodFilter;
	completionPeriod: PeriodFilter;
	search: string;
};

export const defaultFilters: WorksFilters = {
	localities: [],
	hoods: [],
	zones: [],
	architects: [],
	clients: [],
	statuses: [],
	hasBudget: 'all',
	progress: [0, 100],
	createdAt: { from: '', to: '' },
	completionDate: { from: '', to: '' },
	createdPeriod: NO_PERIOD,
	completionPeriod: NO_PERIOD,
	search: '',
};

// normalize text for filtering and grouping: remove accents, collapse whitespace, lowercase
export function normalizeText(value: string | null | undefined): string {
	if (value == null) return '';
	return String(value)
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/\s+/g, ' ')
		.trim()
		.toLowerCase();
}

function normKey(value: string | null | undefined): string {
	return normalizeText(value) || NO_DATA_KEY;
}

// clean label for display: collapse whitespace, trim, fallback to NO_DATA_LABEL
function cleanLabel(value: string | null | undefined): string {
	const v = (value ?? '').replace(/\s+/g, ' ').trim();
	return v || NO_DATA_LABEL;
}

function clientFullName(w: WorkWithProgress): string {
	const name = w.client_name ?? w.clients?.name ?? '';
	const last = w.client_last_name ?? w.clients?.last_name ?? '';
	return `${name} ${last}`.replace(/\s+/g, ' ').trim();
}

// Return a key for the client, either by id or by normalized full name.
function clientKey(w: WorkWithProgress): string {
	if (w.client_id != null) return `id:${w.client_id}`;
	return normKey(clientFullName(w));
}

export const MIN_PLAUSIBLE_YEAR = 2000;
export const MAX_PLAUSIBLE_YEAR = 2100;

// True when a 'YYYY-MM-DD' / 'YYYY-MM' string has a year inside the plausible window.
export function isPlausibleYear(value: string): boolean {
	const y = Number(value.slice(0, 4));
	return y >= MIN_PLAUSIBLE_YEAR && y <= MAX_PLAUSIBLE_YEAR;
}

// Return a local 'YYYY-MM-DD' string from an ISO date string, or null if invalid.
export function getCreatedDate(w: Pick<WorkWithProgress, 'created_at'>): string | null {
	if (!w.created_at) return null;
	if (Number.isNaN(new Date(w.created_at).getTime())) return null;
	const local = getLocalDate(w.created_at);
	return isPlausibleYear(local) ? local : null;
}

/** completion_date is date-only already; never pass through Date/timezones. */
export function getCompletionDate(w: Pick<WorkWithProgress, 'completion_date'>): string | null {
	const v = w.completion_date ? String(w.completion_date).slice(0, 10) : '';
	return isValidDateOnly(v) && isPlausibleYear(v) ? v : null;
}

// Return quantity of days between created_at and completion_date, or null if either is missing or invalid.
function dayNumber(dateOnly: string): number {
	const [y, m, d] = dateOnly.split('-').map(Number);
	return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

export type WorkDuration =
	| { state: 'valid'; days: number }
	| { state: 'negative'; days: number }
	| { state: 'no-completion' }
	| { state: 'invalid' }; // completion present but created_at unusable

export function getWorkDuration(w: WorkWithProgress): WorkDuration {
	if (!getCompletionDate(w) && !w.completion_date) return { state: 'no-completion' };
	const end = getCompletionDate(w);
	const start = getCreatedDate(w);
	if (!end || !start) return { state: 'invalid' };
	const days = dayNumber(end) - dayNumber(start);
	return days < 0 ? { state: 'negative', days } : { state: 'valid', days };
}

function validDays(w: WorkWithProgress): number | null {
	const d = getWorkDuration(w);
	return d.state === 'valid' ? d.days : null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const avg = (xs: number[]) => (xs.length ? round1(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);

// Filters
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Date range a period covers, or null for 'none' / invalid input. `today` is an Argentina
 * 'YYYY-MM-DD' (getLocalDate()); no Date objects are involved, so no timezone shifts.
 * - year: Jan 1 to Dec 31.
 * - lastMonths N: first day of the month N-1 months ago through today (current month included).
 */
export function resolvePeriodRange(period: PeriodFilter, today: string): DateRange | null {
	if (period.mode === 'year') {
		const y = period.year;
		if (!Number.isInteger(y) || y < MIN_PLAUSIBLE_YEAR || y > MAX_PLAUSIBLE_YEAR) return null;
		return { from: `${y}-01-01`, to: `${y}-12-31` };
	}
	if (period.mode === 'lastMonths') {
		const n = period.months;
		const m = DATE_ONLY.exec(today);
		if (!m || !Number.isInteger(n) || n < 1 || n > MAX_LAST_MONTHS) return null;
		const total = Number(m[1]) * 12 + (Number(m[2]) - 1) - (n - 1);
		const fy = Math.floor(total / 12);
		const fm = (total % 12) + 1;
		return { from: `${fy}-${String(fm).padStart(2, '0')}-01`, to: today };
	}
	return null;
}

function inRange(date: string | null, range: DateRange): boolean {
	if (!range.from && !range.to) return true;
	if (!date) return false;
	if (range.from && date < range.from) return false;
	if (range.to && date > range.to) return false;
	return true;
}

function matchesMulti(selected: string[], key: string): boolean {
	return selected.length === 0 || selected.includes(key);
}

export function applyWorkFilters(
	works: WorkWithProgress[],
	filters: WorksFilters = defaultFilters,
	today: string = getLocalDate()
): WorkWithProgress[] {
	const search = normalizeText(filters.search);
	const [minP, maxP] = filters.progress;
	const createdPeriod = resolvePeriodRange(filters.createdPeriod ?? NO_PERIOD, today);
	const completionPeriod = resolvePeriodRange(filters.completionPeriod ?? NO_PERIOD, today);
	const progressIsDefault = minP <= 0 && maxP >= 100;
	return works.filter((w) => {
		if (!matchesMulti(filters.localities, normKey(w.locality))) return false;
		if (!matchesMulti(filters.hoods, normKey(w.hood))) return false;
		if (!matchesMulti(filters.zones, normKey(w.zone))) return false;
		if (!matchesMulti(filters.architects, normKey(w.architect))) return false;
		if (!matchesMulti(filters.clients, clientKey(w))) return false;
		if (!matchesMulti(filters.statuses, normKey(w.status))) return false;
		if (filters.hasBudget === 'with' && !w.hasBudget) return false;
		if (filters.hasBudget === 'without' && w.hasBudget) return false;
		if (!progressIsDefault && (w.progress < minP || w.progress > maxP)) return false;
		const created = getCreatedDate(w);
		const completed = getCompletionDate(w);
		if (!inRange(created, filters.createdAt)) return false;
		if (!inRange(completed, filters.completionDate)) return false;
		// Periods are ANDed with the manual ranges; works without the date are excluded.
		if (createdPeriod && !inRange(created, createdPeriod)) return false;
		if (completionPeriod && !inRange(completed, completionPeriod)) return false;
		if (search) {
			const hay = [
				w.address,
				w.client_name,
				w.client_last_name,
				w.clients?.name,
				w.clients?.last_name,
				w.name,
			];
			if (!hay.some((h) => normalizeText(h).includes(search))) return false;
		}
		return true;
	});
}

export type FilterOption = { value: string; label: string; count: number };
export type DateBasis = 'createdAt' | 'completionDate';
export type FilterOptions = Record<MultiSelectDimension, FilterOption[]> & {
	/** Years (newest first) that have at least one valid date, per date basis. */
	years: Record<DateBasis, number[]>;
};

function dimensionValue(
	w: WorkWithProgress,
	dim: MultiSelectDimension
): { key: string; label: string } {
	switch (dim) {
		case 'locality':
			return { key: normKey(w.locality), label: cleanLabel(w.locality) };
		case 'hood':
			return { key: normKey(w.hood), label: cleanLabel(w.hood) };
		case 'zone':
			return { key: normKey(w.zone), label: cleanLabel(w.zone) };
		case 'architect':
			return { key: normKey(w.architect), label: cleanLabel(w.architect) };
		case 'client':
			return { key: clientKey(w), label: cleanLabel(clientFullName(w)) };
		case 'status':
			return {
				key: normKey(w.status),
				label: w.status ? (STATUS_LABELS[w.status] ?? cleanLabel(w.status)) : NO_DATA_LABEL,
			};
	}
}

type Bucket = { key: string; spellings: Map<string, number>; works: WorkWithProgress[] };

function bucketBy(works: WorkWithProgress[], dim: MultiSelectDimension): Map<string, Bucket> {
	const map = new Map<string, Bucket>();
	for (const w of works) {
		const { key, label } = dimensionValue(w, dim);
		let b = map.get(key);
		if (!b) map.set(key, (b = { key, spellings: new Map(), works: [] }));
		b.spellings.set(label, (b.spellings.get(label) ?? 0) + 1);
		b.works.push(w);
	}
	return map;
}

function bestLabel(b: Bucket): string {
	if (b.key === NO_DATA_KEY) return NO_DATA_LABEL;
	let best = '';
	let bestN = -1;
	for (const [label, n] of b.spellings) {
		if (n > bestN || (n === bestN && label < best)) {
			best = label;
			bestN = n;
		}
	}
	return best;
}

/** Years present in valid (plausible) creation / completion dates, newest first. */
export function availableYears(works: WorkWithProgress[]): Record<DateBasis, number[]> {
	const created = new Set<number>();
	const completed = new Set<number>();
	for (const w of works) {
		const c = getCreatedDate(w);
		if (c) created.add(Number(c.slice(0, 4)));
		const d = getCompletionDate(w);
		if (d) completed.add(Number(d.slice(0, 4)));
	}
	const desc = (set: Set<number>) => [...set].sort((a, b) => b - a);
	return { createdAt: desc(created), completionDate: desc(completed) };
}

export function getFilterOptions(works: WorkWithProgress[]): FilterOptions {
	const dims: MultiSelectDimension[] = [
		'locality',
		'hood',
		'zone',
		'architect',
		'client',
		'status',
	];
	const out = {} as FilterOptions;
	out.years = availableYears(works);
	for (const dim of dims) {
		out[dim] = [...bucketBy(works, dim).values()]
			.map((b) => ({ value: b.key, label: bestLabel(b), count: b.works.length }))
			.sort((a, b) => a.label.localeCompare(b.label, 'es'));
	}
	return out;
}

/* ------------------------------------ KPIs ---------------------------------- */

export type DurationStats = {
	count: number;
	avg: number | null;
	median: number | null;
	min: number | null;
	max: number | null;
};

export type Kpis = {
	total: number;
	pending: number;
	inProgress: number;
	completed: number;
	paused: number;
	avgProgress: number;
	withoutBudget: number;
	duration: DurationStats;
	/** Works with no (valid) completion_date. */
	withoutCompletionDate: number;
	/** Works with status 'completed' but no completion_date. */
	completedWithoutDate: number;
	/** Works whose completion_date precedes created_at (excluded from duration stats). */
	negativeDurationCount: number;
};

function durationStats(days: number[]): DurationStats {
	if (!days.length) return { count: 0, avg: null, median: null, min: null, max: null };
	const s = [...days].sort((a, b) => a - b);
	const mid = Math.floor(s.length / 2);
	const median = s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
	return { count: s.length, avg: avg(s), median, min: s[0], max: s[s.length - 1] };
}

export function computeKpis(works: WorkWithProgress[]): Kpis {
	const days: number[] = [];
	let negative = 0;
	let withoutCompletion = 0;
	let completedWithoutDate = 0;
	for (const w of works) {
		const d = getWorkDuration(w);
		if (d.state === 'valid') days.push(d.days);
		else if (d.state === 'negative') negative++;
		if (!getCompletionDate(w)) {
			withoutCompletion++;
			if (w.status === 'completed') completedWithoutDate++;
		}
	}
	const count = (s: string) => works.filter((w) => w.status === s).length;
	return {
		total: works.length,
		pending: count('pending'),
		inProgress: count('in_progress'),
		completed: count('completed'),
		paused: count('paused'),
		avgProgress: avg(works.map((w) => w.progress ?? 0)),
		withoutBudget: works.filter((w) => !w.hasBudget).length,
		duration: durationStats(days),
		withoutCompletionDate: withoutCompletion,
		completedWithoutDate,
		negativeDurationCount: negative,
	};
}

// Grouping and ranking

export type GroupBy = MultiSelectDimension | 'createdMonth' | 'completedMonth';
export type GroupMetric = 'count' | 'avgProgress' | 'avgDuration';
export type GroupRow = { key: string; label: string; value: number; count: number };

function metricOf(ws: WorkWithProgress[], metric: GroupMetric): { value: number; count: number } {
	if (metric === 'avgProgress')
		return { value: avg(ws.map((w) => w.progress ?? 0)), count: ws.length };
	if (metric === 'avgDuration') {
		const d = ws.map(validDays).filter((x): x is number => x !== null);
		return { value: avg(d), count: d.length };
	}
	return { value: ws.length, count: ws.length };
}

/** 'YYYY-MM' list from min to max inclusive, clamped to the plausible year window. */
export function monthRange(min: string, max: string): string[] {
	const clamp = (v: string, edge: 'min' | 'max'): [number, number] => {
		const [y, m] = v.split('-').map(Number);
		if (!Number.isFinite(y) || !Number.isFinite(m))
			return [edge === 'min' ? MIN_PLAUSIBLE_YEAR : MAX_PLAUSIBLE_YEAR, edge === 'min' ? 1 : 12];
		if (y < MIN_PLAUSIBLE_YEAR) return [MIN_PLAUSIBLE_YEAR, 1];
		if (y > MAX_PLAUSIBLE_YEAR) return [MAX_PLAUSIBLE_YEAR, 12];
		return [y, m];
	};
	let [y, m] = clamp(min, 'min');
	const [ey, em] = clamp(max, 'max');
	const out: string[] = [];
	while (y < ey || (y === ey && m <= em)) {
		out.push(`${y}-${String(m).padStart(2, '0')}`);
		m++;
		if (m > 12) {
			m = 1;
			y++;
		}
	}
	return out;
}

export function groupWorks(
	works: WorkWithProgress[],
	opts: { groupBy: GroupBy; metric: GroupMetric; topN?: number }
): GroupRow[] {
	const { groupBy, metric, topN } = opts;

	if (groupBy === 'createdMonth' || groupBy === 'completedMonth') {
		const buckets = new Map<string, WorkWithProgress[]>();
		for (const w of works) {
			const date = groupBy === 'createdMonth' ? getCreatedDate(w) : getCompletionDate(w);
			if (!date) continue;
			const month = date.slice(0, 7);
			(buckets.get(month) ?? buckets.set(month, []).get(month)!).push(w);
		}
		if (!buckets.size) return [];
		const months = [...buckets.keys()].sort();
		return monthRange(months[0], months[months.length - 1]).map((month) => {
			const { value, count } = metricOf(buckets.get(month) ?? [], metric);
			return { key: month, label: month, value, count };
		});
	}

	let rows = [...bucketBy(works, groupBy).values()].map((b) => ({
		key: b.key,
		label: bestLabel(b),
		works: b.works,
		...metricOf(b.works, metric),
	}));
	// avgDuration: groups without any valid duration carry no information
	if (metric === 'avgDuration') rows = rows.filter((r) => r.count > 0);
	rows.sort(
		(a, b) => b.value - a.value || b.count - a.count || a.label.localeCompare(b.label, 'es')
	);

	if (topN != null && topN > 0 && rows.length > topN) {
		const rest = rows.slice(topN).flatMap((r) => r.works);
		const others = { key: OTHERS_KEY, label: OTHERS_LABEL, works: rest, ...metricOf(rest, metric) };
		rows = [...rows.slice(0, topN), others];
	}
	return rows.map(({ key, label, value, count }) => ({ key, label, value, count }));
}

// Monthly evolution of created and completed works, for charting.

export type MonthlyPoint = { month: string; created: number; completed: number };

export function monthlyEvolution(works: WorkWithProgress[]): MonthlyPoint[] {
	const created = new Map<string, number>();
	const completed = new Map<string, number>();
	for (const w of works) {
		const c = getCreatedDate(w);
		if (c) created.set(c.slice(0, 7), (created.get(c.slice(0, 7)) ?? 0) + 1);
		const d = getCompletionDate(w);
		if (d) completed.set(d.slice(0, 7), (completed.get(d.slice(0, 7)) ?? 0) + 1);
	}
	const all = [...created.keys(), ...completed.keys()].sort();
	if (!all.length) return [];
	return monthRange(all[0], all[all.length - 1]).map((month) => ({
		month,
		created: created.get(month) ?? 0,
		completed: completed.get(month) ?? 0,
	}));
}

// Ranking works by duration, for charting and reporting.

export type RankedWork = { work: WorkWithProgress; days: number };

export function rankWorks(
	works: WorkWithProgress[],
	opts: { by: 'fastest' | 'slowest'; limit: number }
): RankedWork[] {
	const ranked: RankedWork[] = [];
	for (const work of works) {
		const days = validDays(work);
		if (days !== null) ranked.push({ work, days });
	}
	const dir = opts.by === 'fastest' ? 1 : -1;
	ranked.sort((a, b) => dir * (a.days - b.days) || a.work.id - b.work.id);
	return ranked.slice(0, Math.max(0, opts.limit));
}
