'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EventFormModal } from '@/components/business/calendar/event-form-modal';
import { EventDetailsModal } from '@/components/business/calendar/event-details-modal';
import { CalendarDay } from '@/components/business/calendar/calendar-days';
import { EventTypesDialog } from '@/components/business/calendar/event-types-dialog';
import { createEvent, deleteEvent } from '@/lib/calendar/events';
import { getEventTypeOptions, resolveEventType } from '@/lib/calendar/event-types';
import {
	Calendar as CalendarIcon,
	ChevronLeft,
	ChevronRight,
	MapPin,
	Package,
	Trash2,
	Home,
} from 'lucide-react';
import { monthNames, dayNames } from '@/constants/date';
import { Event } from '@/lib/calendar/events';
import { useLoadEvents } from '@/hooks/calendar/use-load-events';
import { useToast } from '@/components/ui/use-toast';
import { deleteLastYearEvents } from '@/lib/calendar/events';
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
import { formatCreatedAt } from '@/utils/format-date';

export function CalendarView() {
	const { toast } = useToast();
	const { events, isLoading, refresh } = useLoadEvents();
	const { eventTypes } = useLoadEventTypes();
	const eventTypeOptions = getEventTypeOptions(eventTypes);
	const [currentDate, setCurrentDate] = useState(new Date());
	const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
	const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
	const [selectedDate, setSelectedDate] = useState<string | null>(null);
	const [activeFilter, setActiveFilter] = useState<string>('todos');
	const [searchTerm, setSearchTerm] = useState('');
	const maxVisibleEvents = 5; // Show only 5 events by default
	const [showAllEvents, setShowAllEvents] = useState(false);

	const [workDataMap, setWorkDataMap] = useState<Record<number, Work>>({});

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

	const [openEventTypesDialog, setOpenEventTypesDialog] = useState(false);
	const [deleteEventId, setDeleteEventId] = useState<number | null>(null);
	const [isDeletingEvent, setIsDeletingEvent] = useState(false);

	useEffect(() => {
		console.log('eventTypes actualizados', eventTypes);
	}, [eventTypes]);

	const { user } = useAuth();
	const isAuthorized = user?.role === 'Admin';
	const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
	const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

	const formatDateString = (year: number, month: number, day: number) => {
		return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
	};

	const toISODate = (date: string | undefined): string | null => {
		if (!date) return null;
		return date.split('T')[0];
	};

	const getEventsForDate = (day: number) => {
		const dateStr = formatDateString(currentDate.getFullYear(), currentDate.getMonth(), day);
		let dayEvents = events.filter((event) => toISODate(event.date) === dateStr);

		if (activeFilter !== 'todos') {
			dayEvents = dayEvents.filter((event) => event.type === activeFilter);
		}

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

	const matchesWorkData = (event: Event, search: string) => {
		if (event.work_id && workDataMap[event.work_id]) {
			const w = workDataMap[event.work_id];
			if (
				w.locality?.toLowerCase().includes(search) ||
				w.address?.toLowerCase().includes(search) ||
				w.zone?.toLowerCase().includes(search) ||
				w.hood?.toLowerCase().includes(search)
			) {
				return true;
			}
		}
		return false;
	};

	const matchesSearchText = (event: Event, search: string) => {
		if (search === '') return true;
		return (
			event.title?.toLowerCase().includes(search) ||
			event.client_name?.toLowerCase().includes(search) ||
			event.description?.toLowerCase().includes(search) ||
			event.type?.toLowerCase().includes(search) ||
			event.work_location?.toLowerCase().includes(search) ||
			matchesWorkData(event, search)
		);
	};

	const filteredEvents = selectedDate
		? events.filter((event) => {
				const matchesDate = toISODate(event.date) === selectedDate;
				const matchesFilter = activeFilter === 'todos' || event.type === activeFilter;
				return matchesDate && matchesFilter && matchesSearchText(event, searchTerm.toLowerCase());
			})
		: events
				.filter((event) => {
					const matchesFilter = activeFilter === 'todos' || event.type === activeFilter;
					return matchesFilter && matchesSearchText(event, searchTerm.toLowerCase());
				})
				.sort((a, b) => {
					return (toISODate(a.date) ?? '').localeCompare(toISODate(b.date) ?? '');
				});
	const currentEvents = showAllEvents ? filteredEvents : filteredEvents.slice(0, maxVisibleEvents);

	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

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
			const errorMesagge = translateError(error);
			toast({
				title: 'Error',
				description: errorMesagge || 'No se pudieron eliminar los eventos.',
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
					<EventFormModal
						eventTypes={eventTypes}
						onSave={async (eventData) => {
							try {
								const selectedEventType = eventTypes.find(
									(eventType) => eventType.name === eventData.type
								);
								const dateStr =
									typeof eventData.date === 'string'
										? eventData.date
										: eventData.date instanceof Date
											? `${eventData.date.getDate()}-${eventData.date.getMonth() + 1}-${eventData.date.getFullYear()}`
											: '';

								const [day, month, year] = dateStr.split('-').map(Number);
								const formattedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

								const { data: newEvent, error } = await createEvent({
									title: eventData.title || 'Sin título',
									type_id: selectedEventType?.id ?? null,
									description: eventData.description,
									client_id: eventData.client_id,
									client_name: eventData.client_name,
									date: formattedDate,
									remember: eventData.remember,
									work_id: eventData.work_id,
									work_location: eventData.work_location,
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
									await refresh();
									setShowAllEvents(false);
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
						}}
					>
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

						{/* Calendar header */}
						<div className="flex items-center justify-between">
							<h3 className="text-lg font-semibold text-foreground">
								{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
							</h3>
							<div className="flex gap-2">
								<Button
									variant="outline"
									size="icon"
									onClick={() =>
										setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
									}
								>
									<ChevronLeft className="h-4 w-4" />
								</Button>
								<Button
									variant="outline"
									size="icon"
									onClick={() =>
										setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
									}
								>
									<ChevronRight className="h-4 w-4" />
								</Button>
							</div>
						</div>

						{/* Calendar grid */}
						<div className="grid grid-cols-7 gap-1">
							{/* Day names */}
							{dayNames.map((day) => (
								<div
									key={day}
									className="text-center text-xs font-medium text-muted-foreground py-2"
								>
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
								const dateStr = formatDateString(
									currentDate.getFullYear(),
									currentDate.getMonth(),
									day
								);
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
										onClick={() => setSelectedDate(selectedDate === dateStr ? null : dateStr)}
										eventTypes={eventTypes}
									/>
								);
							})}
						</div>
					</div>
				</Card>

				{/* Upcoming events */}
				<Card className="p-6 bg-card border-border">
					<div className="flex justify-between items-center">
						<h3 className="text-sm font-semibold text-foreground">Próximos eventos</h3>
						{selectedDate && (
							<Button
								variant="ghost"
								size="sm"
								onClick={() => {
									setSelectedDate(null);
									setShowAllEvents(false); // Reset to show only first 5 events when clearing date filter
								}}
								className="text-sm text-muted-foreground"
							>
								Mostrar todos los eventos
							</Button>
						)}
					</div>
					{/* Search Bar */}
					<Card className="p-2 bg-card border-border">
						<div className="flex items-center gap-2">
							<input
								type="text"
								placeholder="Buscar eventos por cliente, ubicación, tipo, etc..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="flex-1 px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
							/>
						</div>
					</Card>
					<div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
						{currentEvents.length > 0 ? (
							<>
								{currentEvents.map((event) => {
									const typeInfo = resolveEventType(event.type, eventTypes);
									const isOverdue = event.is_overdue || false;

									return (
										<div
											key={event.id}
											className={`p-3 rounded-lg border space-y-2 cursor-pointer transition-colors ${
												isOverdue
													? 'border-red-500 bg-red-500/10 hover:bg-red-500/20'
													: 'border-border bg-secondary hover:bg-secondary/80'
											}`}
											onClick={() => handleEventClick(event)}
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
															<h4 className="text-sm font-medium text-foreground break-words">
																{event.title}
															</h4>
															{isOverdue && (
																<div className="flex items-center gap-1 flex-shrink-0">
																	<div
																		className="h-2 w-2 rounded-full bg-red-500"
																		title="Evento atrasado"
																	/>
																</div>
															)}
														</div>
														{event.client_name && (
															<p className="text-xs text-muted-foreground break-words">
																{event.client_name}
															</p>
														)}
													</div>
												</div>
												{isAuthorized && (
													<div className="flex items-start flex-shrink-0">
														<Button
															variant="ghost"
															size="icon"
															onClick={(e) => handleDeleteEvent(event.id, e)}
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
													<CalendarIcon className="h-3.5 w-3.5 flex-shrink-0" />
													<span>{formatCreatedAt(event.date)}</span>
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
								})}
								{filteredEvents.length > maxVisibleEvents && (
									<Button
										variant="outline"
										size="sm"
										className="w-full mt-2"
										onClick={() => setShowAllEvents(!showAllEvents)}
									>
										{showAllEvents
											? 'Mostrar menos'
											: `Mostrar más (${filteredEvents.length - maxVisibleEvents})`}
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
