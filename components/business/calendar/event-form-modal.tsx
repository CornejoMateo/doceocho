'use client';

import { useState, useEffect, useMemo } from 'react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogDescription,
	DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { Bell } from 'lucide-react';
import { validateDate } from '@/helpers/calendar/validateDate';
import { EventType, getEventTypeOptions } from '@/lib/calendar/event-types';
import { ClientSelect } from '@/components/ui/client-select';
import { getWorksByClientId, Work } from '@/lib/works/works';
import { Event } from '@/lib/calendar/events';

interface EventFormModalProps {
	onSave: (data: any) => Promise<boolean>;
	children?: React.ReactNode;
	eventTypes?: EventType[];
	mode?: 'create' | 'edit';
	event?: Event;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	initialWork?: Work | null;
}

export function EventFormModal({
	onSave,
	children,
	eventTypes = [],
	mode = 'create',
	event,
	open: controlledOpen,
	onOpenChange: setControlledOpen,
	initialWork,
}: EventFormModalProps) {
	const [internalOpen, setInternalOpen] = useState(false);
	const isControlled = controlledOpen !== undefined;
	const isOpen = isControlled ? controlledOpen : internalOpen;
	const setIsOpen = isControlled ? (setControlledOpen ?? (() => {})) : setInternalOpen;
	const [isCalendarOpen, setIsCalendarOpen] = useState(false);
	const [isMobile, setIsMobile] = useState(false);
	const { toast } = useToast();
	const eventTypeOptions = useMemo(() => getEventTypeOptions(eventTypes), [eventTypes]);
	const defaultEventType = eventTypeOptions[0]?.value;

	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth < 768);
		};
		checkMobile();
		window.addEventListener('resize', checkMobile);
		return () => window.removeEventListener('resize', checkMobile);
	}, []);

	useEffect(() => {
		if (isOpen && mode === 'edit' && event) {
			setFormData({
				title: event.title || '',
				type: event.type || defaultEventType,
				date: event.date ? parse(event.date, 'yyyy-MM-dd', new Date()) : undefined,
				client_id: event.client_id ?? null,
				client_name: event.client_name || '',
				isManualClient: !event.client_id && !!event.client_name,
				work_id: event.work_id ?? null,
				work_location: event.work_location || '',
				isManualWork: !event.work_id && !!event.work_location,
				description: event.description || '',
				remember: event.remember ?? true,
			});

			let isStale = false;

			if (event.client_id) {
				setLoadingWorks(true);
				getWorksByClientId(event.client_id).then(({ data, error }) => {
					if (isStale) return;
					if (!error) setClientWorks(data || []);
					setLoadingWorks(false);
				});
			} else {
				setClientWorks([]);
				setLoadingWorks(false);
			}

			return () => {
				isStale = true;
			};
		}
	}, [isOpen, mode, event, defaultEventType]);

	useEffect(() => {
		if (isOpen && mode === 'create' && initialWork) {
			setFormData({
				title: initialWork.name || '',
				type: defaultEventType,
				date: undefined,
				client_id: initialWork.client_id ?? null,
				client_name:
					[initialWork.client_last_name, initialWork.client_name].filter(Boolean).join(' ') || '',
				isManualClient: false,
				work_id: initialWork.id ?? null,
				work_location: initialWork.address || '',
				isManualWork: false,
				description: '',
				remember: true,
			});

			let isStale = false;

			if (initialWork.client_id) {
				setLoadingWorks(true);
				getWorksByClientId(initialWork.client_id).then(({ data, error }) => {
					if (isStale) return;
					if (!error) setClientWorks(data || []);
					setLoadingWorks(false);
				});
			} else {
				setClientWorks([]);
				setLoadingWorks(false);
			}

			return () => {
				isStale = true;
			};
		}
	}, [isOpen, mode, initialWork]);

	useEffect(() => {
		setFormData((previous) => {
			if (
				previous.type === defaultEventType ||
				eventTypeOptions.some((option) => option.value === previous.type)
			) {
				return previous;
			}

			return { ...previous, type: defaultEventType };
		});
	}, [defaultEventType, eventTypeOptions]);

	const [formData, setFormData] = useState({
		title: '',
		type: defaultEventType,
		date: undefined as Date | undefined,
		client_id: null as number | null,
		client_name: '' as string,
		isManualClient: false,
		work_id: null as number | null,
		work_location: '' as string,
		isManualWork: false,
		description: '',
		remember: true,
	});

	const [clientWorks, setClientWorks] = useState<Work[]>([]);
	const [loadingWorks, setLoadingWorks] = useState(false);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { id, value } = e.target;
		setFormData((prev) => ({ ...prev, [id]: value }));
	};

	const handleClientSelect = async (clientId: number | null, clientName: string | null) => {
		setFormData((prev) => ({
			...prev,
			client_id: clientId,
			client_name: clientId ? '' : clientName || '',
			isManualClient: false,
			work_id: null,
			work_location: '',
			isManualWork: false,
		}));

		if (clientId) {
			setLoadingWorks(true);
			const { data, error } = await getWorksByClientId(clientId);
			if (error) {
				console.error('Error fetching works:', error);
				setClientWorks([]);
			} else {
				console.log('Obras del cliente seleccionado:', data);
				setClientWorks(data || []);
			}
			setLoadingWorks(false);
		} else {
			setClientWorks([]);
		}
	};

	const handleManualClient = () => {
		setFormData((prev) => ({
			...prev,
			client_id: null,
			client_name: '',
			isManualClient: true,
		}));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		const dateError = validateDate(formData.date);
		if (dateError) {
			toast({
				title: 'Error en la fecha',
				description: dateError,
				variant: 'destructive',
			});
			return;
		}
		const success = await onSave({
			...(mode === 'edit' && event ? { id: event.id } : {}),
			...formData,
			date: format(formData.date!, 'dd-MM-yyyy'),
		});

		if (!success) return;

		setIsOpen(false);
		if (mode === 'create') {
			resetForm();
			toast({
				title: 'Evento creado',
				description: 'El evento se ha creado correctamente',
			});
		}
	};

	const resetForm = () => {
		setFormData({
			title: '',
			type: defaultEventType,
			date: undefined,
			client_id: null,
			client_name: '',
			isManualClient: false,
			work_id: null,
			work_location: '',
			isManualWork: false,
			description: '',
			remember: true,
		});
		setClientWorks([]);
		setIsOpen(false);
	};

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			{children && <DialogTrigger asChild>{children}</DialogTrigger>}{' '}
			<DialogContent className="sm:max-w-[600px]">
				<DialogHeader>
					<DialogTitle>{mode === 'edit' ? 'Editar evento' : 'Nuevo evento'}</DialogTitle>
					<DialogDescription>
						{mode === 'edit'
							? 'Modifica los detalles del evento. Haz clic en guardar cuando hayas terminado.'
							: 'Completa los detalles del nuevo evento. Haz clic en guardar cuando hayas terminado.'}
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
					<div className="grid gap-2">
						<Label htmlFor="title">Título</Label>
						<Input
							id="title"
							value={formData.title}
							onChange={handleInputChange}
							placeholder="Título del evento"
						/>
					</div>

					<div className="grid gap-2">
						<Label htmlFor="type">Tipo de evento</Label>
						{eventTypeOptions.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								No hay tipos de eventos disponibles. Agrega tipos de eventos para seleccionarlos
								aquí.
							</p>
						) : (
							<Select
								value={formData.type}
								onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value }))}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Selecciona un tipo de evento" />
								</SelectTrigger>
								<SelectContent>
									{eventTypeOptions.map((eventType) => (
										<SelectItem key={eventType.value} value={eventType.value}>
											{eventType.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
					</div>

					<div className="grid gap-2 col-span-2">
						<Label>Fecha del evento</Label>
						<Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
							<PopoverTrigger asChild>
								<Button
									variant="outline"
									className={cn(
										isMobile ? 'w-full' : 'w-full',
										'text-left font-normal',
										!formData.date && 'text-muted-foreground'
									)}
								>
									{formData.date ? (
										format(formData.date, 'PPP', { locale: es })
									) : (
										<span>Seleccionar fecha</span>
									)}
									<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-auto p-0" align="start">
								<Calendar
									mode="single"
									selected={formData.date}
									onSelect={(date) => {
										setFormData((prev) => ({ ...prev, date }));
										setIsCalendarOpen(false);
									}}
									autoFocus
									locale={es}
								/>
							</PopoverContent>
						</Popover>
					</div>

					<div className="grid gap-2 col-span-2">
						<Label htmlFor="client">Cliente</Label>
						{!formData.isManualClient ? (
							<ClientSelect
								value={formData.client_id}
								onValueChange={handleClientSelect}
								onManualInput={handleManualClient}
								placeholder="Seleccionar cliente..."
							/>
						) : (
							<div className="space-y-2">
								<Input
									id="client_name"
									value={formData.client_name}
									onChange={handleInputChange}
									placeholder="Nombre del cliente manual"
								/>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => setFormData((prev) => ({ ...prev, isManualClient: false }))}
									className="text-xs"
								>
									← Volver a seleccionar cliente
								</Button>
							</div>
						)}
					</div>

					{formData.client_id && !formData.isManualWork ? (
						<div className="grid gap-2 col-span-2">
							<Label htmlFor="work">Obra</Label>
							<Select
								value={formData.work_id?.toString() || ''}
								onValueChange={(value) => {
									if (value === 'manual') {
										setFormData((prev) => ({
											...prev,
											isManualWork: true,
											work_id: null,
											work_location: '',
										}));
									} else {
										setFormData((prev) => ({
											...prev,
											work_id: parseInt(value),
											work_location: '',
										}));
									}
								}}
							>
								<SelectTrigger className="w-full min-w-0">
									<SelectValue
										placeholder={loadingWorks ? 'Cargando obras...' : 'Seleccionar obra...'}
									/>
								</SelectTrigger>
								<SelectContent>
									{clientWorks.map((work) => (
										<SelectItem key={work.id} value={work.id.toString()}>
											{work.locality || 'Sin localidad'} - {work.address || 'Sin dirección'}
											{work.zone ? ` - ${work.zone}` : ''} {work.hood ? ` - ${work.hood}` : ''}
										</SelectItem>
									))}
									<SelectItem value="manual">Otro (ingresar manualmente)</SelectItem>
								</SelectContent>
							</Select>
						</div>
					) : (
						<div className="grid gap-2 col-span-2">
							<Label htmlFor="work_location">Ubicación de la obra</Label>
							<Input
								id="work_location"
								value={formData.work_location}
								onChange={handleInputChange}
								placeholder="Ej: Av. Colón 1234 - Córdoba Capital"
							/>
							{formData.client_id && formData.isManualWork && (
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() =>
										setFormData((prev) => ({
											...prev,
											isManualWork: false,
											work_location: '',
										}))
									}
									className="text-xs"
								>
									← Volver a seleccionar obra
								</Button>
							)}
						</div>
					)}

					<div className="grid gap-2 col-span-2">
						<Label htmlFor="description">Descripción</Label>
						<Input
							id="description"
							value={formData.description}
							onChange={handleInputChange}
							placeholder="Detalles adicionales del evento"
						/>
					</div>

					<DialogFooter className="col-span-2 flex flex-row gap-2">
						<Button
							type="button"
							variant="outline"
							className={`justify-start ${formData.remember ? 'bg-yellow-200' : ''}`}
							onClick={() => setFormData((prev) => ({ ...prev, remember: !prev.remember }))}
						>
							<Bell className={`w-6 h-6 ${formData.remember ? 'text-red-600' : 'text-gray-700'}`} />
						</Button>
						<div className="flex-1" />
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								resetForm();
								setIsOpen(false);
							}}
						>
							Cancelar
						</Button>
						<Button type="submit">{mode === 'edit' ? 'Guardar cambios' : 'Guardar'}</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
