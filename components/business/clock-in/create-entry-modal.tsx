'use client';

import { useState, useEffect } from 'react';
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { createAdminAttendanceEntry } from '@/lib/attendance/attendance-entries';
import { ENTRY_TYPES } from '@/constants/attendance/attendance';
import { translateError } from '@/lib/error-translator';
import { toast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CreateEntryModalProps {
	userId: string | null;
	userName: string | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onUpdate: () => void;
}

export function CreateEntryModal({
	userId,
	userName,
	open,
	onOpenChange,
	onUpdate,
}: CreateEntryModalProps) {
	const [loading, setLoading] = useState(false);
	const [entryType, setEntryType] = useState<string>(ENTRY_TYPES[0].value);
	const [entryDate, setEntryDate] = useState<string>(new Date().toISOString().split('T')[0]);
	const [entryTime, setEntryTime] = useState<string>(format(new Date(), 'HH:mm', { locale: es }));

	const handleSave = async () => {
		if (!userId) {
			toast({
				title: 'Error',
				description: translateError('Usuario no autenticado'),
				variant: 'destructive',
			});
			return;
		}

		// Validate date and time
		if (!entryDate || !entryTime || !/^\d{2}:\d{2}$/.test(entryTime)) {
			toast({
				title: 'Error de validación',
				description: translateError('La fecha y hora son requeridas'),
				variant: 'destructive',
			});
			return;
		}

		setLoading(true);
		try {
			const [hours, minutes] = entryTime.split(':').map(Number);
			const [year, month, day] = entryDate.split('-').map(Number);
			const date = new Date(year, month - 1, day, hours, minutes, 0, 0);

			const { error } = await createAdminAttendanceEntry(
				userId,
				entryType as any,
				date.toISOString()
			);

			if (error) {
				toast({
					title: 'Error al crear registro',
					description: translateError(error) || 'No se pudo crear el registro',
					variant: 'destructive',
				});
			} else {
				toast({
					title: 'Registro creado',
					description: 'El registro de asistencia se creó correctamente',
				});
				onOpenChange(false);
				onUpdate();
			}
		} catch (error) {
			toast({
				title: 'Error',
				description: translateError(error) || 'Error al procesar la solicitud',
				variant: 'destructive',
			});
		}
		setLoading(false);
	};

	// Reset form when modal opens
	useEffect(() => {
		if (open) {
			setEntryType(ENTRY_TYPES[0].value);
			setEntryDate(new Date().toISOString().split('T')[0]);
			setEntryTime(format(new Date(), 'HH:mm', { locale: es }));
		}
	}, [open]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>Crear Registro de Asistencia</DialogTitle>
					<DialogDescription>
						Crea manualmente un registro de asistencia para corregir errores
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-4">
					{userName && (
						<div className="text-sm text-gray-500">
							<p>Empleado: {userName}</p>
						</div>
					)}
					<div className="space-y-2">
						<Label htmlFor="entry-type">Tipo de Registro</Label>
						<Select value={entryType} onValueChange={setEntryType}>
							<SelectTrigger id="entry-type">
								<SelectValue placeholder="Selecciona tipo" />
							</SelectTrigger>
							<SelectContent>
								{ENTRY_TYPES.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label htmlFor="entry-date">Fecha</Label>
						<Input
							id="entry-date"
							type="date"
							value={entryDate}
							onChange={(e) => setEntryDate(e.target.value)}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="entry-time">Hora</Label>
						<Input
							id="entry-time"
							type="time"
							value={entryTime}
							onChange={(e) => setEntryTime(e.target.value)}
						/>
					</div>
				</div>
				<DialogFooter>
					<Button onClick={handleSave} disabled={loading} className="w-full">
						{loading ? 'Guardando...' : 'Crear'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
