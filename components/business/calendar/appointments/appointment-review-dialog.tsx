'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Check, Mail, Phone, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/components/provider/auth-provider';
import { translateError } from '@/lib/error-translator';
import { Appointment, resolveAppointment } from '@/lib/appointments/appointments';
import { createEvent } from '@/lib/calendar/events';
import { parseDateOnly } from '@/helpers/appointments/availability';
import { EmailLink } from '@/components/ui/email-link';
import { WhatsAppLink } from '@/components/ui/whatsapp-link';

interface AppointmentReviewDialogProps {
	appointment: Appointment | null;
	/** Event type configured for appointments, used when accepting. */
	eventTypeId: number | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onResolved: () => void;
}

export function AppointmentReviewDialog({
	appointment,
	eventTypeId,
	open,
	onOpenChange,
	onResolved,
}: AppointmentReviewDialogProps) {
	const { toast } = useToast();
	const { user } = useAuth();
	const [adminNotes, setAdminNotes] = useState('');
	const [pendingStatus, setPendingStatus] = useState<'Aceptada' | 'Rechazada' | null>(null);

	useEffect(() => {
		if (!open) return;

		setAdminNotes(appointment?.admin_notes ?? '');
		setPendingStatus(null);
	}, [open, appointment]);

	if (!appointment) return null;

	const startTime = appointment.start_time.slice(0, 5);
	const endTime = appointment.end_time.slice(0, 5);

	const handleResolve = async (status: 'Aceptada' | 'Rechazada') => {
		if (!user?.uid) return;

		setPendingStatus(status);

		try {
			let eventId: number | null = appointment.event_id;

			// An accepted appointment shows up in the shared calendar.
			if (status === 'Aceptada' && !eventId) {
				const { data: event, error: eventError } = await createEvent({
					title: `Cita: ${appointment.client_name}`,
					date: appointment.date,
					time: startTime,
					description: appointment.notes,
					type_id: eventTypeId,
					client_name: appointment.client_name,
					remember: false,
				});

				if (eventError) {
					// Losing the calendar entry should not block the decision.
					console.error('[appointments] Failed to create the calendar event:', eventError);
				}

				eventId = event?.id ?? null;
			}

			const { error } = await resolveAppointment(
				appointment.id,
				status,
				user.uid,
				adminNotes.trim() || null,
				eventId
			);

			if (error) {
				toast({
					variant: 'destructive',
					title: 'Error al resolver la cita',
					description: translateError(error),
				});
				return;
			}

			onOpenChange(false);
			onResolved();

			// The appointment is saved; the email is best effort.
			const response = await fetch('/api/appointments/notify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ appointmentId: appointment.id }),
			}).catch(() => null);

			const emailSent = response?.ok ? (await response.json())?.success : false;

			toast({
				title: status === 'Aceptada' ? 'Cita aceptada' : 'Cita rechazada',
				description: emailSent
					? `Se le envió un email a ${appointment.client_email}.`
					: `No se pudo enviar el email a ${appointment.client_email}. Avisale por otro medio.`,
				variant: emailSent ? undefined : 'destructive',
			});
		} finally {
			setPendingStatus(null);
		}
	};

	const isBusy = pendingStatus !== null;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="w-[95vw] max-w-lg max-h-[95dvh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{appointment.client_name}</DialogTitle>
					<DialogDescription>
						{format(parseDateOnly(appointment.date), "EEEE d 'de' MMMM", { locale: es })} ·{' '}
						{startTime} a {endTime}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-2">
						<div className="flex items-center gap-2 text-sm">
							<Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
							<EmailLink email={appointment.client_email} className="hover:underline">
								{appointment.client_email}
							</EmailLink>
						</div>
						{appointment.client_phone && (
							<div className="flex items-center gap-2 text-sm">
								<Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
								<WhatsAppLink
									phone={appointment.client_phone}
									className="hover:underline"
									message={`Hola ${appointment.client_name}`}
								>
									{appointment.client_phone}
								</WhatsAppLink>
							</div>
						)}
					</div>

					{appointment.notes && (
						<div className="rounded-lg border border-border p-3">
							<p className="text-xs text-muted-foreground mb-1">Comentarios del cliente</p>
							<p className="text-sm text-foreground whitespace-pre-wrap">{appointment.notes}</p>
						</div>
					)}

					<div className="grid gap-2">
						<Label htmlFor="appointment-admin-notes">Observaciones (opcional)</Label>
						<Textarea
							id="appointment-admin-notes"
							value={adminNotes}
							onChange={(event) => setAdminNotes(event.target.value)}
							placeholder="Se incluyen en el email que recibe el cliente..."
							rows={3}
							disabled={isBusy}
						/>
					</div>
				</div>

				<DialogFooter className="gap-2">
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isBusy}
					>
						Cerrar
					</Button>
					<Button
						type="button"
						variant="destructive"
						onClick={() => handleResolve('Rechazada')}
						disabled={isBusy}
						className="gap-2"
					>
						<X className="h-4 w-4" />
						{pendingStatus === 'Rechazada' ? 'Rechazando...' : 'Rechazar'}
					</Button>
					<Button
						type="button"
						onClick={() => handleResolve('Aceptada')}
						disabled={isBusy}
						className="gap-2"
					>
						<Check className="h-4 w-4" />
						{pendingStatus === 'Aceptada' ? 'Aceptando...' : 'Aceptar'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
