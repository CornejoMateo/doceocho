'use client';

import React, { useEffect, useState } from 'react';
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
import { DatePicker } from '@/components/ui/date-picker';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/components/provider/auth-provider';
import { translateError } from '@/lib/error-translator';
import { createVacationRequest } from '@/lib/human-resources/vacation-requests';
import { countVacationDays } from '@/helpers/human-resources/vacations';
import { notifyVacationEvent } from '@/lib/human-resources/vacation-notifications';

interface VacationRequestDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreated: () => void;
}

export function VacationRequestDialog({
	open,
	onOpenChange,
	onCreated,
}: VacationRequestDialogProps) {
	const { toast } = useToast();
	const { user } = useAuth();
	const [startDate, setStartDate] = useState('');
	const [endDate, setEndDate] = useState('');
	const [reason, setReason] = useState('');
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		if (open) return;

		setStartDate('');
		setEndDate('');
		setReason('');
	}, [open]);

	const totalDays = startDate && endDate ? countVacationDays(startDate, endDate) : 0;

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();

		if (!startDate || !endDate) {
			toast({
				variant: 'destructive',
				title: 'Faltan fechas',
				description: 'Elegí la fecha de inicio y la de fin.',
			});
			return;
		}

		if (endDate < startDate) {
			toast({
				variant: 'destructive',
				title: 'Fechas inválidas',
				description: 'La fecha de fin no puede ser anterior a la de inicio.',
			});
			return;
		}

		if (!user?.uid) {
			toast({
				variant: 'destructive',
				title: 'Sesión inválida',
				description: 'Volvé a iniciar sesión para pedir vacaciones.',
			});
			return;
		}

		setIsSaving(true);

		try {
			const { data, error } = await createVacationRequest(user.uid, {
				start_date: startDate,
				end_date: endDate,
				reason: reason.trim() || null,
			});

			if (error) {
				toast({
					variant: 'destructive',
					title: 'Error al enviar el pedido',
					description: translateError(error),
				});
				return;
			}

			toast({
				title: 'Pedido enviado',
				description: 'Los administradores fueron notificados.',
			});

			onOpenChange(false);
			onCreated();

			if (data) {
				// The request is already saved, a failed push should not break the flow.
				await notifyVacationEvent(data.id, 'created');
			}
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="w-[95vw] max-w-lg max-h-[95dvh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Pedir vacaciones</DialogTitle>
					<DialogDescription>
						Elegí el período que querés tomarte. Un administrador lo va a revisar.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="grid gap-2">
							<Label htmlFor="vacation-start">Desde</Label>
							<DatePicker
								id="vacation-start"
								value={startDate}
								onChange={setStartDate}
								placeholder="Fecha de inicio"
								disabled={isSaving}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="vacation-end">Hasta</Label>
							<DatePicker
								id="vacation-end"
								value={endDate}
								onChange={setEndDate}
								placeholder="Fecha de fin"
								disabled={isSaving}
								fromDate={startDate ? new Date(`${startDate}T00:00:00`) : undefined}
							/>
						</div>
					</div>

					{totalDays > 0 && (
						<p className="text-sm text-muted-foreground">
							Estás pidiendo {totalDays} {totalDays === 1 ? 'día' : 'días'}.
						</p>
					)}

					<div className="grid gap-2">
						<Label htmlFor="vacation-reason">Motivo (opcional)</Label>
						<Textarea
							id="vacation-reason"
							value={reason}
							onChange={(event) => setReason(event.target.value)}
							placeholder="Contanos el motivo si querés..."
							rows={3}
							disabled={isSaving}
						/>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isSaving}
						>
							Cancelar
						</Button>
						<Button type="submit" disabled={isSaving}>
							{isSaving ? 'Enviando...' : 'Enviar pedido'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
