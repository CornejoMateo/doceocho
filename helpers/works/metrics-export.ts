import { NO_DATA_LABEL, type Kpis, type RankedWork } from '@/lib/works/metrics';
import type { MonthlyPoint } from '@/lib/works/metrics';
import type { WorkWithProgress } from '@/lib/works/works';
import {
	workClient,
	workCreated,
	workTitle,
} from '@/components/business/works/metrics/work-display';
import {
	formatDays,
	formatNumber,
	formatMonth,
} from '@/components/business/works/metrics/chart-model';
import { buildTableFromColumns, selectColumns } from '@/utils/export-columns';
import { METRICS_DETAIL_COLUMN_KEYS, WORK_COLUMNS } from './works-columns';

/* Pure data shaping for the Métricas exports (PDF / CSV). No DOM, no jsPDF. */

export type Table = {
	headers: string[];
	rows: (string | number)[][];
	/** Present for tables built from export columns. */
	aligns?: ('left' | 'right' | 'center')[];
	widths?: (number | undefined)[];
};

export { exportFilename } from '@/utils/export-filename';
export { fitImage } from '@/helpers/pdf/layout';

const text = (v: string | null | undefined) => v?.trim() || NO_DATA_LABEL;

/** The Métricas detail table: every work, newest first (same default order as the on-screen table). */
export function worksTable(works: WorkWithProgress[], forCsv = false): Table {
	const sorted = [...works].sort((a, b) => {
		const ca = workCreated(a) ?? '';
		const cb = workCreated(b) ?? '';
		return ca === cb ? a.id - b.id : ca < cb ? 1 : -1;
	});
	const columns = selectColumns(WORK_COLUMNS, METRICS_DETAIL_COLUMN_KEYS);
	const t = buildTableFromColumns(sorted, columns, forCsv ? 'csv' : 'pdf');
	return t;
}

export type ExportRow = { label: string; value: number; count: number; fill?: string };

const METRIC_HEADER: Record<string, string> = {
	count: 'Cantidad de obras',
	avgProgress: 'Avance promedio (%)',
	avgDuration: 'Duración promedio (días)',
};

/** Data behind one chart: group, value and how many works fed it. */
export function chartTable(groupLabel: string, metric: string, rows: ExportRow[]): Table {
	return {
		headers: [groupLabel, METRIC_HEADER[metric] ?? 'Valor', 'Obras'],
		rows: rows.map((r) => [r.label, r.value, r.count]),
	};
}

export function evolutionTable(points: MonthlyPoint[]): Table {
	return {
		headers: ['Mes', 'Creadas', 'Finalizadas'],
		rows: points.map((p) => [formatMonth(p.month), p.created, p.completed]),
	};
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const pct = (part: number, total: number) =>
	total ? `${formatNumber((part / total) * 100)}% del total` : 'Sin obras';

/** [indicator, value, detail] rows mirroring the KPI cards. */
export function kpiRows(k: Kpis): string[][] {
	const durationDetail =
		k.duration.count === 0
			? 'Sin obras con duración calculable'
			: `${k.duration.count} de ${plural(k.total, 'obra', 'obras')} con dato`;
	return [
		['Total de obras', String(k.total), 'Según filtros activos'],
		['Finalizadas', String(k.completed), pct(k.completed, k.total)],
		['En progreso', String(k.inProgress), pct(k.inProgress, k.total)],
		['Pendientes', String(k.pending), pct(k.pending, k.total)],
		['En pausa', String(k.paused), pct(k.paused, k.total)],
		['Avance promedio', `${formatNumber(k.avgProgress)}%`, 'Promedio de todas las obras'],
		['Sin presupuesto', String(k.withoutBudget), pct(k.withoutBudget, k.total)],
		['Duración promedio', formatDays(k.duration.avg), durationDetail],
		['Duración mediana', formatDays(k.duration.median), durationDetail],
	];
}

export function kpiWarnings(k: Kpis): string[] {
	const out: string[] = [];
	if (k.completedWithoutDate > 0)
		out.push(
			`${plural(k.completedWithoutDate, 'obra finalizada', 'obras finalizadas')} sin fecha de finalización: no entra en la duración.`
		);
	if (k.negativeDurationCount > 0)
		out.push(
			`${plural(k.negativeDurationCount, 'obra tiene', 'obras tienen')} fecha de finalización anterior a la de creación: se excluye de la duración.`
		);
	return out;
}

export function rankingTable(items: RankedWork[]): Table {
	return {
		headers: ['#', 'Obra', 'Cliente', 'Localidad', 'Duración'],
		rows: items.map(({ work, days }, i) => [
			i + 1,
			workTitle(work),
			text(workClient(work)),
			text(work.locality),
			formatDays(days),
		]),
	};
}
