import type { GroupBy, GroupMetric, WorksFilters, MultiSelectDimension } from '@/lib/works/metrics';
import { DIMENSION_FIELD, type DateField } from '@/helpers/works/filter-model';
import { MONTHS_ES } from '@/constants/months';

/* Chart builder model: specs, constraints, formatting. Pure, no React. */

export type ChartType = 'bar' | 'barHorizontal' | 'pie' | 'donut' | 'line' | 'area';

export type ChartSpec = {
	id: string;
	groupBy: GroupBy;
	metric: GroupMetric;
	type: ChartType;
	/** 0 = show every group. Ignored for month groupings. */
	topN: number;
};

/** Horizontal bars grow 34px per row; beyond this many rows the chart is cut (data/CSV keep all). */
export const MAX_HORIZONTAL_ROWS = 40;

/** Rows actually drawn for a chart type. */
export function drawnRows<T>(spec: Pick<ChartSpec, 'type'>, rows: T[]): T[] {
	return spec.type === 'barHorizontal' ? rows.slice(0, MAX_HORIZONTAL_ROWS) : rows;
}

/** Visible note when the chart shows fewer groups than the data has; null otherwise. */
export function truncationNote(spec: Pick<ChartSpec, 'type'>, total: number): string | null {
	const shown = drawnRows(spec, new Array(total)).length;
	return shown < total ? `Mostrando ${shown} de ${total} grupos. El CSV incluye todos.` : null;
}

/** DOM ids so a later step can capture each panel (html2canvas / jsPDF). */
export const EXPORT_IDS = {
	kpis: 'works-metrics-kpis',
	evolution: 'works-metrics-evolution',
	rankings: 'works-metrics-rankings',
	table: 'works-metrics-table',
	chart: (id: string) => `works-metrics-chart-${id}`,
};

export const GROUP_BY_LABELS: Record<GroupBy, string> = {
	locality: 'Localidad',
	hood: 'Barrio',
	zone: 'Zona',
	architect: 'Arquitecto',
	client: 'Cliente',
	status: 'Estado',
	createdMonth: 'Mes de creación',
	completedMonth: 'Mes de finalización',
};

export const METRIC_LABELS: Record<GroupMetric, string> = {
	count: 'Cantidad de obras',
	avgProgress: 'Avance promedio',
	avgDuration: 'Duración promedio',
};

export const TYPE_LABELS: Record<ChartType, string> = {
	bar: 'Barras',
	barHorizontal: 'Barras horizontales',
	pie: 'Torta',
	donut: 'Dona',
	line: 'Línea',
	area: 'Área',
};

export const TOP_N_OPTIONS = [5, 8, 10, 15, 20, 0];
export const PIE_MAX_TOP_N = 10;

export const isMonthGroup = (g: GroupBy): g is 'createdMonth' | 'completedMonth' =>
	g === 'createdMonth' || g === 'completedMonth';

/** Reason a chart type cannot be used with this grouping/metric, or null when allowed. */
export function typeDisabledReason(
	groupBy: GroupBy,
	metric: GroupMetric,
	type: ChartType
): string | null {
	const months = isMonthGroup(groupBy);
	if (type === 'pie' || type === 'donut') {
		if (metric !== 'count')
			return 'La torta y la dona solo muestran totales que suman un todo: elegí "Cantidad de obras".';
		if (months) return 'Los meses siguen un orden en el tiempo: usá línea, área o barras.';
	}
	if ((type === 'line' || type === 'area') && !months)
		return 'La línea y el área unen puntos ordenados en el tiempo: elegí un mes como agrupación.';
	return null;
}

export function topNDisabledReason(groupBy: GroupBy, type: ChartType, topN: number): string | null {
	if (isMonthGroup(groupBy)) return 'Los meses se muestran completos y en orden cronológico.';
	if ((type === 'pie' || type === 'donut') && (topN === 0 || topN > PIE_MAX_TOP_N))
		return `La torta legible admite hasta ${PIE_MAX_TOP_N} porciones.`;
	return null;
}

