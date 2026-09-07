'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EventListItem } from '@/components/business/calendar/event-list-item';
import { Event } from '@/lib/calendar/events';
import { EventType } from '@/lib/calendar/event-types';
import { Work } from '@/lib/works/works';

type UpcomingEventsProps = {
	events: Event[];
	totalCount: number;
	maxVisibleEvents: number;
	showAllEvents: boolean;
	onToggleShowAll: () => void;
	selectedDate: string | null;
	onClearDate: () => void;
	searchTerm: string;
	onSearchChange: (value: string) => void;
	onEventClick: (event: Event) => void;
	onDeleteEvent: (eventId: number, e: React.MouseEvent) => void;
	isAuthorized: boolean;
	eventTypes: EventType[];
	workDataMap: Record<number, Work>;
};

export function UpcomingEvents({
	events,
	totalCount,
	maxVisibleEvents,
	showAllEvents,
	onToggleShowAll,
	selectedDate,
	onClearDate,
	searchTerm,
	onSearchChange,
	onEventClick,
	onDeleteEvent,
	isAuthorized,
	eventTypes,
	workDataMap,
}: UpcomingEventsProps) {
	return (
		<Card className="p-6 bg-card border-border">
			<div className="flex justify-between items-center">
				<h3 className="text-sm font-semibold text-foreground">Próximos eventos</h3>
				{selectedDate && (
					<Button
						variant="ghost"
						size="sm"
						onClick={onClearDate}
						className="text-sm text-muted-foreground"
					>
						Mostrar todos los eventos
					</Button>
				)}
			</div>

			<Card className="p-2 bg-card border-border">
				<div className="flex items-center gap-2">
					<input
						type="text"
						placeholder="Buscar eventos por cliente, ubicación, tipo, etc..."
						value={searchTerm}
						onChange={(e) => onSearchChange(e.target.value)}
						className="flex-1 px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
					/>
				</div>
			</Card>
			<div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
				{events.length > 0 ? (
					<>
						{events.map((event) => (
							<EventListItem
								key={event.id}
								event={event}
								eventTypes={eventTypes}
								workDataMap={workDataMap}
								isAuthorized={isAuthorized}
								onClick={() => onEventClick(event)}
								onDelete={onDeleteEvent}
							/>
						))}
						{totalCount > maxVisibleEvents && (
							<Button variant="outline" size="sm" className="w-full mt-2" onClick={onToggleShowAll}>
								{showAllEvents ? 'Mostrar menos' : `Mostrar más (${totalCount - maxVisibleEvents})`}
							</Button>
						)}
					</>
				) : (
					<p className="text-sm text-muted-foreground">
						{selectedDate
							? 'No hay eventos programados para esta fecha'
							: 'No hay eventos próximos'}
					</p>
				)}
			</div>
		</Card>
	);
}
