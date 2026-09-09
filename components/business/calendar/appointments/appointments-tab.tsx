'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { CalendarClock, CheckCircle2, Clock, Copy, Settings } from 'lucide-react';
import { useOptimizedRealtime } from '@/hooks/use-optimized-realtime';
import { toast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';
import { Appointment, listAppointments } from '@/lib/appointments/appointments';
import {
	AppointmentSettings,
	getAppointmentSettings,
} from '@/lib/appointments/appointment-settings';
import { EventType, listEventTypes } from '@/lib/calendar/event-types';
import {
	APPOINTMENTS_PER_PAGE,
	APPOINTMENT_STATUS_VARIANTS,
	PUBLIC_BOOKING_PATH,
} from '@/constants/appointments/appointments';
import { parseDateOnly } from '@/helpers/appointments/availability';
import { AppointmentReviewDialog } from '@/components/business/calendar/appointments/appointment-review-dialog';
import { AppointmentSettingsDialog } from '@/components/business/calendar/appointments/appointment-settings-dialog';

const STATUS_ORDER: Record<string, number> = {
	Pendiente: 0,
	Aceptada: 1,
	Rechazada: 2,
	Cancelada: 3,
};

export function AppointmentsTab() {
	const [settings, setSettings] = useState<AppointmentSettings | null>(null);
	const [eventTypes, setEventTypes] = useState<EventType[]>([]);
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	const [appointmentToReview, setAppointmentToReview] = useState<Appointment | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [publicUrl, setPublicUrl] = useState(PUBLIC_BOOKING_PATH);

	const {
		data: appointments,
		loading,
		error,
		refresh,
	} = useOptimizedRealtime<Appointment>(
		'appointments',
		async () => {
			const { data, error: listError } = await listAppointments();
			if (listError) throw listError;
			return data ?? [];
		},
		'appointments_cache'
	);

	const loadSettings = useCallback(async () => {
		const { data } = await getAppointmentSettings();
		setSettings(data);
	}, []);

	useEffect(() => {
		loadSettings();
		listEventTypes().then(({ data }) => setEventTypes(data ?? []));
		setPublicUrl(`${window.location.origin}${PUBLIC_BOOKING_PATH}`);
	}, [loadSettings]);

	const sortedAppointments = useMemo(
		() =>
			[...appointments].sort((a, b) => {
				if (STATUS_ORDER[a.status] !== STATUS_ORDER[b.status]) {
					return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
				}

				return `${b.date}${b.start_time}`.localeCompare(`${a.date}${a.start_time}`);
			}),
		[appointments]
	);

	const pendingCount = appointments.filter(
		(appointment) => appointment.status === 'Pendiente'
	).length;

	const acceptedCount = appointments.filter(
		(appointment) => appointment.status === 'Aceptada'
	).length;

	const paginatedAppointments = sortedAppointments.slice(
		(currentPage - 1) * APPOINTMENTS_PER_PAGE,
		currentPage * APPOINTMENTS_PER_PAGE
	);

	const totalPages = Math.ceil(sortedAppointments.length / APPOINTMENTS_PER_PAGE);

	const handleCopyLink = async () => {
		try {
			await navigator.clipboard.writeText(publicUrl);
			toast({
				title: 'Enlace copiado',
				description: 'Ya lo podés mandar a tus clientes.',
			});
		} catch {
			toast({
				variant: 'destructive',
				title: 'No se pudo copiar',
				description: 'Copialo a mano desde el campo de texto.',
			});
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div>
					<h3 className="text-xl font-bold text-foreground">Citas</h3>
					<p className="text-muted-foreground mt-1">
						Solicitudes de clientes desde el enlace público
					</p>
				</div>
				<Button variant="outline" onClick={() => setIsSettingsOpen(true)} className="gap-2">
					<Settings className="h-4 w-4" />
					Configuración
				</Button>
			</div>

			<Card className="p-4 bg-card border-border">
				<p className="text-sm font-medium text-foreground mb-1">Enlace para clientes</p>
				<p className="text-xs text-muted-foreground mb-3">
					Mandáselo a quien quiera pedir una cita. Solo ve los horarios libres y ocupados, ningún
					otro dato.
				</p>
				<div className="flex gap-2">
					<Input readOnly value={publicUrl} className="bg-background" />
					<Button variant="outline" onClick={handleCopyLink} className="gap-2 flex-shrink-0">
						<Copy className="h-4 w-4" />
						<span className="hidden sm:inline">Copiar</span>
					</Button>
				</div>
				{settings && !settings.is_public_enabled && (
					<p className="text-xs text-destructive mt-2">
						La solicitud de citas está desactivada. Activala desde Configuración.
					</p>
				)}
			</Card>

			<div className="grid gap-4 sm:grid-cols-2">
				<Card className="p-6 bg-card border-border">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-muted-foreground">Pendientes</p>
							<p className="text-2xl font-bold text-foreground mt-2">{pendingCount}</p>
						</div>
						<div className="rounded-lg bg-secondary p-3 text-chart-1">
							<Clock className="h-6 w-6" />
						</div>
					</div>
				</Card>
				<Card className="p-6 bg-card border-border">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-muted-foreground">Aceptadas</p>
							<p className="text-2xl font-bold text-foreground mt-2">{acceptedCount}</p>
						</div>
						<div className="rounded-lg bg-secondary p-3 text-chart-2">
							<CheckCircle2 className="h-6 w-6" />
						</div>
					</div>
				</Card>
			</div>

			<Card className="p-4 sm:p-6 bg-card border-border">
				<h4 className="font-semibold text-foreground mb-4">Solicitudes</h4>

				{loading && <p className="text-sm text-muted-foreground py-6 text-center">Cargando...</p>}
				{error && !loading && (
					<p className="text-sm text-destructive py-6 text-center">
						Error al cargar las citas: {translateError(error)}
					</p>
				)}
				{!loading && !error && sortedAppointments.length === 0 && (
					<div className="flex flex-col items-center py-10 text-center">
						<CalendarClock className="h-10 w-10 text-muted-foreground mb-3" />
						<p className="text-sm text-muted-foreground">Todavía no hay solicitudes de citas.</p>
					</div>
				)}

				{!loading && !error && paginatedAppointments.length > 0 && (
					<div className="space-y-2">
						{paginatedAppointments.map((appointment) => (
							<div
								key={appointment.id}
								className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
							>
								<div className="min-w-0 space-y-1">
									<p className="text-sm font-medium text-foreground truncate">
										{appointment.client_name}
									</p>
									<p className="text-sm text-muted-foreground capitalize">
										{format(parseDateOnly(appointment.date), "EEEE d 'de' MMMM", { locale: es })} ·{' '}
										{appointment.start_time.slice(0, 5)}
									</p>
									{appointment.notes && (
										<p className="text-xs text-muted-foreground break-words line-clamp-2">
											{appointment.notes}
										</p>
									)}
								</div>

								<div className="flex items-center gap-2 sm:justify-end flex-shrink-0">
									<Badge variant={APPOINTMENT_STATUS_VARIANTS[appointment.status]}>
										{appointment.status}
									</Badge>
									<Button
										variant="outline"
										size="sm"
										onClick={() => setAppointmentToReview(appointment)}
									>
										{appointment.status === 'Pendiente' ? 'Revisar' : 'Ver'}
									</Button>
								</div>
							</div>
						))}
					</div>
				)}

				{totalPages > 1 && (
					<div className="flex items-center justify-between pt-4">
						<Button
							variant="outline"
							size="sm"
							disabled={currentPage === 1}
							onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
						>
							Anterior
						</Button>
						<span className="text-sm text-muted-foreground">
							{currentPage} de {totalPages}
						</span>
						<Button
							variant="outline"
							size="sm"
							disabled={currentPage === totalPages}
							onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
						>
							Siguiente
						</Button>
					</div>
				)}
			</Card>

			<AppointmentReviewDialog
				appointment={appointmentToReview}
				eventTypeId={settings?.event_type_id ?? null}
				open={!!appointmentToReview}
				onOpenChange={(open) => !open && setAppointmentToReview(null)}
				onResolved={refresh}
			/>

			<AppointmentSettingsDialog
				settings={settings}
				eventTypes={eventTypes}
				open={isSettingsOpen}
				onOpenChange={setIsSettingsOpen}
				onSaved={loadSettings}
			/>
		</div>
	);
}
