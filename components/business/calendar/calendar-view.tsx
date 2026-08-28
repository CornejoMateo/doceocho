'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EventFormModal } from '@/components/business/calendar/event-form-modal';
import { EventDetailsModal } from '@/components/business/calendar/event-details-modal';
import { EventTypesDialog } from '@/components/business/calendar/event-types-dialog';
import { MonthGrid } from '@/components/business/calendar/month-grid';
import { deleteEvent, deleteLastYearEvents, Event } from '@/lib/calendar/events';
import { getEventTypeOptions } from '@/lib/calendar/event-types';
import { Calendar as CalendarIcon } from 'lucide-react';
import { useLoadEvents } from '@/hooks/calendar/use-load-events';
import { useToast } from '@/components/ui/use-toast';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/components/ui/dialog';
import { useAuth } from '@/components/provider/auth-provider';
import { translateError } from '@/lib/error-translator';
import { useLoadEventTypes } from '@/hooks/calendar/use-load-event-types';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { getSupabaseClient } from '@/lib/supabase-client';
import { Work } from '@/lib/works/works';
import { useCreateEvent } from '@/hooks/calendar/use-create-event';
import { UpcomingEvents } from '@/components/business/calendar/upcoming-events';
import { matchesSearchText } from '@/helpers/calendar/search-events';
import { toISODate } from '@/helpers/calendar/date';

const maxVisibleEvents = 5;

