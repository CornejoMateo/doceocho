'use client';

import { Card } from '@/components/ui/card';
import { useLoadEvents } from '@/hooks/calendar/use-load-events';
import { useEffect, useMemo, useState } from 'react';
import { Work } from '@/lib/works/works';
import { getSupabaseClient } from '@/lib/supabase-client';
import { formatCreatedAt } from '@/utils/format-date';

export function OverdueEvents() {
	const { events, isLoading } = useLoadEvents();
	const overdueEvents = useMemo(
		() => events.filter((event) => event.is_overdue === true),
		[events]
	);

	const [workDataMap, setWorkDataMap] = useState<Record<number, Work>>({});
	const [displayedCount, setDisplayedCount] = useState(5);

	useEffect(() => {
		const workIds = [...new Set(overdueEvents.filter((e) => e.work_id).map((e) => e.work_id!))];
		if (workIds.length === 0) {
			setWorkDataMap({});
			return;
		}
		const supabase = getSupabaseClient();
		supabase
			.from('works')
			.select('*')
			.in('id', workIds)
			.then(({ data, error }) => {
				if (error) {
					console.error('Error fetching work data:', error);
					return;
				}
				if (data) {
					const map: Record<number, Work> = {};
					data.forEach((w: Work) => {
						map[w.id] = w;
					});
					setWorkDataMap(map);
				}
			});
	}, [overdueEvents]);

	const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
		const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;

		if (scrollTop + clientHeight >= scrollHeight - 20) {
			setDisplayedCount((prev) => Math.min(prev + 5, overdueEvents.length));
		}
	};

	const visibleEvents = overdueEvents.slice(0, displayedCount);

	return (
		<Card className="p-4 min-w-0">
			<div className="flex items-center justify-between mb-4">
				<h3 className="text-sm font-medium text-muted-foreground">Eventos vencidos</h3>
				<span className="text-xs rounded-full bg-red-500/10 text-red-600 px-2 py-0.5">
					{overdueEvents.length}
				</span>
			</div>

			<div className="space-y-3 max-h-[500px] overflow-y-auto" onScroll={handleScroll}>
				{isLoading ? (
					<p className="text-sm text-muted-foreground">Cargando eventos...</p>
				) : overdueEvents.length > 0 ? (
					visibleEvents.map((event) => {
						const work = event.work_id ? workDataMap[event.work_id] : null;
						const locationParts = [work?.locality, work?.address, work?.zone, work?.hood].filter(
							Boolean
						);
						const locationDisplay =
							locationParts.length > 0 ? locationParts.join(' · ') : event.work_location || '';

						return (
							<div
								key={event.id}
								className="group flex gap-4 rounded-xl border border-red-500/20 bg-red-500/5 p-4 transition hover:bg-red-500/10"
							>
								<p>-</p>

								<div className="flex-1 space-y-1 min-w-0">
									<div className="flex items-center justify-between gap-2">
										<p className="text-sm font-medium truncate">{event.title}</p>
										<span className="text-xs rounded-md bg-background px-2 py-0.5 text-muted-foreground border">
											{event.type}
										</span>
									</div>

									{event.client_name && (
										<p className="text-sm text-muted-foreground truncate">{event.client_name}</p>
									)}

									{locationDisplay && (
										<p className="text-xs text-muted-foreground truncate">{locationDisplay}</p>
									)}

									<p className="text-xs text-red-600 pt-1">
										Venció el {formatCreatedAt(event.date)}
									</p>
								</div>
							</div>
						);
					})
				) : (
					<p className="text-sm text-muted-foreground text-center">No hay eventos vencidos</p>
				)}
			</div>
		</Card>
	);
}
