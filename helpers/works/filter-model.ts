import {
	defaultFilters,
	NO_DATA_KEY,
	NO_PERIOD,
	resolvePeriodRange,
	type PeriodFilter,
	STATUS_LABELS,
	type DateRange,
	type FilterOptions,
	type MultiSelectDimension,
	type WorksFilters,
} from '@/lib/works/metrics';
import { formatDateOnly, getLocalDate } from '@/utils/format-date';
import { MONTHS_ES } from '@/constants/months';

/* Pure helpers around WorksFilters shared by the list tab and the metrics tab. */

export type MultiFilterField =
	'localities' | 'hoods' | 'zones' | 'architects' | 'clients' | 'statuses';

export const DIMENSION_FIELD: Record<MultiSelectDimension, MultiFilterField> = {
	locality: 'localities',
	hood: 'hoods',
	zone: 'zones',
	architect: 'architects',
	client: 'clients',
	status: 'statuses',
};

export const DIMENSION_LABELS: Record<MultiSelectDimension, string> = {
	locality: 'Localidad',
	hood: 'Barrio',
	zone: 'Zona',
	architect: 'Arquitecto',
	client: 'Cliente',
	status: 'Estado',
};

export type DateField = 'createdAt' | 'completionDate';

export const DATE_FIELD_LABELS: Record<DateField, string> = {
	createdAt: 'Creación',
	completionDate: 'Finalización',
};

export { defaultFilters };

export const PERIOD_FIELD: Record<DateField, 'createdPeriod' | 'completionPeriod'> = {
	createdAt: 'createdPeriod',
	completionDate: 'completionPeriod',
};

function monthYear(dateOnly: string): string {
	const [y, m] = dateOnly.split('-');
	return `${MONTHS_ES[Number(m) - 1] ?? m} ${y}`;
}

export function encodePeriod(p: PeriodFilter): string {
	return p.mode === 'year'
		? `year:${p.year}`
		: p.mode === 'lastMonths'
			? `last:${p.months}`
			: 'none';
}

export function decodePeriod(value: string): PeriodFilter {
	const [kind, n] = value.split(':');
	if (kind === 'year' && Number.isInteger(Number(n))) return { mode: 'year', year: Number(n) };
	if (kind === 'last' && Number.isInteger(Number(n)))
		return { mode: 'lastMonths', months: Number(n) };
	return NO_PERIOD;
}

export function periodLabel(period: PeriodFilter): string {
	if (period.mode === 'year') return String(period.year);
	if (period.mode === 'lastMonths')
		return `últimos ${period.months} ${period.months === 1 ? 'mes' : 'meses'}`;
	return '';
}

export function periodExportLabel(period: PeriodFilter, today: string): string {
	if (period.mode === 'year') return `año ${period.year}`;
	const range = resolvePeriodRange(period, today);
	if (period.mode === 'lastMonths' && range)
		return `${periodLabel(period)} (${monthYear(range.from)} – ${monthYear(range.to)})`;
	return periodLabel(period);
}

export function toggleDimensionValue(
	filters: WorksFilters,
	dim: MultiSelectDimension,
	key: string
): WorksFilters {
	const field = DIMENSION_FIELD[dim];
	const current = filters[field];
	const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
	return { ...filters, [field]: next };
}

export function clearDimension(filters: WorksFilters, dim: MultiSelectDimension): WorksFilters {
	return { ...filters, [DIMENSION_FIELD[dim]]: [] };
}

