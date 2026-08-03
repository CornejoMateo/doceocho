'use client';

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CalendarIcon, MapPin, User, FileText, ChevronDown, Home } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { statusOptionsEvents } from '@/constants/calendar/status';
import { Event, updateEvent } from '@/lib/calendar/events';
import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Bell } from 'lucide-react';
import { translateError } from '@/lib/error-translator';
import { EventType, resolveEventType } from '@/lib/calendar/event-types';
import { useAuth } from '@/components/provider/auth-provider';
import { getWorkById, Work } from '@/lib/works/works';
import { formatCreatedAt } from '@/utils/format-date';
import { Pencil } from 'lucide-react';
import { EventFormModal } from '@/components/business/calendar/event-form-modal';
import { format, parse } from 'date-fns';

interface EventDetailsModalProps {
	isOpen: boolean;
	onClose: () => void;
	event: Event;
	onEventUpdated?: () => void;
	eventTypes?: EventType[];
}

export function EventDetailsModal({
	isOpen,
	onClose,
	event,
	onEventUpdated,
	eventTypes = [],
}: EventDetailsModalProps) {
	const typeInfo = resolveEventType(event.type, eventTypes);
	const { toast } = useToast();
	const [currentStatus, setCurrentStatus] = useState(event.status || 'pending');

	const [currentRemember, setCurrentRemember] = useState(event.remember || false);

	const [workData, setWorkData] = useState<Work | null>(null);
	const [isLoadingWork, setIsLoadingWork] = useState(false);
	const [isEditOpen, setIsEditOpen] = useState(false);

	useEffect(() => {
		if (event.work_id) {
			setIsLoadingWork(true);
			getWorkById(event.work_id).then(({ data, error }) => {
				if (error) {
					console.error('Error fetching work data:', error);
					setWorkData(null);
				} else {
					setWorkData(data);
				}
				setIsLoadingWork(false);
			});
		} else {
			setWorkData(null);
			setIsLoadingWork(false);
		}
	}, [event.work_id]);

	const { user } = useAuth();
	const isAuthorized = user?.role === 'Admin';

	const handleRememberChange = async () => {
		try {
			const newRemember = !currentRemember;
			setCurrentRemember(newRemember);
			const { error } = await updateEvent(event.id, { remember: newRemember });
			if (error) {
				throw error;
			}
			onEventUpdated?.();
			toast({
				title: 'Recordatorio actualizado',
				description: newRemember
					? 'El recordatorio ha sido activado'
					: 'El recordatorio ha sido desactivado',
			});
		} catch (error) {
			console.error('Error al actualizar el recordatorio:', error);
			setCurrentRemember(event.remember || false);
			const errorMessage = translateError(error);
			toast({
				title: 'Error',
				description: errorMessage || 'No se pudo actualizar el recordatorio',
				variant: 'destructive',
			});
		}
	};

	const handleStatusChange = async (newStatus: string) => {
		try {
			setCurrentStatus(newStatus);
			const { error } = await updateEvent(event.id, { status: newStatus });

			if (error) {
				throw error;
			}

			onEventUpdated?.();
			const statusLabel =
				statusOptionsEvents.find((option) => option.value === newStatus)?.label ?? newStatus;
			toast({
				title: 'Estado actualizado',
				description: `El evento ha sido marcado como ${statusLabel}`,
			});
		} catch (error) {
			setCurrentStatus(event.status || 'pending');
			toast({
				title: 'Error',
				description: translateError(error) || 'No se pudo actualizar el estado del evento',
				variant: 'destructive',
			});
		}
	};

	const handleEditSave = async (data: any) => {
		try {
			const { id, isManualClient, isManualWork, type, ...rest } = data;

			const selectedEventType = eventTypes.find((eventType) => eventType.name === type);
			const updateData = {
				...rest,
				type_id: selectedEventType?.id || null,
			};
			const dateToFormat = updateData.date;

			const parsedDate = parse(dateToFormat, 'dd-MM-yyyy', new Date());
			const formattedDate = format(parsedDate, 'yyyy-MM-dd');
			updateData.date = formattedDate;
			const { error } = await updateEvent(event.id, updateData);
			if (error) throw error;
			onEventUpdated?.();
			setIsEditOpen(false);
			onClose();
			toast({
				title: 'Evento actualizado',
				description: 'El evento ha sido actualizado correctamente',
			});
			return true;
		} catch (error) {
			toast({
				title: 'Error',
				description: translateError(error) || 'No se pudo actualizar el evento',
				variant: 'destructive',
			});
			return false;
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<DialogTitle className="text-xl">{event.title}</DialogTitle>
						</div>
						{isAuthorized ? (
							<div className="flex items-center gap-1 text-sm text-muted-foreground group">
								<select
									value={currentStatus || ''}
									onChange={(e) => handleStatusChange(e.target.value)}
									className="bg-transparent border-none focus:ring-0 focus:ring-offset-0 p-1 pr-6 appearance-none focus:outline-none cursor-pointer hover:bg-muted rounded-md"
								>
									{statusOptionsEvents.map((option) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</select>
								<ChevronDown className="h-3.5 w-3.5 -ml-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
							</div>
						) : (
							<span className="text-sm text-muted-foreground">
								{statusOptionsEvents.find((o) => o.value === currentStatus)?.label || currentStatus}
							</span>
						)}
					</div>
					<DialogDescription className="sr-only">
						Detalles del evento del calendario
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-2">
					<div className="space-y-3">
						{event.client_name && (
							<div className="flex items-start gap-3">
								<User className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
								<div>
									<p className="text-sm text-muted-foreground">Cliente</p>
									<p className="text-sm">{event.client_name}</p>
								</div>
							</div>
						)}

						<div className="flex items-start gap-3">
							<CalendarIcon className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
							<div>
								<p className="text-sm text-muted-foreground">Fecha</p>
								<p className="text-sm">{formatCreatedAt(event.date)}</p>
							</div>
						</div>

						{isLoadingWork ? (
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<span>Cargando datos de la obra...</span>
							</div>
						) : workData ? (
							<>
								<div className="flex items-start gap-3">
									<MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
									<div>
										<p className="text-sm text-muted-foreground">Localidad</p>
										<p className="text-sm">{workData.locality || 'Sin localidad'}</p>
									</div>
								</div>
								<div className="flex items-start gap-3">
									<MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
									<div>
										<p className="text-sm text-muted-foreground">Dirección</p>
										<p className="text-sm">{workData.address || 'Sin dirección'}</p>
									</div>
								</div>
								{workData.zone && (
									<div className="flex items-start gap-3">
										<MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
										<div>
											<p className="text-sm text-muted-foreground">Zona</p>
											<p className="text-sm">{workData.zone}</p>
										</div>
									</div>
								)}
								{workData.hood && (
									<div className="flex items-start gap-3">
										<Home className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
										<div>
											<p className="text-sm text-muted-foreground">Barrio</p>
											<p className="text-sm">{workData.hood}</p>
										</div>
									</div>
								)}
							</>
						) : event.work_location ? (
							<div className="flex items-start gap-3">
								<MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
								<div>
									<p className="text-sm text-muted-foreground">Ubicación de obra</p>
									<p className="text-sm">{event.work_location}</p>
								</div>
							</div>
						) : null}

						<div className="flex items-start gap-3">
							<FileText className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
							<div className="flex-1">
								<p className="text-sm text-muted-foreground">Descripción</p>
								<p className="text-sm whitespace-pre-line">
									{event.description || 'No hay descripción disponible'}
								</p>
							</div>
						</div>
					</div>
				</div>

				<div className="flex gap-2 mb-4">
					<Badge
						className="px-2 py-1 text-sm flex gap-1"
						style={{ backgroundColor: typeInfo.color }}
					>
						{typeInfo.label}
					</Badge>
					<div className="flex items-center gap-2 justify-end flex-1">
						{event.is_overdue && (
							<span className="text-xs font-semibold text-red-600 mx-2">Evento vencido</span>
						)}
					</div>
				</div>

				<div className="flex items-center justify-end gap-2 mb-4">
					<div className="flex items-center gap-2 flex-1">
						{isAuthorized && (
							<Button
								type="button"
								aria-label="Toggle Remember"
								variant="outline"
								onClick={handleRememberChange}
								className={`justify-start ${currentRemember ? 'bg-yellow-200' : ''}`}
							>
								<Bell className={`w-6 h-6 ${currentRemember ? 'text-red-600' : 'text-gray-700'}`} />
							</Button>
						)}
					</div>
					<div className="flex items-center gap-2">
						{isAuthorized && (
							<Button variant="outline" onClick={() => setIsEditOpen(true)}>
								<Pencil className="h-4 w-4 mr-1" />
								Editar
							</Button>
						)}
						<Button variant="outline" onClick={onClose}>
							Cerrar
						</Button>
					</div>
				</div>
			</DialogContent>

			<EventFormModal
				mode="edit"
				event={event}
				eventTypes={eventTypes}
				open={isEditOpen}
				onOpenChange={setIsEditOpen}
				onSave={handleEditSave}
			/>
		</Dialog>
	);
}