export function CalendarView() {
	const { toast } = useToast();
	const { events, refresh } = useLoadEvents();
	const { eventTypes } = useLoadEventTypes();
	const [currentDate, setCurrentDate] = useState(new Date());
	const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
	const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
	const [selectedDate, setSelectedDate] = useState<string | null>(null);
	const [activeFilter, setActiveFilter] = useState<string>('todos');
	const [searchTerm, setSearchTerm] = useState('');
	const [showAllEvents, setShowAllEvents] = useState(false);
	const [workDataMap, setWorkDataMap] = useState<Record<number, Work>>({});
	const [openEventTypesDialog, setOpenEventTypesDialog] = useState(false);
	const [deleteEventId, setDeleteEventId] = useState<number | null>(null);
	const [isDeletingEvent, setIsDeletingEvent] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const { createEvent, googleCalendarErrorUrl, setGoogleCalendarErrorUrl } = useCreateEvent({
		eventTypes,
		onEventCreated: async () => {
			await refresh();
			setShowAllEvents(false);
		},
	});
	const eventTypeOptions = getEventTypeOptions(eventTypes);

	useEffect(() => {
		const workIds = [...new Set(events.filter((e) => e.work_id).map((e) => e.work_id!))];
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
	}, [events]);

	const { user } = useAuth();
	const isAuthorized = user?.role === 'Admin';

	const eventsByDate = useMemo(() => {
		const filtered =
			activeFilter === 'todos' ? events : events.filter((event) => event.type === activeFilter);

		const map: Record<string, Event[]> = {};
		for (const event of filtered) {
			const key = toISODate(event.date) ?? '';
			if (!map[key]) map[key] = [];
			map[key].push(event);
		}
		return map;
	}, [events, activeFilter]);

	const handleDeleteEvent = (eventId: number, e: React.MouseEvent) => {
		e.stopPropagation();
		setDeleteEventId(eventId);
	};

	const confirmDeleteEvent = async () => {
		if (!deleteEventId) return;

		try {
			setIsDeletingEvent(true);

			const { error } = await deleteEvent(deleteEventId);

			if (error) {
				toast({
					title: 'Error',
					description: error.message || 'No se pudo eliminar el evento.',
					variant: 'destructive',
				});
				return;
			}

			await refresh();

			if (selectedEvent?.id === deleteEventId) {
				setIsDetailsModalOpen(false);
				setSelectedEvent(null);
			}

			setDeleteEventId(null);

			toast({
				title: 'Evento eliminado',
				description: 'El evento ha sido eliminado exitosamente.',
			});
		} catch (error) {
			const errorMessage = translateError(error);

			toast({
				title: 'Error',
				description: errorMessage || 'No se pudo eliminar el evento.',
				variant: 'destructive',
			});
		} finally {
			setIsDeletingEvent(false);
		}
	};

	const handleEventClick = (event: Event) => {
		setSelectedEvent(event);
		setIsDetailsModalOpen(true);
	};

	const filteredEvents = useMemo(() => {
		const lowerSearch = searchTerm.toLowerCase();

		if (!selectedDate) {
			return events
				.filter((event) => {
					const matchesFilter = activeFilter === 'todos' || event.type === activeFilter;
					return matchesFilter && matchesSearchText(event, lowerSearch, workDataMap);
				})
				.sort((a, b) => {
					return (toISODate(a.date) ?? '').localeCompare(toISODate(b.date) ?? '');
				});
		}

		return events.filter((event) => {
			const matchesDate = toISODate(event.date) === selectedDate;
			const matchesFilter = activeFilter === 'todos' || event.type === activeFilter;
			return matchesDate && matchesFilter && matchesSearchText(event, lowerSearch, workDataMap);
		});
	}, [events, selectedDate, activeFilter, searchTerm, workDataMap]);

	const currentEvents = showAllEvents ? filteredEvents : filteredEvents.slice(0, maxVisibleEvents);

	const handleDeleteLastYearEvents = async () => {
		setIsDeleting(true);
		const { error } = await deleteLastYearEvents();
		setIsDeleting(false);
		setIsDeleteDialogOpen(false);
		if (!error) {
			toast({
				title: 'Eventos eliminados',
				description: 'Se eliminaron los eventos del año pasado.',
			});
			await refresh();
		} else {
			const errorMessage = translateError(error);
			toast({
				title: 'Error',
				description: errorMessage || 'No se pudieron eliminar los eventos.',
				variant: 'destructive',
			});
		}
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div>
					<h2 className="text-2xl font-bold text-foreground text-balance">Calendario</h2>
					<p className="text-muted-foreground mt-1">Eventos y tipos configurables.</p>
				</div>

				<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
					{isAuthorized && (
						<Button variant="outline" size="sm" onClick={() => setOpenEventTypesDialog(true)}>
							Ajustes de eventos
						</Button>
					)}
					<EventTypesDialog
						open={openEventTypesDialog}
						onOpenChange={setOpenEventTypesDialog}
						eventTypes={eventTypes}
						refresh={refresh}
					/>
					<EventFormModal eventTypes={eventTypes} onSave={createEvent}>
						{isAuthorized && (
							<Button className="gap-2">
								<CalendarIcon className="h-4 w-4" />
								Agregar evento
							</Button>
						)}
					</EventFormModal>
				</div>
			</div>

			<div className="grid gap-6 lg:grid-cols-3">
				{/* Calendar */}
				<Card className="p-6 bg-card border-border lg:col-span-2">
					<div className="space-y-4">
						<div className="flex gap-2 flex-wrap">
							<Button
								variant={activeFilter === 'todos' ? 'default' : 'outline'}
								size="sm"
								onClick={() => setActiveFilter('todos')}
							>
								Todos
							</Button>
							{eventTypeOptions.map((eventType) => (
								<Button
									key={eventType.value}
									variant={activeFilter === eventType.value ? 'default' : 'outline'}
									size="sm"
									onClick={() => setActiveFilter(eventType.value)}
								>
									{eventType.label}
								</Button>
							))}
						</div>

						<MonthGrid
							currentDate={currentDate}
							selectedDate={selectedDate}
							eventTypes={eventTypes}
							eventsByDate={eventsByDate}
							onDateSelect={setSelectedDate}
							onPreviousMonth={() =>
								setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
							}
							onNextMonth={() =>
								setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
							}
						/>
					</div>
				</Card>

				{/* Upcoming events */}
				<UpcomingEvents
					events={currentEvents}
					totalCount={filteredEvents.length}
					maxVisibleEvents={maxVisibleEvents}
					showAllEvents={showAllEvents}
					onToggleShowAll={() => setShowAllEvents(!showAllEvents)}
					selectedDate={selectedDate}
					onClearDate={() => {
						setSelectedDate(null);
						setShowAllEvents(false);
					}}
					searchTerm={searchTerm}
					onSearchChange={setSearchTerm}
					onEventClick={handleEventClick}
					onDeleteEvent={handleDeleteEvent}
					isAuthorized={isAuthorized}
					eventTypes={eventTypes}
					workDataMap={workDataMap}
				/>
			</div>

			{/* Legend */}
			<Card className="p-4 bg-card border-border">
				<div className="flex flex-wrap gap-4">
					{eventTypeOptions.map((eventType) => (
						<div key={eventType.value} className="flex items-center gap-2">
							<div className="h-3 w-3 rounded-full" style={{ backgroundColor: eventType.color }} />
							<span className="text-sm text-muted-foreground">{eventType.label}</span>
						</div>
					))}
					<div className="flex items-center gap-2">
						<div className="h-3 w-3 rounded-full bg-red-500" />
						<span className="text-sm text-muted-foreground">Vencidos</span>
					</div>
				</div>
			</Card>

			{user?.role === 'Admin' && (
				<Card className="p-4 bg-card border-border">
					<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
						<div className="flex-1 min-w-0">
							<h3 className="text-sm font-medium text-foreground break-words">
								Limpiar datos antiguos
							</h3>
							<p className="text-xs text-muted-foreground mt-1 break-words">
								Elimina eventos resueltos anteriores al 1 de enero del presente año para mantener el
								calendario limpio y relevante.
							</p>
						</div>
						<Button
							variant="destructive"
							className="w-full md:w-auto md:max-w-xs"
							onClick={() => setIsDeleteDialogOpen(true)}
						>
							Eliminar eventos del año pasado
						</Button>
						<Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>¿Eliminar eventos de años anteriores?</DialogTitle>
									<DialogDescription>
										Esta acción eliminará todos los eventos (finalizados) anteriores al 1 de enero
										del presente año. ¿Estás seguro?
									</DialogDescription>
								</DialogHeader>
								<DialogFooter>
									<Button
										variant="outline"
										onClick={() => setIsDeleteDialogOpen(false)}
										disabled={isDeleting}
									>
										Cancelar
									</Button>
									<Button
										variant="destructive"
										onClick={handleDeleteLastYearEvents}
										disabled={isDeleting}
									>
										Eliminar
									</Button>
								</DialogFooter>
							</DialogContent>
						</Dialog>
					</div>
				</Card>
			)}

			{/* Event details */}
			{selectedEvent && (
				<EventDetailsModal
					isOpen={isDetailsModalOpen}
					onClose={() => {
						setIsDetailsModalOpen(false);
						setSelectedEvent(null);
					}}
					event={{
						...selectedEvent,
						title: selectedEvent?.title ?? 'Sin título',
						type: selectedEvent?.type,
						date: selectedEvent?.date ?? '',
						client_name: selectedEvent?.client_name ?? '',
						description: selectedEvent?.description ?? '',
						remember: selectedEvent?.remember ?? false,
						work_location: selectedEvent?.work_location ?? '',
						work_id: selectedEvent?.work_id ?? null,
					}}
					onEventUpdated={refresh}
					eventTypes={eventTypes}
				/>
			)}
			<Dialog
				open={googleCalendarErrorUrl !== null}
				onOpenChange={(open) => {
					if (!open) setGoogleCalendarErrorUrl(null);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>No se pudo abrir Google Calendar</DialogTitle>
						<DialogDescription>
							Tu navegador bloqueó la apertura de la nueva pestaña. Hacé clic en el link para abrir
							el evento manualmente.
						</DialogDescription>
					</DialogHeader>
					{googleCalendarErrorUrl && (
						<a
							href={googleCalendarErrorUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90"
						>
							Abrir evento en Google Calendar
						</a>
					)}
					<DialogFooter>
						<Button variant="outline" onClick={() => setGoogleCalendarErrorUrl(null)}>
							Cerrar
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<AlertDialog
				open={deleteEventId !== null}
				onOpenChange={(open) => {
					if (!open) {
						setDeleteEventId(null);
					}
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Eliminar evento</AlertDialogTitle>

						<AlertDialogDescription>
							¿Estás seguro de que deseas eliminar este evento?
							<br />
							<br />
							Esta acción no se puede deshacer.
						</AlertDialogDescription>
					</AlertDialogHeader>

					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeletingEvent}>Cancelar</AlertDialogCancel>

						<AlertDialogAction onClick={confirmDeleteEvent} disabled={isDeletingEvent}>
							Eliminar
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
