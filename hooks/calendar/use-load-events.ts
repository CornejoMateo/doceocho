import { listEvents, Event } from '@/lib/calendar/events';
import { listEventTypes } from '@/lib/calendar/event-types';
import { useRealtimeEvents } from '@/hooks/calendar/use-realtime-events';

export function useLoadEvents() {
	const {
		data: rawEvents,
		loading: isLoading,
		error,
		refresh,
	} = useRealtimeEvents<Event>(
		'events',
		async () => {
			const [{ data: events, error: eventsError }, { data: eventTypes, error: eventTypesError }] =
				await Promise.all([listEvents(), listEventTypes()]);
			if (eventsError) throw eventsError;
			if (eventTypesError) throw eventTypesError;

			// Get event types in a map for easy lookup
			const eventTypeById = new Map(
				(eventTypes ?? []).map((eventType) => [eventType.id, eventType])
			);

			return (events ?? []).map((event) => {
				const eventType = event.type_id ? eventTypeById.get(event.type_id) : null;

				return {
					id: event.id,
					date: event.date || new Date().toISOString().split('T')[0],
					time: event.time || null,
					title: event.title || 'Sin título',
					description: event.description || '',
					client_id: event.client_id,
					client_name: event.client_name,
					status: event.status,
					is_overdue: event.is_overdue || false,
					remember: event.remember || false,
					type_id: event.type_id,
					type: eventType?.name || 'otros',
					work_id: event.work_id,
					work_location: event.work_location,
				};
			});
		},
		'events_cache'
	);

	const events = rawEvents;

	return { events, isLoading, refresh };
}
