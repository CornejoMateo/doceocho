import {
	workClient,
	workCompleted,
	workCreated,
	workTitle,
} from '@/components/business/works/metrics/work-display';
import { formatDays } from '@/components/business/works/metrics/chart-model';
import { NO_DATA_LABEL, STATUS_LABELS, getWorkDuration } from '@/lib/works/metrics';
import type { WorkWithProgress } from '@/lib/works/works';
import type { ExportColumn } from '@/utils/export-columns';
import { formatDateOnly } from '@/utils/format-date';

/** Column definitions for exporting works, shared by the works list and the Métricas tab. */

const text = (v: string | null | undefined) => v?.trim() || NO_DATA_LABEL;
const dateCell = (v: string | null) => (v ? formatDateOnly(v) : NO_DATA_LABEL);

function durationText(w: WorkWithProgress): string {
	const d = getWorkDuration(w);
	if (d.state === 'valid') return formatDays(d.days);
	if (d.state === 'negative') return 'Fechas inválidas';
	if (d.state === 'no-completion') return 'En curso';
	return NO_DATA_LABEL;
}

export const WORK_COLUMNS: ExportColumn<WorkWithProgress>[] = [
	{ key: 'name', weight: 4, label: 'Nombre', align: 'center', accessor: (w) => workTitle(w) },
	{
		key: 'client',
		weight: 3,
		label: 'Cliente',
		align: 'center',
		accessor: (w) => text(workClient(w)),
	},
	{
		key: 'address',
		weight: 4,
		label: 'Dirección',
		align: 'center',
		accessor: (w) => text(w.address),
	},
	{
		key: 'locality',
		weight: 2.5,
		label: 'Localidad',
		align: 'center',
		accessor: (w) => text(w.locality),
	},
	{ key: 'hood', weight: 2, label: 'Barrio', align: 'center', accessor: (w) => text(w.hood) },
	{ key: 'zone', weight: 2, label: 'Zona', align: 'center', accessor: (w) => text(w.zone) },
	{
		key: 'architect',
		weight: 2.5,
		label: 'Arq.',
		align: 'center',
		accessor: (w) => text(w.architect),
	},
	{
		key: 'status',
		weight: 2,
		label: 'Estado',
		align: 'center',
		accessor: (w) => (w.status ? (STATUS_LABELS[w.status] ?? w.status) : NO_DATA_LABEL),
	},
	{
		key: 'progress',
		weight: 1.6,
		label: 'Avance',
		csvLabel: 'Avance (%)',
		align: 'center',
		accessor: (w, mode) => (mode === 'csv' ? (w.progress ?? 0) : `${w.progress ?? 0}%`),
	},
	{
		key: 'budget',
		weight: 2.2,
		label: 'Presupuesto',
		accessor: (w) => (w.hasBudget ? 'Con' : 'Sin'),
		align: 'center',
	},
	{
		key: 'furniture',
		weight: 2.5,
		label: 'Mobil.',
		align: 'center',
		accessor: (w) => text(w.furniture),
	},
	{
		key: 'checklists',
		weight: 1.8,
		label: 'Checklists',
		align: 'center',
		accessor: (w) => new Set((w.tasks ?? []).map((t) => t.checklist_id)).size,
	},
	{
		key: 'created',
		weight: 2,
		label: 'Creada',
		align: 'center',
		accessor: (w) => dateCell(workCreated(w)),
	},
	{
		key: 'completed',
		weight: 2,
		label: 'Finalizada',
		align: 'center',
		accessor: (w) => dateCell(workCompleted(w)),
	},
	{
		key: 'duration',
		weight: 1.8,
		label: 'Duración',
		csvLabel: 'Duración (días)',
		align: 'center',
		accessor: (w, mode) => {
			const d = getWorkDuration(w);
			if (mode === 'csv') return d.state === 'valid' ? d.days : ''; // numeric column: no text in CSV
			return durationText(w);
		},
	},
];

export const WORK_COLUMN_KEYS = WORK_COLUMNS.map((c) => c.key);

/** Preselected in the "Exportar obras" dialog. */
export const DEFAULT_WORK_COLUMN_KEYS = [
	'name',
	'client',
	'locality',
	'status',
	'progress',
	'budget',
	'created',
	'completed',
];

/** Columns of the detail table in the Métricas tab (on screen, PDF and CSV). */
export const METRICS_DETAIL_COLUMN_KEYS = [
	'name',
	'client',
	'locality',
	'hood',
	'zone',
	'architect',
	'status',
	'progress',
	'created',
	'completed',
	'duration',
];
