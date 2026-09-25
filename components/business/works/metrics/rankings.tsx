'use client';

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { rankWorks, type RankedWork } from '@/lib/works/metrics';
import type { WorkWithProgress } from '@/lib/works/works';
import { EXPORT_IDS, formatDays } from './chart-model';
import { workClient, workTitle } from '@/helpers/works/work-display';

const LIMIT = 5;

function RankList({ title, hint, items }: { title: string; hint: string; items: RankedWork[] }) {
	return (
		<div className="space-y-3">
			<div>
				<h4 className="text-sm font-semibold text-foreground">{title}</h4>
				<p className="text-xs text-muted-foreground">{hint}</p>
			</div>
			{items.length === 0 ? (
				<p className="rounded-lg bg-secondary/20 p-4 text-sm text-muted-foreground">
					Ninguna obra finalizada tiene fechas válidas para calcular la duración.
				</p>
			) : (
				<ol className="divide-y divide-border rounded-lg border border-border">
					{items.map(({ work, days }, i) => (
						<li key={work.id} className="flex items-center gap-3 px-3 py-2.5">
							<span className="w-5 text-sm font-semibold tabular-nums text-muted-foreground">
								{i + 1}
							</span>
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-medium text-foreground">{workTitle(work)}</p>
								<p className="truncate text-xs text-muted-foreground">
									{[workClient(work), work.locality].filter(Boolean).join(' · ') || 'Sin dato'}
								</p>
							</div>
							<span className="shrink-0 rounded-md bg-secondary px-2 py-1 text-sm font-semibold tabular-nums text-foreground">
								{formatDays(days)}
							</span>
						</li>
					))}
				</ol>
			)}
		</div>
	);
}

export function Rankings({ works }: { works: WorkWithProgress[] }) {
	const fastest = useMemo(() => rankWorks(works, { by: 'fastest', limit: LIMIT }), [works]);
	const slowest = useMemo(() => rankWorks(works, { by: 'slowest', limit: LIMIT }), [works]);

	return (
		<Card id={EXPORT_IDS.rankings} className="space-y-4 border-border bg-card p-4 sm:p-6">
			<h3 className="text-base font-semibold text-foreground">Duración de obras</h3>
			<div className="grid gap-6 md:grid-cols-2">
				<RankList title="Más rápidas" hint="De la creación a la finalización" items={fastest} />
				<RankList title="Más lentas" hint="De la creación a la finalización" items={slowest} />
			</div>
		</Card>
	);
}
