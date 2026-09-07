import { useCallback, useState } from 'react';
import { EventType } from '@/lib/calendar/event-types';
import { createEvent } from '@/lib/calendar/events';
import { buildGoogleCalendarUrl } from '@/lib/calendar/google-calendar';
import { useToast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';

type UseCreateEventParams = {
	eventTypes: EventType[];
	onEventCreated?: () => void | Promise<void>;
};

export function useCreateEvent({ eventTypes, onEventCreated }: UseCreateEventParams) {
	const { toast } = useToast();
	const [googleCalendarErrorUrl, setGoogleCalendarErrorUrl] = useState<string | null>(null);

	const handleCreate = useCallback(
		async (eventData: any): Promise<boolean> => {
			try {
				const selectedEventType = eventTypes.find((eventType) => eventType.name === eventData.type);

				const dateStr =
					typeof eventData.date === 'string'
						? eventData.date
						: eventData.date instanceof Date
							? `${eventData.date.getDate()}-${eventData.date.getMonth() + 1}-${eventData.date.getFullYear()}`
							: '';

				const [day, month, year] = dateStr.split('-').map(Number);

				const formattedDate = `${year}-${month.toString().padStart(2, '0')}-${day
					.toString()
					.padStart(2, '0')}`;

				const { data: newEvent, error } = await createEvent({
					title: eventData.title || 'Sin título',
					type_id: selectedEventType?.id ?? null,
					description: eventData.description,
					client_id: eventData.client_id,
					client_name: !eventData.client_id ? eventData.client_name : null,
					date: formattedDate,
					time: eventData.time || null,
					remember: eventData.remember,
					work_id: eventData.work_id,
					work_location: !eventData.work_id ? eventData.work_location : null,
				});

				if (error) {
					console.error('Error al crear el evento:', error);

					toast({
						title: 'Error',
						description: translateError(error) || 'No se pudo crear el evento.',
						variant: 'destructive',
					});

					return false;
				}

				if (newEvent) {
					const googleCalendarUrl = buildGoogleCalendarUrl({
						title: eventData.title || 'Sin título',
						type: selectedEventType?.name || eventData.type,
						description: eventData.description,
						clientName: eventData.client_name,
						location: eventData.work_location,
						date: formattedDate,
						time: eventData.time,
					});

					const opened = window.open(googleCalendarUrl, '_blank');

					if (!opened) {
						setGoogleCalendarErrorUrl(googleCalendarUrl);
					}

					await onEventCreated?.();

					return true;
				}

				return false;
			} catch (error) {
				console.error('Error inesperado al crear el evento:', error);

				toast({
					title: 'Error',
					description: translateError(error) || 'No se pudo crear el evento.',
					variant: 'destructive',
				});

				return false;
			}
		},
		[eventTypes, onEventCreated, toast]
	);

	return {
		createEvent: handleCreate,
		googleCalendarErrorUrl,
		setGoogleCalendarErrorUrl,
	};
}
