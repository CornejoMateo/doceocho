import { Event } from '@/lib/calendar/events';
import { EventType, resolveEventType } from '@/lib/calendar/event-types';
import { CalendarHoliday } from '@/helpers/calendar/holidays';

interface CalendarDayProps {
	day: number;
	events: Record<string, Event[]>;
	isToday: boolean;
	isSelected: boolean;
	onClick: () => void;
	eventTypes?: EventType[];
	holiday?: CalendarHoliday;
}

export function CalendarDay({
	day,
	events,
	isToday,
	isSelected,
	onClick,
	eventTypes = [],
	holiday,
}: CalendarDayProps) {
	// Red for a day off, amber when the admin decided to work it anyway.
	const holidayColor = holiday?.workDay
		? 'text-amber-600 dark:text-amber-400'
		: 'text-red-600 dark:text-red-400';

	return (
		<div
			onClick={onClick}
			title={holiday?.name}
			className={`aspect-square p-2 rounded-lg border transition-colors cursor-pointer ${
				isToday
					? 'border-green-500 dark:border-green-400 bg-green-500/10 dark:bg-green-400/10'
					: isSelected
						? 'border-primary bg-primary/10'
						: Object.keys(events).length > 0
							? 'border-border bg-secondary hover:bg-secondary/80'
							: 'border-border hover:bg-secondary/50'
			}`}
		>
			<div className="flex flex-col h-full">
				<span
					className={`text-sm font-medium ${isToday ? 'text-green-600 dark:text-green-400' : holiday ? holidayColor : Object.keys(events).length > 0 ? 'text-foreground' : 'text-muted-foreground'}`}
				>
					{day}
				</span>
				{holiday && (
					<span className={`hidden sm:block truncate text-[10px] leading-tight ${holidayColor}`}>
						{holiday.workDay ? 'Se trabaja' : 'Feriado'}
					</span>
				)}
				{Object.keys(events).length > 0 && (
					<div className="hidden sm:flex flex-1 items-center justify-center mt-1">
						<div className="flex flex-wrap gap-1">
							{Object.entries(events).map(([type, typeEvents]) => {
								const typeInfo = resolveEventType(type, eventTypes);

								const hasOverdue = typeEvents.some((ev) => ev.is_overdue);

								return (
									<div
										key={type}
										className="flex items-center gap-1"
										title={`${typeEvents.length} ${typeInfo.label.toLowerCase()}${typeEvents.length > 1 ? 's' : ''}`}
									>
										<div
											className="h-2 w-2 rounded-full"
											style={{ backgroundColor: hasOverdue ? '#ef4444' : typeInfo.color }}
										/>
										{typeEvents.length > 1 && (
											<span className="text-[10px] text-muted-foreground">{typeEvents.length}</span>
										)}
									</div>
								);
							})}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
