'use client';

import { Calendar, Home, MapPin, Package, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Event } from '@/lib/calendar/events';
import { EventType, resolveEventType } from '@/lib/calendar/event-types';
import { Work } from '@/lib/works/works';
import { formatCreatedAt, formatSimpleTime } from '@/utils/format-date';

type EventListItemProps = {
	event: Event;
	eventTypes: EventType[];
	workDataMap: Record<number, Work>;
	isAuthorized: boolean;
	onClick: () => void;
	onDelete: (eventId: number, e: React.MouseEvent) => void;
};

export function EventListItem({
	event,
	eventTypes,
	workDataMap,
	isAuthorized,
	onClick,
	onDelete,
}: EventListItemProps) {
	const typeInfo = resolveEventType(event.type, eventTypes);
	const isOverdue = event.is_overdue || false;

	return (
		<div
			className={`p-3 rounded-lg border space-y-2 cursor-pointer transition-colors ${
				isOverdue
					? 'border-red-500 bg-red-500/10 hover:bg-red-500/20'
					: 'border-border bg-secondary hover:bg-secondary/80'
			}`}
			onClick={onClick}
		>
			<div className="flex items-start justify-between gap-2">
				<div className="flex items-start gap-2 min-w-0">
					<div className="p-1.5 rounded bg-secondary/70 mt-0.5 flex-shrink-0">
						<div
							className="h-2 w-2 rounded-full"
							style={{ backgroundColor: isOverdue ? '#ef4444' : typeInfo.color }}
						/>
					</div>
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-2">
							<h4 className="text-sm font-medium text-foreground break-words">{event.title}</h4>
							{isOverdue && (
								<div className="flex items-center gap-1 flex-shrink-0">
									<div className="h-2 w-2 rounded-full bg-red-500" title="Evento atrasado" />
								</div>
							)}
						</div>
						{event.client_name && (
							<p className="text-xs text-muted-foreground break-words">{event.client_name}</p>
						)}
					</div>
				</div>
				{isAuthorized && (
					<div className="flex items-start flex-shrink-0">
						<Button
							variant="ghost"
							size="icon"
							onClick={(e) => onDelete(event.id, e)}
							className="h-6 w-6 -mr-2"
							aria-label="Eliminar evento"
						>
							<Trash2 className="h-3.5 w-3.5" />
						</Button>
					</div>
				)}
			</div>
			<div className="space-y-1 text-xs text-muted-foreground">
				<div className="flex items-center gap-1.5">
					<Calendar className="h-3.5 w-3.5 flex-shrink-0" />
					<span>
						{formatCreatedAt(event.date)}
						{event.time && <span className="ml-1">{formatSimpleTime(event.time)}</span>}
					</span>
				</div>
				{event.work_id && workDataMap[event.work_id] ? (
					<>
						<div className="flex items-center gap-1.5">
							<MapPin className="h-3.5 w-3.5 flex-shrink-0" />
							<span>
								{workDataMap[event.work_id].locality || 'Sin localidad'} -{' '}
								{workDataMap[event.work_id].address || 'Sin dirección'}
							</span>
						</div>
						{workDataMap[event.work_id].zone && (
							<div className="flex items-center gap-1.5">
								<MapPin className="h-3.5 w-3.5 flex-shrink-0" />
								<span>Zona: {workDataMap[event.work_id].zone}</span>
							</div>
						)}
						{workDataMap[event.work_id].hood && (
							<div className="flex items-center gap-1.5">
								<Home className="h-3.5 w-3.5 flex-shrink-0" />
								<span>Barrio: {workDataMap[event.work_id].hood}</span>
							</div>
						)}
					</>
				) : event.work_location ? (
					<div className="flex items-center gap-1.5">
						<MapPin className="h-3.5 w-3.5 flex-shrink-0" />
						<span>{event.work_location}</span>
					</div>
				) : null}
				{event.description && (
					<div className="flex items-center gap-1.5">
						<Package className="h-3.5 w-3.5 flex-shrink-0" />
						<span>{event.description}</span>
					</div>
				)}
			</div>
		</div>
	);
}
