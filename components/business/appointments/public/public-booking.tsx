'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarDays, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
	AvailabilityDay,
	PublicAvailability,
	fetchAvailability,
	requestAppointment,
} from '@/lib/appointments/public-appointments';
import { parseDateOnly } from '@/helpers/appointments/availability';

function formatDayLabel(date: string): string {
	const dayName = format(parseDateOnly(date), "EEEE", { locale: es });
	const rest = format(parseDateOnly(date), "d 'de' MMMM", { locale: es });
	return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${rest}`;
}

export function PublicBooking() {
	const [availability, setAvailability] = useState<PublicAvailability | null>(null);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState<string | null>(null);

	const [selectedDate, setSelectedDate] = useState('');
	const [selectedSlot, setSelectedSlot] = useState('');
	const [clientName, setClientName] = useState('');
	const [clientEmail, setClientEmail] = useState('');
	const [clientPhone, setClientPhone] = useState('');
	const [notes, setNotes] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);
	const [confirmationToken, setConfirmationToken] = useState<string | null>(null);

	useEffect(() => {
		let isActive = true;

		fetchAvailability().then(({ data, error }) => {
			if (!isActive) return;

			setAvailability(data);
			setLoadError(error);
			setLoading(false);

			if (data?.days.length) {
				setSelectedDate(data.days[0].date);
			}
		});

		return () => {
			isActive = false;
		};
	}, []);

	const selectedDay: AvailabilityDay | undefined = useMemo(
		() => availability?.days.find((day) => day.date === selectedDate),
		[availability, selectedDate]
	);

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		setFormError(null);

		if (!clientName.trim() || !clientEmail.trim()) {
			setFormError('Necesitamos tu nombre y tu email para confirmarte la cita.');
			return;
		}

		if (!selectedDate || !selectedSlot) {
			setFormError('Elegí un día y un horario.');
			return;
		}

		setIsSubmitting(true);

		const { token, error } = await requestAppointment({
			clientName: clientName.trim(),
			clientEmail: clientEmail.trim(),
			clientPhone: clientPhone.trim() || undefined,
			date: selectedDate,
			startTime: selectedSlot,
			notes: notes.trim() || undefined,
		});

		setIsSubmitting(false);

		if (error || !token) {
			setFormError(error ?? 'No pudimos registrar tu cita.');
			return;
		}

		setConfirmationToken(token);
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center py-24">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (confirmationToken) {
		return (
			<Card className="p-6 sm:p-8 text-center space-y-4">
				<CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
				<div className="space-y-2">
					<h2 className="text-xl font-semibold text-foreground">¡Recibimos tu solicitud!</h2>
					<p className="text-sm text-muted-foreground">
						Te vamos a escribir a <strong>{clientEmail}</strong> cuando la confirmemos.
					</p>
				</div>
				<div className="rounded-lg border border-border p-4 text-left space-y-1">
					<p className="text-sm text-foreground">
						{formatDayLabel(selectedDate)} a las {selectedSlot}
					</p>
					<p className="text-xs text-muted-foreground">
						Guardá este enlace para ver el estado de tu cita cuando quieras:
					</p>
					<a
						href={`/citas/estado/${confirmationToken}`}
						className="text-sm text-primary hover:underline break-all"
					>
						/citas/estado/{confirmationToken}
					</a>
				</div>
			</Card>
		);
	}

	if (loadError || !availability || availability.days.length === 0) {
		return (
			<Card className="p-6 sm:p-8 text-center space-y-2">
				<CalendarDays className="h-10 w-10 text-muted-foreground mx-auto" />
				<h2 className="text-lg font-semibold text-foreground">No hay horarios disponibles</h2>
				<p className="text-sm text-muted-foreground">
					{loadError ?? 'Por el momento no estamos tomando citas. Probá de nuevo más adelante.'}
				</p>
			</Card>
		);
	}

	return (
		<div className="space-y-6">
			<Card className="p-4 sm:p-6">
				<h2 className="font-semibold text-foreground mb-1">Elegí un día</h2>
				<p className="text-sm text-muted-foreground mb-4">
					Estos son los días con horarios libres.
				</p>

				<div className="flex gap-2 overflow-x-auto pb-2">
					{availability.days.map((day) => {
						const isSelected = day.date === selectedDate;
						const freeSlots = day.slots.filter((slot) => slot.available).length;

						return (
							<button
								key={day.date}
								type="button"
								onClick={() => {
									setSelectedDate(day.date);
									setSelectedSlot('');
								}}
								className={cn(
									'flex min-w-[104px] flex-col items-center rounded-lg border p-3 transition-colors',
									isSelected
										? 'border-primary bg-primary/10'
										: 'border-border hover:border-primary/50'
								)}
							>
								<span className="text-xs uppercase text-muted-foreground">
									{format(parseDateOnly(day.date), 'EEE', { locale: es })}
								</span>
								<span className="text-lg font-semibold text-foreground">
									{format(parseDateOnly(day.date), 'd')}
								</span>
								<span className="text-xs text-muted-foreground">
									{format(parseDateOnly(day.date), 'MMM', { locale: es })}
								</span>
								<span className="mt-1 text-[11px] text-muted-foreground">
									{freeSlots} {freeSlots === 1 ? 'libre' : 'libres'}
								</span>
							</button>
						);
					})}
				</div>
			</Card>

			<Card className="p-4 sm:p-6">
				<h2 className="font-semibold text-foreground mb-1">Elegí un horario</h2>
				<p className="text-sm text-muted-foreground mb-4 capitalize">
					{selectedDate ? formatDayLabel(selectedDate) : ''}
				</p>

				<div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
					{selectedDay?.slots.map((slot) => (
						<button
							key={slot.start}
							type="button"
							disabled={!slot.available}
							onClick={() => setSelectedSlot(slot.start)}
							className={cn(
								'flex items-center justify-center gap-1 rounded-lg border px-2 py-2 text-sm transition-colors',
								!slot.available && 'cursor-not-allowed border-border bg-muted text-muted-foreground/50 line-through',
								slot.available && selectedSlot === slot.start && 'border-primary bg-primary/10 text-foreground',
								slot.available &&
									selectedSlot !== slot.start &&
									'border-border text-foreground hover:border-primary/50'
							)}
						>
							<Clock className="h-3 w-3" />
							{slot.start}
						</button>
					))}
				</div>

				{selectedDay && selectedDay.slots.every((slot) => !slot.available) && (
					<p className="text-sm text-muted-foreground mt-4">
						No quedan horarios libres este día. Probá con otro.
					</p>
				)}
			</Card>

			<Card className="p-4 sm:p-6">
				<h2 className="font-semibold text-foreground mb-4">Tus datos</h2>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="grid gap-2">
							<Label htmlFor="booking-name">Nombre y apellido *</Label>
							<Input
								id="booking-name"
								value={clientName}
								onChange={(event) => setClientName(event.target.value)}
								disabled={isSubmitting}
								maxLength={120}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="booking-email">Email *</Label>
							<Input
								id="booking-email"
								type="email"
								value={clientEmail}
								onChange={(event) => setClientEmail(event.target.value)}
								disabled={isSubmitting}
							/>
						</div>
						<div className="grid gap-2 sm:col-span-2">
							<Label htmlFor="booking-phone">Teléfono (opcional)</Label>
							<Input
								id="booking-phone"
								value={clientPhone}
								onChange={(event) => setClientPhone(event.target.value)}
								disabled={isSubmitting}
							/>
						</div>
					</div>

					<div className="grid gap-2">
						<Label htmlFor="booking-notes">Comentarios (opcional)</Label>
						<Textarea
							id="booking-notes"
							value={notes}
							onChange={(event) => setNotes(event.target.value)}
							placeholder="Contanos si es presencial, en qué lugar, el motivo de la cita..."
							rows={4}
							maxLength={1000}
							disabled={isSubmitting}
						/>
					</div>

					{formError && <p className="text-sm text-destructive">{formError}</p>}

					<Button type="submit" className="w-full" disabled={isSubmitting || !selectedSlot}>
						{isSubmitting ? 'Enviando...' : 'Solicitar cita'}
					</Button>
					<p className="text-xs text-muted-foreground text-center">
						Te confirmamos por email. Tu solicitud queda pendiente hasta que la revisemos.
					</p>
				</form>
			</Card>
		</div>
	);
}
