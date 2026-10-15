'use client';

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card } from '@/components/ui/card';
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from '@/components/ui/chart';
import { ChartExportMenu } from './export-menu';
import { evolutionLegend } from '@/helpers/works/metrics-chart-capture';
import { evolutionTable } from '@/helpers/works/metrics-export';
import { monthlyEvolution } from '@/lib/works/metrics';
import type { WorkWithProgress } from '@/lib/works/works';
import { EXPORT_IDS, SERIES_COMPLETED, SERIES_CREATED, formatMonth } from './chart-model';

const config: ChartConfig = {
	created: { label: 'Creadas', color: SERIES_CREATED },
	completed: { label: 'Finalizadas', color: SERIES_COMPLETED },
};

export function EvolutionChart({ works }: { works: WorkWithProgress[] }) {
	const data = useMemo(() => monthlyEvolution(works), [works]);

	return (
		<Card id={EXPORT_IDS.evolution} className="space-y-4 border-border bg-card p-4 sm:p-6">
			<div className="flex items-start justify-between gap-3">
				<div>
					<h3 className="text-base font-semibold text-foreground">
						Evolución mensual: creadas y finalizadas
					</h3>
					<p className="text-xs text-muted-foreground">
						Las obras finalizadas se ubican en el mes de su fecha de finalización.
					</p>
				</div>
				<ChartExportMenu
					title="Evolución mensual: creadas y finalizadas"
					filenameBase="evolucion-mensual"
					getContainer={() => document.getElementById(EXPORT_IDS.evolution)}
					legend={evolutionLegend(SERIES_CREATED, SERIES_COMPLETED)}
					table={evolutionTable(data)}
				/>
			</div>
			{data.length === 0 ? (
				<p className="flex h-[240px] items-center justify-center rounded-lg bg-secondary/20 px-4 text-center text-sm text-muted-foreground">
					No hay fechas para graficar con estos filtros.
				</p>
			) : (
				<ChartContainer
					id="evolution"
					config={config}
					role="img"
					aria-label="Obras creadas y finalizadas por mes"
					className="aspect-auto h-[300px] w-full"
				>
					<BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
						<CartesianGrid vertical={false} />
						<XAxis
							dataKey="month"
							tickLine={false}
							axisLine={false}
							tickFormatter={formatMonth}
							interval="preserveStartEnd"
							minTickGap={20}
						/>
						<YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
						<ChartTooltip
							content={<ChartTooltipContent labelFormatter={(v) => formatMonth(String(v))} />}
						/>
						<Bar
							dataKey="created"
							fill="var(--color-created)"
							radius={[3, 3, 0, 0]}
							isAnimationActive={false}
						/>
						<Bar
							dataKey="completed"
							fill="var(--color-completed)"
							radius={[3, 3, 0, 0]}
							isAnimationActive={false}
						/>
					</BarChart>
				</ChartContainer>
			)}
			{data.length > 0 && (
				<ul className="flex justify-center gap-4 text-xs text-muted-foreground">
					{Object.entries(config).map(([key, c]) => (
						<li key={key} className="flex items-center gap-1.5">
							<span aria-hidden className="h-2 w-2 rounded-[2px]" style={{ background: c.color }} />
							{c.label}
						</li>
					))}
				</ul>
			)}
		</Card>
	);
}
