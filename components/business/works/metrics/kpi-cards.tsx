'use client';

import {
	AlertCircle,
	AlertTriangle,
	CheckCircle2,
	Clock,
	FileX,
	Gauge,
	List,
	PauseCircle,
	Timer,
	Hourglass,
} from 'lucide-react';
import { MetricCard } from '@/components/business/reports/budgets/metric-card';
import type { Kpis } from '@/lib/works/metrics';
import { EXPORT_IDS, formatDays, formatNumber } from './chart-model';

interface KpiCardsProps {
	kpis: Kpis;
	loading?: boolean;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function KpiCards({ kpis, loading = false }: KpiCardsProps) {
	const { duration } = kpis;
	const durationLegend =
		duration.count === 0
			? 'Sin obras con duración calculable'
			: `${duration.count} de ${plural(kpis.total, 'obra', 'obras')} con dato`;

	return (
		<div id={EXPORT_IDS.kpis} className="space-y-3">
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				<MetricCard
					label="Total de obras"
					value={kpis.total}
					icon={List}
					loading={loading}
					status="Según filtros activos"
				/>
				<MetricCard
					label="Finalizadas"
					value={kpis.completed}
					icon={CheckCircle2}
					loading={loading}
					status={pct(kpis.completed, kpis.total)}
				/>
				<MetricCard
					label="En progreso"
					value={kpis.inProgress}
					icon={AlertCircle}
					loading={loading}
					status={pct(kpis.inProgress, kpis.total)}
				/>
				<MetricCard
					label="Pendientes"
					value={kpis.pending}
					icon={Clock}
					loading={loading}
					status={pct(kpis.pending, kpis.total)}
				/>
				<MetricCard
					label="En pausa"
					value={kpis.paused}
					icon={PauseCircle}
					loading={loading}
					status={pct(kpis.paused, kpis.total)}
				/>
				<MetricCard
					label="Avance promedio"
					value={`${formatNumber(kpis.avgProgress)}%`}
					icon={Gauge}
					loading={loading}
					status="Promedio de todas las obras"
				/>
				<MetricCard
					label="Sin presupuesto"
					value={kpis.withoutBudget}
					icon={FileX}
					loading={loading}
					status={pct(kpis.withoutBudget, kpis.total)}
				/>
				<MetricCard
					label="Duración promedio"
					value={formatDays(duration.avg)}
					icon={Timer}
					loading={loading}
					status={durationLegend}
				/>
				<MetricCard
					label="Duración mediana"
					value={formatDays(duration.median)}
					icon={Hourglass}
					loading={loading}
					status={durationLegend}
				/>
			</div>

			{!loading && (kpis.completedWithoutDate > 0 || kpis.negativeDurationCount > 0) && (
				<div
					role="note"
					className="flex gap-3 rounded-lg border border-chart-3/40 bg-chart-3/10 p-3 text-sm text-foreground"
				>
					<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-chart-3" aria-hidden />
					<ul className="space-y-1">
						{kpis.completedWithoutDate > 0 && (
							<li>
								{plural(kpis.completedWithoutDate, 'obra finalizada', 'obras finalizadas')} sin
								fecha de finalización: no entra en la duración. Cargá la fecha desde la obra para
								incluirla.
							</li>
						)}
						{kpis.negativeDurationCount > 0 && (
							<li>
								{plural(kpis.negativeDurationCount, 'obra tiene', 'obras tienen')} fecha de
								finalización anterior a la de creación: se excluye de la duración.
							</li>
						)}
					</ul>
				</div>
			)}
		</div>
	);
}

function pct(part: number, total: number): string {
	if (!total) return 'Sin obras';
	return `${formatNumber((part / total) * 100)}% del total`;
}
