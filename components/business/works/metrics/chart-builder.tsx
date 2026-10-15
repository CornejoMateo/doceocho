'use client';

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import type { GroupBy, GroupMetric, WorksFilters } from '@/lib/works/metrics';
import type { WorkWithProgress } from '@/lib/works/works';
import {
	EXPORT_IDS,
	GROUP_BY_LABELS,
	METRIC_LABELS,
	TOP_N_OPTIONS,
	TYPE_LABELS,
	chartTitle,
	normalizeSpec,
	topNDisabledReason,
	typeDisabledReason,
	type ChartSpec,
	type ChartType,
} from './chart-model';
import { chartLegend, chartNote } from '@/helpers/works/metrics-chart-capture';
import { chartTable } from '@/helpers/works/metrics-export';
import { DynamicChart, buildRows } from './dynamic-chart';
import { ChartExportMenu } from './export-menu';

interface ChartBuilderProps {
	spec: ChartSpec;
	onSpecChange: (next: ChartSpec) => void;
	allWorks: WorkWithProgress[];
	filters: WorksFilters;
	onSelect: (spec: ChartSpec, key: string) => void;
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
	return (
		<div className="space-y-1.5">
			<label htmlFor={id} className="text-xs font-medium text-muted-foreground">
				{label}
			</label>
			{children}
		</div>
	);
}

function ChartPanel({
	spec,
	onChange,
	allWorks,
	filters,
	onSelect,
}: {
	spec: ChartSpec;
	onChange: (next: ChartSpec) => void;
	allWorks: WorkWithProgress[];
	filters: WorksFilters;
	onSelect: (spec: ChartSpec, key: string) => void;
}) {
	const p = `chart-${spec.id}`;
	const rows = useMemo(() => buildRows(spec, allWorks, filters), [spec, allWorks, filters]);
	const update = (partial: Partial<ChartSpec>) => onChange(normalizeSpec({ ...spec, ...partial }));

	const typeReasons = (Object.keys(TYPE_LABELS) as ChartType[])
		.map((t) => ({ type: t, reason: typeDisabledReason(spec.groupBy, spec.metric, t) }))
		.filter((x) => x.reason);
	const topReason = topNDisabledReason(spec.groupBy, spec.type, spec.topN);
	// Distinct explanations, so the same sentence is not repeated per type.
	const notes = [
		...new Set([...typeReasons.map((x) => x.reason as string), topReason].filter(Boolean)),
	] as string[];

	return (
		<Card id={EXPORT_IDS.chart(spec.id)} className="space-y-4 border-border bg-card p-4 sm:p-6">
			<div className="flex items-start justify-between gap-3">
				<div>
					<h4 className="text-base font-semibold text-foreground">{chartTitle(spec)}</h4>
				</div>
				<div className="flex shrink-0 items-center gap-1">
					<ChartExportMenu
						title={chartTitle(spec)}
						filenameBase={`grafico-${spec.id}`}
						getContainer={() => document.getElementById(EXPORT_IDS.chart(spec.id))}
						legend={chartLegend(spec, rows)}
						note={chartNote(spec, rows)}
						table={chartTable(GROUP_BY_LABELS[spec.groupBy], spec.metric, rows)}
					/>
				</div>
			</div>

			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-export-ignore>
				<Field id={`${p}-group`} label="Agrupar por">
					<Select value={spec.groupBy} onValueChange={(v) => update({ groupBy: v as GroupBy })}>
						<SelectTrigger id={`${p}-group`} className="w-full">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{(Object.keys(GROUP_BY_LABELS) as GroupBy[]).map((g) => (
								<SelectItem key={g} value={g}>
									{GROUP_BY_LABELS[g]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</Field>

				<Field id={`${p}-metric`} label="Métrica">
					<Select value={spec.metric} onValueChange={(v) => update({ metric: v as GroupMetric })}>
						<SelectTrigger id={`${p}-metric`} className="w-full">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{(Object.keys(METRIC_LABELS) as GroupMetric[]).map((m) => (
								<SelectItem key={m} value={m}>
									{METRIC_LABELS[m]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</Field>

				<Field id={`${p}-type`} label="Tipo de gráfico">
					<Select value={spec.type} onValueChange={(v) => update({ type: v as ChartType })}>
						<SelectTrigger id={`${p}-type`} className="w-full">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{(Object.keys(TYPE_LABELS) as ChartType[]).map((t) => (
								<SelectItem
									key={t}
									value={t}
									disabled={!!typeDisabledReason(spec.groupBy, spec.metric, t)}
								>
									{TYPE_LABELS[t]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</Field>

				<Field id={`${p}-top`} label="Mostrar">
					<Select
						value={String(spec.topN)}
						onValueChange={(v) => update({ topN: Number(v) })}
						disabled={topNDisabledReason(spec.groupBy, 'bar', 5) !== null}
					>
						<SelectTrigger id={`${p}-top`} className="w-full">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{TOP_N_OPTIONS.map((n) => (
								<SelectItem
									key={n}
									value={String(n)}
									disabled={!!topNDisabledReason(spec.groupBy, spec.type, n)}
								>
									{n === 0 ? 'Todos' : `Top ${n} y Otros`}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</Field>
			</div>

			{notes.length > 0 && (
				<ul className="space-y-0.5 text-xs text-muted-foreground" data-export-ignore>
					{notes.map((n) => (
						<li key={n}>Opciones deshabilitadas: {n}</li>
					))}
				</ul>
			)}

			<DynamicChart spec={spec} rows={rows} onSelect={onSelect} />
		</Card>
	);
}

export function ChartBuilder({
	spec,
	onSpecChange,
	allWorks,
	filters,
	onSelect,
}: ChartBuilderProps) {
	return (
		<section className="space-y-4" aria-labelledby="works-builder-title">
			<div>
				<h3 id="works-builder-title" className="text-lg font-semibold text-foreground">
					Gráfico a medida
				</h3>
				<p className="text-sm text-muted-foreground">Elegí cómo agrupar y qué medir.</p>
			</div>

			<ChartPanel
				spec={spec}
				onChange={onSpecChange}
				allWorks={allWorks}
				filters={filters}
				onSelect={onSelect}
			/>
		</section>
	);
}
