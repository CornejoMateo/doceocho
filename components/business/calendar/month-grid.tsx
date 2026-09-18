'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CalendarDay } from '@/components/business/calendar/calendar-days';
import { monthNames, dayNames } from '@/constants/date';
import { Event } from '@/lib/calendar/events';
import { EventType } from '@/lib/calendar/event-types';
import { formatDateString } from '@/helpers/calendar/date';

type MonthGridProps = {
	currentDate: Date;
	selectedDate: string | null;
	eventTypes: EventType[];
	eventsByDate: Record<string, Event[]>;
	onDateSelect: (dateStr: string | null) => void;
	onPreviousMonth: () => void;
	onNextMonth: () => void;
};

export function MonthGrid({
	currentDate,
	selectedDate,
	eventTypes,
	eventsByDate,
	onDateSelect,
	onPreviousMonth,
	onNextMonth,
}: MonthGridProps) {
	const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
	const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

	const getEventsForDate = (day: number) => {
		const dateStr = formatDateString(currentDate.getFullYear(), currentDate.getMonth(), day);
		const dayEvents = eventsByDate[dateStr] ?? [];

		const eventsByType = dayEvents.reduce(
			(acc, event) => {
				if (event.type && !acc[event.type]) {
					acc[event.type] = [];
				}
				if (event.type) acc[event.type].push(event);
				return acc;
			},
			{} as Record<string, Event[]>
		);

		return eventsByType;
	};

	return (
		<>
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-semibold text-foreground">
					{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
				</h3>
				<div className="flex gap-2">
					<Button variant="outline" size="icon" onClick={onPreviousMonth}>
						<ChevronLeft className="h-4 w-4" />
					</Button>
					<Button variant="outline" size="icon" onClick={onNextMonth}>
						<ChevronRight className="h-4 w-4" />
					</Button>
				</div>
			</div>

			<div className="grid grid-cols-7 gap-1">
				{dayNames.map((day) => (
					<div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
						{day}
					</div>
				))}

				{/* Empty cells for days before month starts */}
				{Array.from({ length: firstDayOfMonth }).map((_, index) => (
					<div key={`empty-${index}`} className="aspect-square" />
				))}

				{/* Calendar days */}
				{Array.from({ length: daysInMonth }).map((_, index) => {
					const day = index + 1;
					const dayEvents = getEventsForDate(day);
					const dateStr = formatDateString(currentDate.getFullYear(), currentDate.getMonth(), day);
					const isToday =
						new Date().toDateString() ===
						new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();

					return (
						<CalendarDay
							key={day}
							day={day}
							events={dayEvents}
							isToday={isToday}
							isSelected={selectedDate === dateStr}
							onClick={() => onDateSelect(selectedDate === dateStr ? null : dateStr)}
							eventTypes={eventTypes}
						/>
					);
				})}
			</div>
		</>
	);
}
