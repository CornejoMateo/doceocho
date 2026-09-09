'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarDays, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
	PublicAppointmentStatus,
	fetchAppointmentStatus,
} from '@/lib/appointments/public-appointments';
import { APPOINTMENT_STATUS_VARIANTS } from '@/constants/appointments/appointments';
import { parseDateOnly } from '@/helpers/appointments/availability';

const STATUS_MESSAGES: Record<string, string> = {
	Pendiente: 'Todavía la estamos revisando. Te avisamos por email en cuanto la confirmemos.',
	Aceptada: '¡Te esperamos! Si necesitás reprogramarla, escribinos.',
	Rechazada: 'No pudimos tomar esta cita. Podés solicitar otro horario cuando quieras.',
	Cancelada: 'Esta cita fue cancelada.',
};

export function AppointmentStatus({ token }: { token: string }) {
	const [appointment, setAppointment] = useState<PublicAppointmentStatus | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let isActive = true;

		fetchAppointmentStatus(token).then(({ data, error: fetchError }) => {
			if (!isActive) return;

			setAppointment(data);
			setError(fetchError);
			setLoading(false);
		});

		return () => {
			isActive = false;
		};
	}, [token]);

	if (loading) {
		return (
			<div className="flex items-center justify-center py-24">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (error || !appointment) {
		return (
			<Card className="p-6 sm:p-8 text-center space-y-2">
				<CalendarDays className="h-10 w-10 text-muted-foreground mx-auto" />
				<h2 className="text-lg font-semibold text-foreground">No encontramos esa cita</h2>
				<p className="text-sm text-muted-foreground">
					Revisá que el enlace esté completo o volvé a solicitar un turno.
				</p>
			</Card>
		);
	}

	return (
		<Card className="p-6 sm:p-8 space-y-4">
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="text-sm text-muted-foreground">Hola {appointment.clientName}</p>
					<h2 className="text-xl font-semibold text-foreground capitalize">
						{format(parseDateOnly(appointment.date), "EEEE d 'de' MMMM", { locale: es })}
					</h2>
					<p className="text-sm text-muted-foreground">
						De {appointment.startTime} a {appointment.endTime}
					</p>
				</div>
				<Badge variant={APPOINTMENT_STATUS_VARIANTS[appointment.status]}>
					{appointment.status}
				</Badge>
			</div>

			<p className="text-sm text-muted-foreground">{STATUS_MESSAGES[appointment.status]}</p>

			{appointment.adminNotes && (
				<div className="rounded-lg border border-border bg-secondary/40 p-3">
					<p className="text-xs text-muted-foreground mb-1">Nota del equipo</p>
					<p className="text-sm text-foreground whitespace-pre-wrap">{appointment.adminNotes}</p>
				</div>
			)}

			{appointment.notes && (
				<div className="rounded-lg border border-border p-3">
					<p className="text-xs text-muted-foreground mb-1">Lo que nos contaste</p>
					<p className="text-sm text-foreground whitespace-pre-wrap">{appointment.notes}</p>
				</div>
			)}
		</Card>
	);
}
