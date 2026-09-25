'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { PaginationControls } from '@/components/ui/pagination-controls';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { NO_DATA_LABEL, STATUS_LABELS, getWorkDuration } from '@/lib/works/metrics';
import type { WorkWithProgress } from '@/lib/works/works';
import { formatDateOnly } from '@/utils/format-date';
import { EXPORT_IDS, formatDays } from './chart-model';
import {
	workClient,
	workCompleted,
	workCreated,
	workDurationDays,
	workTitle,
} from './work-display';
import type { SortKey } from '@/constants/works/works-constants';
import { COLUMNS } from '@/constants/works/works-constants';

const PAGE_SIZE = 10;

const text = (v: string | null | undefined) => v?.trim() || null;

function sortValue(w: WorkWithProgress, key: SortKey): string | number | null {
	switch (key) {
		case 'name':
			return workTitle(w);
		case 'client':
			return text(workClient(w));
		case 'locality':
			return text(w.locality);
		case 'hood':
			return text(w.hood);
		case 'zone':
			return text(w.zone);
		case 'architect':
			return text(w.architect);
		case 'status':
			return w.status ? (STATUS_LABELS[w.status] ?? w.status) : null;
		case 'progress':
			return w.progress ?? 0;
		case 'created':
			return workCreated(w);
		case 'completed':
			return workCompleted(w);
		case 'duration':
			return workDurationDays(w);
	}
}

const STATUS_DOT: Record<string, string> = {
	pending: 'bg-chart-3',
	in_progress: 'bg-chart-1',
	completed: 'bg-accent',
	paused: 'bg-orange-500',
};

function NoData() {
	return <span className="italic text-muted-foreground">{NO_DATA_LABEL}</span>;
}

function Cellv({ value }: { value: string | null | undefined }) {
	return value?.trim() ? <>{value}</> : <NoData />;
}

function DurationCell({ w }: { w: WorkWithProgress }) {
	const d = getWorkDuration(w);
	if (d.state === 'valid') return <>{formatDays(d.days)}</>;
	if (d.state === 'negative')
		return (
			<span className="text-destructive" title="La finalización es anterior a la creación">
				Fechas inválidas
			</span>
		);
	if (d.state === 'no-completion') return <span className="text-muted-foreground">En curso</span>;
	return <NoData />;
}

export function WorksTable({ works }: { works: WorkWithProgress[] }) {
	const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({
		key: 'created',
		dir: 'desc',
	});
	const [page, setPage] = useState(1);

	useEffect(() => setPage(1), [works]);

	const sorted = useMemo(() => {
		const dir = sort.dir === 'asc' ? 1 : -1;
		return [...works].sort((a, b) => {
			const va = sortValue(a, sort.key);
			const vb = sortValue(b, sort.key);
			if (va === null && vb === null) return a.id - b.id;
			if (va === null) return 1; // "Sin dato" always last
			if (vb === null) return -1;
			const cmp =
				typeof va === 'number' && typeof vb === 'number'
					? va - vb
					: String(va).localeCompare(String(vb), 'es', { numeric: true });
			return cmp * dir || a.id - b.id;
		});
	}, [works, sort]);

	const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
	const safePage = Math.min(page, totalPages);
	const pageRows = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

	const toggleSort = (key: SortKey) =>
		setSort((s) =>
			s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }
		);

	return (
		<Card id={EXPORT_IDS.table} className="space-y-4 border-border bg-card p-4 sm:p-6">
			<div>
				<h3 className="text-base font-semibold text-foreground">Detalle de obras</h3>
				<p className="text-xs text-muted-foreground">
					{works.length} {works.length === 1 ? 'obra' : 'obras'} según los filtros activos.
				</p>
			</div>

			{works.length === 0 ? (
				<p className="rounded-lg bg-secondary/20 p-6 text-center text-sm text-muted-foreground">
					Ninguna obra coincide con los filtros.
				</p>
			) : (
				<>
					<Table>
						<TableHeader>
							<TableRow>
								{COLUMNS.map((c) => {
									const active = sort.key === c.key;
									const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
									return (
										<TableHead
											key={c.key}
											aria-sort={
												active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'
											}
											className={'text-center'}
										>
											<button
												type="button"
												onClick={() => toggleSort(c.key)}
												className="inline-flex items-center gap-1 rounded-sm font-medium hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
											>
												{c.label}
												<Icon
													className={active ? 'h-3.5 w-3.5' : 'h-3.5 w-3.5 opacity-40'}
													aria-hidden
												/>
											</button>
										</TableHead>
									);
								})}
							</TableRow>
						</TableHeader>
						<TableBody>
							{pageRows.map((w) => (
								<TableRow key={w.id}>
									<TableCell className="max-w-[14rem] truncate font-medium text-center">
										{workTitle(w)}
									</TableCell>
									<TableCell className="text-center">
										<Cellv value={workClient(w)} />
									</TableCell>
									<TableCell className="text-center">
										<Cellv value={w.locality} />
									</TableCell>
									<TableCell className="text-center">
										<Cellv value={w.hood} />
									</TableCell>
									<TableCell className="text-center">
										<Cellv value={w.zone} />
									</TableCell>
									<TableCell className="text-center">
										<Cellv value={w.architect} />
									</TableCell>
									<TableCell className="text-center">
										{w.status ? (
											<Badge variant="outline" className="gap-1.5 font-normal">
												<span
													className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[w.status] ?? 'bg-muted-foreground'}`}
													aria-hidden
												/>
												{STATUS_LABELS[w.status] ?? w.status}
											</Badge>
										) : (
											<NoData />
										)}
									</TableCell>
									<TableCell className="text-center tabular-nums">{w.progress ?? 0}%</TableCell>
									<TableCell className="whitespace-nowrap tabular-nums text-center">
										{workCreated(w) ? formatDateOnly(workCreated(w)) : <NoData />}
									</TableCell>
									<TableCell className="whitespace-nowrap tabular-nums text-center">
										{workCompleted(w) ? formatDateOnly(workCompleted(w)) : <NoData />}
									</TableCell>
									<TableCell className="whitespace-nowrap text-center tabular-nums">
										<DurationCell w={w} />
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
					<PaginationControls
						currentPage={safePage}
						totalPages={totalPages}
						totalItems={sorted.length}
						itemsPerPage={PAGE_SIZE}
						onPageChange={setPage}
						itemLabel="obras"
					/>
				</>
			)}
		</Card>
	);
}
