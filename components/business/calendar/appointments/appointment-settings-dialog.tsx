'use client';

import { useEffect, useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';
import { SLOT_DURATION_OPTIONS, WEEKDAYS } from '@/constants/appointments/appointments';
import {
	AppointmentSettings,
	BlockedDate,
	createBlockedDate,
	deleteBlockedDate,
	listBlockedDates,
	updateAppointmentSettings,
} from '@/lib/appointments/appointment-settings';
import { DaySchedule } from '@/helpers/appointments/availability';
import { EventType } from '@/lib/calendar/event-types';
import { formatCreatedAt } from '@/utils/format-date';

const NO_EVENT_TYPE = 'none';

const DEFAULT_DAY: DaySchedule = { enabled: false, start: '09:00', end: '18:00' };

interface AppointmentSettingsDialogProps {
	settings: AppointmentSettings | null;
	eventTypes: EventType[];
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSaved: () => void;
}

export function AppointmentSettingsDialog({
	settings,
	eventTypes,
	open,
	onOpenChange,
	onSaved,
}: AppointmentSettingsDialogProps) {
	const { toast } = useToast();
	const [schedule, setSchedule] = useState<DaySchedule[]>([]);
	const [slotDuration, setSlotDuration] = useState('60');
	const [minNoticeHours, setMinNoticeHours] = useState('24');
	const [maxDaysAhead, setMaxDaysAhead] = useState('30');
	const [isPublicEnabled, setIsPublicEnabled] = useState(true);
	const [eventTypeId, setEventTypeId] = useState(NO_EVENT_TYPE);
	const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
	const [newBlockedDate, setNewBlockedDate] = useState('');
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		if (!open || !settings) return;

		const stored = settings.weekly_schedule ?? [];
		setSchedule(WEEKDAYS.map((day) => stored[day.value] ?? { ...DEFAULT_DAY }));
		setSlotDuration(String(settings.slot_duration_minutes));
		setMinNoticeHours(String(settings.min_notice_hours));
		setMaxDaysAhead(String(settings.max_days_ahead));
		setIsPublicEnabled(settings.is_public_enabled);
		setEventTypeId(settings.event_type_id ? String(settings.event_type_id) : NO_EVENT_TYPE);

		listBlockedDates().then(({ data }) => setBlockedDates(data ?? []));
	}, [open, settings]);

	const updateDay = (index: number, changes: Partial<DaySchedule>) => {
		setSchedule((previous) =>
			previous.map((day, dayIndex) => (dayIndex === index ? { ...day, ...changes } : day))
		);
	};

	const handleAddBlockedDate = async () => {
		if (!newBlockedDate) return;

		const { data, error } = await createBlockedDate(newBlockedDate);

		if (error) {
			toast({
				variant: 'destructive',
				title: 'Error al bloquear la fecha',
				description: translateError(error),
			});
			return;
		}

		if (data) {
			setBlockedDates((previous) =>
				[...previous, data].sort((a, b) => a.date.localeCompare(b.date))
			);
		}

		setNewBlockedDate('');
	};

	const handleRemoveBlockedDate = async (id: number) => {
		const { error } = await deleteBlockedDate(id);

		if (error) {
			toast({
				variant: 'destructive',
				title: 'Error al desbloquear la fecha',
				description: translateError(error),
			});
			return;
		}

		setBlockedDates((previous) => previous.filter((blocked) => blocked.id !== id));
	};

	const handleSave = async () => {
		const invalidDay = schedule.find((day) => day.enabled && day.end <= day.start);

		if (invalidDay) {
			toast({
				variant: 'destructive',
				title: 'Horario inválido',
				description: 'La hora de fin tiene que ser posterior a la de inicio.',
			});
			return;
		}

		setIsSaving(true);

		try {
			const { error } = await updateAppointmentSettings({
				weekly_schedule: schedule,
				slot_duration_minutes: Number(slotDuration),
				min_notice_hours: Number(minNoticeHours),
				max_days_ahead: Number(maxDaysAhead),
				is_public_enabled: isPublicEnabled,
				event_type_id: eventTypeId === NO_EVENT_TYPE ? null : Number(eventTypeId),
			});

			if (error) {
				toast({
					variant: 'destructive',
					title: 'Error al guardar la configuración',
					description: translateError(error),
				});
				return;
			}

			toast({
				title: 'Configuración guardada',
				description: 'La disponibilidad se actualizó correctamente.',
			});

			onOpenChange(false);
			onSaved();
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="w-[95vw] max-w-2xl max-h-[95dvh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Configuración de citas</DialogTitle>
					<DialogDescription>
						Definí qué días y horarios pueden elegir los clientes desde el enlace público.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6">
					<div className="flex items-center justify-between rounded-lg border border-border p-3">
						<div>
							<p className="text-sm font-medium text-foreground">Solicitud de citas activa</p>
							<p className="text-xs text-muted-foreground">
								Si la apagás, el enlace público deja de tomar solicitudes.
							</p>
						</div>
						<Switch checked={isPublicEnabled} onCheckedChange={setIsPublicEnabled} />
					</div>

					<div className="space-y-3">
						<h4 className="text-sm font-medium text-foreground">Días y horarios</h4>
						{WEEKDAYS.map((weekday, index) => {
							const day = schedule[index] ?? DEFAULT_DAY;

							return (
								<div
									key={weekday.value}
									className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center"
								>
									<div className="flex items-center gap-3 sm:w-40">
										<Switch
											checked={day.enabled}
											onCheckedChange={(checked) => updateDay(index, { enabled: checked })}
										/>
										<span className="text-sm text-foreground">{weekday.label}</span>
									</div>
									<div className="flex flex-1 items-center gap-2">
										<Input
											type="time"
											value={day.start}
											onChange={(event) => updateDay(index, { start: event.target.value })}
											disabled={!day.enabled}
											className="flex-1"
										/>
										<span className="text-sm text-muted-foreground">a</span>
										<Input
											type="time"
											value={day.end}
											onChange={(event) => updateDay(index, { end: event.target.value })}
											disabled={!day.enabled}
											className="flex-1"
										/>
									</div>
								</div>
							);
						})}
					</div>

					<div className="grid gap-4 sm:grid-cols-3">
						<div className="grid gap-2">
							<Label htmlFor="slot-duration">Duración de cada cita</Label>
							<Select value={slotDuration} onValueChange={setSlotDuration}>
								<SelectTrigger id="slot-duration">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{SLOT_DURATION_OPTIONS.map((option) => (
										<SelectItem key={option} value={String(option)}>
											{option} minutos
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="min-notice">Anticipación mínima (horas)</Label>
							<Input
								id="min-notice"
								type="number"
								min={0}
								value={minNoticeHours}
								onChange={(event) => setMinNoticeHours(event.target.value)}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="max-days">Se puede reservar hasta (días)</Label>
							<Input
								id="max-days"
								type="number"
								min={1}
								value={maxDaysAhead}
								onChange={(event) => setMaxDaysAhead(event.target.value)}
							/>
						</div>
					</div>

					<div className="grid gap-2">
						<Label htmlFor="event-type">Tipo de evento al aceptar</Label>
						<Select value={eventTypeId} onValueChange={setEventTypeId}>
							<SelectTrigger id="event-type">
								<SelectValue placeholder="Sin tipo" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={NO_EVENT_TYPE}>Sin tipo</SelectItem>
								{eventTypes.map((eventType) => (
									<SelectItem key={eventType.id} value={String(eventType.id)}>
										{eventType.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<p className="text-xs text-muted-foreground">
							Con qué tipo se crea el evento en el calendario cuando aceptás una cita.
						</p>
					</div>

					<div className="space-y-3">
						<h4 className="text-sm font-medium text-foreground">Días bloqueados</h4>
						<div className="flex gap-2">
							<Input
								type="date"
								value={newBlockedDate}
								onChange={(event) => setNewBlockedDate(event.target.value)}
							/>
							<Button type="button" variant="outline" onClick={handleAddBlockedDate}>
								Bloquear
							</Button>
						</div>
						{blockedDates.length === 0 ? (
							<p className="text-xs text-muted-foreground">
								No hay días bloqueados. Usalo para feriados o cierres.
							</p>
						) : (
							<div className="space-y-1">
								{blockedDates.map((blocked) => (
									<div
										key={blocked.id}
										className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
									>
										<span className="text-sm text-foreground">{formatCreatedAt(blocked.date)}</span>
										<Button
											variant="ghost"
											size="icon"
											onClick={() => handleRemoveBlockedDate(blocked.id)}
											className="h-7 w-7 text-muted-foreground hover:text-destructive"
											aria-label="Desbloquear"
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								))}
							</div>
						)}
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
						Cancelar
					</Button>
					<Button onClick={handleSave} disabled={isSaving}>
						{isSaving ? 'Guardando...' : 'Guardar'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
