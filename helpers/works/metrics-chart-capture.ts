import type { ChartSpec } from '@/components/business/works/metrics/chart-model';
import { formatMetricValue, truncationNote } from '@/components/business/works/metrics/chart-model';
import type { LegendItem } from '@/utils/svg-to-png';
import type { ExportRow } from './metrics-export';

/** Pie/donut slices have no axis labels, so their image carries a legend; other types do not need one. */
export function chartLegend(spec: ChartSpec, rows: ExportRow[]): LegendItem[] | undefined {
	if (spec.type !== 'pie' && spec.type !== 'donut') return undefined;
	return rows.map((r) => ({
		label: `${r.label} (${formatMetricValue(spec.metric, r.value)})`,
		color: r.fill ?? '#888888',
	}));
}

export function evolutionLegend(created: string, completed: string): LegendItem[] {
	return [
		{ label: 'Creadas', color: created },
		{ label: 'Finalizadas', color: completed },
	];
}

export const chartNote = (spec: ChartSpec, rows: ExportRow[]): string | undefined =>
	truncationNote(spec, rows.length) ?? undefined;
