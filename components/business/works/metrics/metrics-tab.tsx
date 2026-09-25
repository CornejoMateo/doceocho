'use client';

import { useCallback, useMemo, useState } from 'react';
import { Download, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { exportFilename, worksTable, type ExportRow } from '@/helpers/works/metrics-export';
import { buildCsv } from '@/utils/csv';
import { downloadCsv } from '@/utils/download-file';
import { Skeleton } from '@/components/ui/skeleton';
import {
	OTHERS_KEY,
	computeKpis,
	defaultFilters,
	type FilterOptions,
	type Kpis,
	type WorksFilters,
} from '@/lib/works/metrics';
import type { WorkWithProgress } from '@/lib/works/works';
import { ChartBuilder } from './chart-builder';
import { EXPORT_IDS, chartTitle, filterTargetOf, type ChartSpec } from './chart-model';
import { buildRows } from './dynamic-chart';
import { EvolutionChart } from './evolution-chart';
import {
	describeFilters,
	toggleDimensionValue,
	toggleMonthFilter,
} from '@/helpers/works/filter-model';
import { KpiCards } from './kpi-cards';
import { Rankings } from './rankings';
import { WorksTable } from './works-table';

/**
 * Data the PDF export needs, built on demand by the tab (getSnapshot).
 * Elements can be captured with document.getElementById(id) using the ids below.
 */
export type MetricsSnapshot = {
	generatedAt: string;
	/** Lines like 'Localidad: Palermo, Recoleta'. Empty when no filter is active. */
	filtersDescription: string[];
	totalWorks: number;
	filteredWorks: WorkWithProgress[];
	kpis: Kpis;
	charts: { spec: ChartSpec; title: string; elementId: string }[];
	/** Rows behind each chart (group, value, count, color), keyed by spec id. */
	chartRows: Record<string, ExportRow[]>;
	fixedElementIds: { kpis: string; evolution: string; rankings: string; table: string };
};

interface MetricsTabProps {
	/** Chart configuration; owned by the parent so it survives tab switches. */
	spec: ChartSpec;
	onSpecChange: (next: ChartSpec) => void;
	/** Every work, unfiltered. */
	allWorks: WorkWithProgress[];
	/** Works after applying the shared filters. */
	works: WorkWithProgress[];
	loading: boolean;
	filters: WorksFilters;
	options: FilterOptions;
	onFiltersChange: (next: WorksFilters) => void;
}

const EXPORT_HINT_ID = 'works-metrics-export-hint';

export function MetricsTab({
	spec,
	onSpecChange,
	allWorks,
	works,
	loading,
	filters,
	options,
	onFiltersChange,
}: MetricsTabProps) {
	const kpis = useMemo(() => computeKpis(works), [works]);

	const getSnapshot = useCallback(
		(): MetricsSnapshot => ({
			generatedAt: new Date().toISOString(),
			filtersDescription: describeFilters(filters, options),
			totalWorks: allWorks.length,
			filteredWorks: works,
			kpis,
			charts: [{ spec, title: chartTitle(spec), elementId: EXPORT_IDS.chart(spec.id) }],
			chartRows: { [spec.id]: buildRows(spec, allWorks, filters) },
			fixedElementIds: {
				kpis: EXPORT_IDS.kpis,
				evolution: EXPORT_IDS.evolution,
				rankings: EXPORT_IDS.rankings,
				table: EXPORT_IDS.table,
			},
		}),
		[filters, options, allWorks, works, kpis, spec]
	);

	const [exporting, setExporting] = useState(false);

	const exportPdf = async () => {
		if (exporting || works.length === 0) return;
		setExporting(true);
		try {
			// Lazy: keeps jsPDF out of the initial bundle (and out of unit tests of this tab).
			const { generateMetricsPDF } = await import('@/helpers/works/generate-metrics-pdf');
			const { skipped } = await generateMetricsPDF(getSnapshot());
			if (skipped.length > 0)
				toast({
					variant: 'destructive',
					title: 'PDF generado con gráficos omitidos',
					description: `No se pudo incluir: ${skipped.join(', ')}.`,
				});
			else toast({ title: 'PDF generado' });
		} catch {
			toast({ variant: 'destructive', title: 'No se pudo generar el PDF' });
		} finally {
			setExporting(false);
		}
	};

	const exportCsv = () => {
		if (works.length === 0) return;
		const t = worksTable(works, true);
		downloadCsv(buildCsv(t.headers, t.rows), exportFilename('obras', 'csv'));
	};

	// Clicking a bar/slice/point toggles that value as a shared filter.
	const handleSelect = useCallback(
		(spec: ChartSpec, key: string) => {
			if (key === OTHERS_KEY) return;
			const target = filterTargetOf(spec.groupBy);
			onFiltersChange(
				target.kind === 'dimension'
					? toggleDimensionValue(filters, target.dim, key)
					: toggleMonthFilter(filters, target.field, key)
			);
		},
		[filters, onFiltersChange]
	);

	if (loading) {
		return (
			<div className="space-y-4" aria-busy="true" aria-label="Cargando métricas">
				<KpiCards kpis={kpis} loading />
				<Skeleton className="h-[360px] w-full" />
				<Skeleton className="h-[360px] w-full" />
			</div>
		);
	}

	if (allWorks.length === 0) {
		return (
			<p className="py-12 text-center text-muted-foreground">
				Todavía no hay obras. Cuando cargues la primera vas a ver acá sus métricas.
			</p>
		);
	}

	const noMatches = works.length === 0;

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap justify-end gap-2">
				{noMatches && (
					<span id={EXPORT_HINT_ID} className="sr-only">
						No hay obras para exportar con estos filtros.
					</span>
				)}
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={exportCsv}
					disabled={noMatches}
					aria-describedby={noMatches ? EXPORT_HINT_ID : undefined}
				>
					<Download className="mr-1 h-4 w-4" aria-hidden />
					Exportar CSV
				</Button>
				<Button
					type="button"
					size="sm"
					onClick={exportPdf}
					disabled={noMatches || exporting}
					aria-describedby={noMatches ? EXPORT_HINT_ID : undefined}
					aria-busy={exporting}
				>
					{exporting ? (
						<Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden />
					) : (
						<FileText className="mr-1 h-4 w-4" aria-hidden />
					)}
					{exporting ? 'Generando PDF...' : 'Exportar PDF'}
				</Button>
			</div>

			<KpiCards kpis={kpis} />

			{noMatches && (
				<div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-8 text-center">
					<p className="text-sm text-muted-foreground">
						Ninguna obra coincide con los filtros. Los gráficos aparecen sin datos.
					</p>
					<Button variant="outline" size="sm" onClick={() => onFiltersChange(defaultFilters)}>
						Limpiar filtros
					</Button>
				</div>
			)}

			<ChartBuilder
				spec={spec}
				onSpecChange={onSpecChange}
				allWorks={allWorks}
				filters={filters}
				onSelect={handleSelect}
			/>

			<EvolutionChart works={works} />
			<Rankings works={works} />
			<WorksTable works={works} />
		</div>
	);
}
