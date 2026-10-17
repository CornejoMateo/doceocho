'use client';

import { useMemo } from 'react';
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Line,
	LineChart,
	Pie,
	PieChart,
	XAxis,
	YAxis,
} from 'recharts';
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import {
	applyWorkFilters,
	groupWorks,
	NO_DATA_KEY,
	OTHERS_KEY,
	type WorksFilters,
} from '@/lib/works/metrics';
import type { WorkWithProgress } from '@/lib/works/works';
import {
	EXPORT_IDS,
	OTHERS_COLOR,
	PALETTE,
	chartTitle,
	drawnRows,
	filterTargetOf,
	truncationNote,
	formatMetricValue,
	formatMonth,
	isMonthGroup,
	withoutOwnFilter,
	type ChartSpec,
} from './chart-model';
import { DIMENSION_FIELD, isMonthSelected } from '@/helpers/works/filter-model';

type Row = {
	key: string;
	label: string;
	value: number;
	count: number;
	selected: boolean;
	fill: string;
};

interface DynamicChartProps {
	spec: ChartSpec;
	/** Rows already computed by the parent with buildRows(spec, allWorks, filters). */
	rows: Row[];
	/** Called with the clicked group key; not called for "Otros". */
	onSelect: (spec: ChartSpec, key: string) => void;
}

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export function buildRows(
	spec: ChartSpec,
	allWorks: WorkWithProgress[],
	filters: WorksFilters
): Row[] {
	const base = applyWorkFilters(allWorks, withoutOwnFilter(filters, spec.groupBy));
	const months = isMonthGroup(spec.groupBy);
	const groups = groupWorks(base, {
		groupBy: spec.groupBy,
		metric: spec.metric,
		topN: months || spec.topN === 0 ? undefined : spec.topN,
	});
	const target = filterTargetOf(spec.groupBy);
	const selectedOf = (key: string) =>
		target.kind === 'dimension'
			? filters[DIMENSION_FIELD[target.dim]].includes(key)
			: isMonthSelected(filters[target.field], key);
	const anySelected =
		target.kind === 'dimension'
			? filters[DIMENSION_FIELD[target.dim]].length > 0
			: !!(filters[target.field].from || filters[target.field].to);

	const single =
		spec.type === 'bar' ||
		spec.type === 'barHorizontal' ||
		spec.type === 'line' ||
		spec.type === 'area';
	return groups.map((g, i) => {
		const color =
			g.key === OTHERS_KEY ? OTHERS_COLOR : single ? PALETTE[0] : PALETTE[i % PALETTE.length];
		const selected = selectedOf(g.key);
		return {
			key: g.key,
			label: months ? formatMonth(g.key) : g.label,
			value: g.value,
			count: g.count,
			selected,
			fill: anySelected && !selected ? `color-mix(in oklab, ${color} 30%, transparent)` : color,
		};
	});
}

function Tip({
	active,
	payload,
	spec,
	total,
}: {
	active?: boolean;
	payload?: ReadonlyArray<{ payload?: Row }>;
	spec: ChartSpec;
	total: number;
}) {
	const row = payload?.[0]?.payload;
	if (!active || !row) return null;
	const noun = spec.metric === 'avgDuration' ? 'con duración' : '';
	const share =
		spec.metric === 'count' && total > 0
			? ` (${formatMetricValue('avgProgress', (row.value / total) * 100)})`
			: '';
	return (
		<div className="rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-xl">
			<p className="font-medium text-foreground">{row.label}</p>
			<p className="tabular-nums text-muted-foreground">
				{formatMetricValue(spec.metric, row.value)}
				{share}
			</p>
			{spec.metric !== 'count' && (
				<p className="text-muted-foreground">
					{row.count} {row.count === 1 ? 'obra' : 'obras'} {noun}
				</p>
			)}
		</div>
	);
}