/** First and last calendar day of a 'YYYY-MM' month. */
export function monthBounds(month: string): DateRange {
	const [y, m] = month.split('-').map(Number);
	const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
	return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` };
}

export function isMonthSelected(range: DateRange, month: string): boolean {
	const b = monthBounds(month);
	return range.from === b.from && range.to === b.to;
}

/** Selects the month as a date range; clicking the selected month clears the range. */
export function toggleMonthFilter(
	filters: WorksFilters,
	field: DateField,
	month: string
): WorksFilters {
	const next = isMonthSelected(filters[field], month) ? { from: '', to: '' } : monthBounds(month);
	return { ...filters, [field]: next };
}

export type FilterChip = {
	id: string;
	group: string;
	label: string;
	/** Longer text for exports, when it differs from the on-screen label. */
	exportLabel?: string;
	remove: (f: WorksFilters) => WorksFilters;
};

function optionLabel(options: FilterOptions, dim: MultiSelectDimension, key: string): string {
	const found = options[dim].find((o) => o.value === key);
	if (found) return found.label;
	if (dim === 'status') return STATUS_LABELS[key] ?? key;
	return key === NO_DATA_KEY ? 'Sin datos' : key;
}

function rangeText(range: DateRange): string {
	if (range.from && range.to) return `${formatDateOnly(range.from)} al ${formatDateOnly(range.to)}`;
	if (range.from) return `desde ${formatDateOnly(range.from)}`;
	return `hasta ${formatDateOnly(range.to)}`;
}

export function getFilterChips(
	filters: WorksFilters,
	options: FilterOptions,
	today: string = getLocalDate()
): FilterChip[] {
	const chips: FilterChip[] = [];

	if (filters.search.trim()) {
		chips.push({
			id: 'search',
			group: 'Búsqueda',
			label: `“${filters.search.trim()}”`,
			remove: (f) => ({ ...f, search: '' }),
		});
	}

	(Object.keys(DIMENSION_FIELD) as MultiSelectDimension[]).forEach((dim) => {
		filters[DIMENSION_FIELD[dim]].forEach((key) => {
			chips.push({
				id: `${dim}:${key}`,
				group: DIMENSION_LABELS[dim],
				label: optionLabel(options, dim, key),
				remove: (f) => toggleDimensionValue(f, dim, key),
			});
		});
	});

	if (filters.hasBudget !== 'all') {
		chips.push({
			id: 'budget',
			group: 'Presupuesto',
			label: filters.hasBudget === 'with' ? 'Con' : 'Sin',
			remove: (f) => ({ ...f, hasBudget: 'all' }),
		});
	}

	if (filters.progress[0] !== 0 || filters.progress[1] !== 100) {
		chips.push({
			id: 'progress',
			group: 'Avance',
			label: `${filters.progress[0]}% a ${filters.progress[1]}%`,
			remove: (f) => ({ ...f, progress: [0, 100] }),
		});
	}

	(Object.keys(DATE_FIELD_LABELS) as DateField[]).forEach((field) => {
		const period = filters[PERIOD_FIELD[field]] ?? NO_PERIOD;
		if (period.mode !== 'none') {
			chips.push({
				id: `${field}-period`,
				group: DATE_FIELD_LABELS[field],
				label: periodLabel(period),
				exportLabel: periodExportLabel(period, today),
				remove: (f) => ({ ...f, [PERIOD_FIELD[field]]: NO_PERIOD }),
			});
		}
		const range = filters[field];
		if (range.from || range.to) {
			chips.push({
				id: field,
				group: DATE_FIELD_LABELS[field],
				label: rangeText(range),
				remove: (f) => ({ ...f, [field]: { from: '', to: '' } }),
			});
		}
	});

	return chips;
}

/** Human readable filter lines, e.g. ['Localidad: Palermo, Recoleta', 'Avance: 20% a 80%']. Used by exports. */
export function describeFilters(
	filters: WorksFilters,
	options: FilterOptions,
	today: string = getLocalDate()
): string[] {
	const groups = new Map<string, string[]>();
	for (const chip of getFilterChips(filters, options, today)) {
		const list = groups.get(chip.group) ?? [];
		list.push(chip.exportLabel ?? chip.label);
		groups.set(chip.group, list);
	}
	return [...groups.entries()].map(([group, labels]) => `${group}: ${labels.join(', ')}`);
}