export function defaultTypeFor(groupBy: GroupBy): ChartType {
	return isMonthGroup(groupBy) ? 'line' : 'bar';
}

/** Repairs invalid combinations, choosing the closest valid option. */
export function normalizeSpec(spec: ChartSpec): ChartSpec {
	let { type, topN } = spec;
	if (typeDisabledReason(spec.groupBy, spec.metric, type)) type = defaultTypeFor(spec.groupBy);
	if (
		!isMonthGroup(spec.groupBy) &&
		(type === 'pie' || type === 'donut') &&
		(topN === 0 || topN > PIE_MAX_TOP_N)
	)
		topN = PIE_MAX_TOP_N;
	return { ...spec, type, topN };
}

export function createSpec(id: string, overrides: Partial<ChartSpec> = {}): ChartSpec {
	return normalizeSpec({
		id,
		groupBy: 'locality',
		metric: 'count',
		type: 'bar',
		topN: 8,
		...overrides,
	});
}

/** The chart a fresh session starts with. */
export const createDefaultSpec = (): ChartSpec =>
	createSpec('a', { groupBy: 'locality', metric: 'count', type: 'bar', topN: 8 });

export function chartTitle(spec: ChartSpec): string {
	const group = GROUP_BY_LABELS[spec.groupBy].toLowerCase();
	const base =
		spec.metric === 'count' ? `Obras por ${group}` : `${METRIC_LABELS[spec.metric]} por ${group}`;
	return !isMonthGroup(spec.groupBy) && spec.topN > 0 ? `${base} (top ${spec.topN})` : base;
}

// Filter
export type FilterTarget =
	{ kind: 'dimension'; dim: MultiSelectDimension } | { kind: 'month'; field: DateField };

export function filterTargetOf(groupBy: GroupBy): FilterTarget {
	if (groupBy === 'createdMonth') return { kind: 'month', field: 'createdAt' };
	if (groupBy === 'completedMonth') return { kind: 'month', field: 'completionDate' };
	return { kind: 'dimension', dim: groupBy };
}

/** Filters without the chart's own dimension, so every bar stays visible while one is selected. */
export function withoutOwnFilter(filters: WorksFilters, groupBy: GroupBy): WorksFilters {
	const target = filterTargetOf(groupBy);
	if (target.kind === 'dimension') return { ...filters, [DIMENSION_FIELD[target.dim]]: [] };
	return { ...filters, [target.field]: { from: '', to: '' } };
}

// Format YYYY-MM month as "sep 2026" (short Spanish name); raw string when out of range.
export function formatMonth(month: string): string {
	const match = /^(\d{4})-(\d{2})$/.exec(month);
	if (!match) return month;
	const name = MONTHS_ES[Number(match[2]) - 1];
	return name ? `${name} ${match[1]}` : month;
}

const nf = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 });
export const formatNumber = (n: number) => nf.format(n);

export function formatMetricValue(metric: GroupMetric, value: number): string {
	if (metric === 'avgProgress') return `${formatNumber(value)}%`;
	if (metric === 'avgDuration') return `${formatNumber(value)} d`;
	return formatNumber(value);
}

export const formatDays = (n: number | null) => (n == null ? 'Sin dato' : `${formatNumber(n)} d`);

// Theme chart tokens first, then earthy fixed hues that read on both light and dark cards.
export const PALETTE = [
	'var(--chart-1)',
	'var(--chart-3)',
	'var(--chart-2)',
	'#a67c52',
	'#5f7f8c',
	'#b0645a',
	'#8f8a3d',
	'#7b6a94',
	'#4c8f7a',
	'#c08a3e',
];
export const OTHERS_COLOR = 'var(--muted-foreground)';
export const SERIES_CREATED = 'var(--chart-1)';
export const SERIES_COMPLETED = 'var(--accent)';