export function DynamicChart({ spec, rows: allRows, onSelect }: DynamicChartProps) {
	const rows = useMemo(() => drawnRows(spec, allRows), [spec, allRows]);
	const note = truncationNote(spec, allRows.length);
	const total = useMemo(() => allRows.reduce((a, r) => a + r.value, 0), [allRows]);
	const title = chartTitle(spec);
	const clickable = (r: Row) => r.key !== OTHERS_KEY;
	const select = (r?: Row) => r && clickable(r) && onSelect(spec, r.key);

	const config: ChartConfig = { value: { label: title, color: PALETTE[0] } };
	const isPie = spec.type === 'pie' || spec.type === 'donut';
	const isHorizontal = spec.type === 'barHorizontal';
	const domain: [number, number | 'auto'] = spec.metric === 'avgProgress' ? [0, 100] : [0, 'auto'];

	if (rows.length === 0) {
		return (
			<div className="flex h-[260px] items-center justify-center rounded-lg bg-secondary/20 px-4 text-center text-sm text-muted-foreground">
				{spec.metric === 'avgDuration'
					? 'Ninguna obra tiene duración calculable con estos filtros. Hace falta fecha de creación y de finalización.'
					: 'No hay obras con estos filtros para armar el gráfico.'}
			</div>
		);
	}

	const onChartClick = (state: { activeTooltipIndex?: number | string | null } | undefined) => {
		const raw = state?.activeTooltipIndex;
		if (raw == null) return;
		const idx = Number(raw);
		if (Number.isInteger(idx)) select(rows[idx]);
	};
	const tooltip = (
		<ChartTooltip
			cursor={{ fillOpacity: 0.15 }}
			content={(p) => <Tip {...(p as object)} spec={spec} total={total} />}
		/>
	);
	const tick = { fontSize: 11 };
	const many = rows.length > 8;
	const height = isHorizontal ? Math.max(240, rows.length * 34 + 40) : 300;

	let chart: React.ReactElement;
	if (isPie) {
		chart = (
			<PieChart>
				{tooltip}
				<Pie
					data={rows}
					dataKey="value"
					nameKey="label"
					innerRadius={spec.type === 'donut' ? '55%' : 0}
					outerRadius="85%"
					stroke="var(--card)"
					strokeWidth={2}
					isAnimationActive={false}
					onClick={(_, i) => select(rows[i])}
				/>
			</PieChart>
		);
	} else if (spec.type === 'line') {
		chart = (
			<LineChart data={rows} margin={{ left: 0, right: 12, top: 8 }} onClick={onChartClick}>
				<CartesianGrid vertical={false} />
				<XAxis
					dataKey="label"
					tickLine={false}
					axisLine={false}
					tick={tick}
					interval="preserveStartEnd"
					minTickGap={16}
				/>
				<YAxis
					tickLine={false}
					axisLine={false}
					tick={tick}
					width={40}
					domain={domain}
					allowDecimals={false}
				/>
				{tooltip}
				<Line
					dataKey="value"
					type="monotone"
					stroke="var(--color-value)"
					strokeWidth={2}
					dot={{ r: 3 }}
					isAnimationActive={false}
				/>
			</LineChart>
		);
	} else if (spec.type === 'area') {
		chart = (
			<AreaChart data={rows} margin={{ left: 0, right: 12, top: 8 }} onClick={onChartClick}>
				<CartesianGrid vertical={false} />
				<XAxis
					dataKey="label"
					tickLine={false}
					axisLine={false}
					tick={tick}
					interval="preserveStartEnd"
					minTickGap={16}
				/>
				<YAxis
					tickLine={false}
					axisLine={false}
					tick={tick}
					width={40}
					domain={domain}
					allowDecimals={false}
				/>
				{tooltip}
				<Area
					dataKey="value"
					type="monotone"
					stroke="var(--color-value)"
					fill="var(--color-value)"
					fillOpacity={0.25}
					strokeWidth={2}
					isAnimationActive={false}
				/>
			</AreaChart>
		);
	} else if (isHorizontal) {
		chart = (
			<BarChart data={rows} layout="vertical" margin={{ left: 0, right: 16 }}>
				<CartesianGrid horizontal={false} />
				<XAxis
					type="number"
					tickLine={false}
					axisLine={false}
					tick={tick}
					domain={domain}
					allowDecimals={false}
				/>
				<YAxis
					type="category"
					dataKey="label"
					tickLine={false}
					axisLine={false}
					tick={tick}
					width={110}
					interval={0}
					tickFormatter={(v: string) => truncate(v, 16)}
				/>
				{tooltip}
				<Bar
					dataKey="value"
					radius={4}
					isAnimationActive={false}
					onClick={(_, i) => select(rows[i])}
				/>
			</BarChart>
		);
	} else {
		chart = (
			<BarChart data={rows} margin={{ left: 0, right: 8, top: 8, bottom: many ? 24 : 0 }}>
				<CartesianGrid vertical={false} />
				<XAxis
					dataKey="label"
					tickLine={false}
					axisLine={false}
					tick={tick}
					interval={many && isMonthGroup(spec.groupBy) ? 'preserveStartEnd' : 0}
					angle={many ? -35 : 0}
					textAnchor={many ? 'end' : 'middle'}
					height={many ? 64 : 30}
					tickFormatter={(v: string) => truncate(v, 14)}
				/>
				<YAxis
					tickLine={false}
					axisLine={false}
					tick={tick}
					width={40}
					domain={domain}
					allowDecimals={false}
				/>
				{tooltip}
				<Bar
					dataKey="value"
					radius={[4, 4, 0, 0]}
					isAnimationActive={false}
					onClick={(_, i) => select(rows[i])}
				/>
			</BarChart>
		);
	}

	const isFilterable = allRows.some(clickable);

	return (
		<div className="space-y-3">
			<ChartContainer
				id={EXPORT_IDS.chart(spec.id)}
				config={config}
				role="img"
				aria-label={`${title}. ${rows.length} grupos.`}
				className={cn('aspect-auto w-full', isFilterable && '[&_.recharts-wrapper]:cursor-pointer')}
				style={{ height }}
			>
				{chart}
			</ChartContainer>

			{note && <p className="text-xs italic text-muted-foreground">{note}</p>}

			{isFilterable && (
				<div className="space-y-1.5">
					<p className="text-xs text-muted-foreground">
						Tocá un valor del gráfico o de esta lista para filtrar las obras.
					</p>
					<ul className="flex flex-wrap gap-1.5">
						{allRows.map((r) => (
							<li key={r.key}>
								<button
									type="button"
									disabled={!clickable(r)}
									aria-pressed={r.selected}
									onClick={() => select(r)}
									className={cn(
										'inline-flex max-w-[14rem] items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors',
										'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
										r.selected
											? 'border-primary bg-primary text-primary-foreground'
											: 'border-border bg-card text-foreground hover:bg-secondary/40 disabled:cursor-default disabled:hover:bg-card'
									)}
								>
									{isPie && (
										<span
											aria-hidden
											className="h-2 w-2 shrink-0 rounded-full"
											style={{
												background:
													r.key === OTHERS_KEY
														? OTHERS_COLOR
														: PALETTE[allRows.indexOf(r) % PALETTE.length],
											}}
										/>
									)}
									<span className={cn('truncate', r.key === NO_DATA_KEY && 'italic')}>
										{r.label}
									</span>
									<span className="tabular-nums opacity-70">
										{formatMetricValue(spec.metric, r.value)}
									</span>
								</button>
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}
