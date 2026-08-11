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
import {
	AttendanceEntryWithDate,
	updateAttendanceEntry,
} from '@/lib/attendance/attendance-entries';
import { translateError } from '@/lib/error-translator';
import { toast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCreatedAt } from '@/utils/format-date';
import { ENTRY_TYPES } from '@/constants/attendance/attendance';

interface AttendanceEntryModalProps {
	entry: AttendanceEntryWithDate | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onUpdate: () => void;
}

export function AttendanceEntryModal({
	entry,
	open,
	onOpenChange,
	onUpdate,
}: AttendanceEntryModalProps) {
	const [loading, setLoading] = useState(false);
	const [description, setDescription] = useState<string>(entry?.description || '');
	const [entryType, setEntryType] = useState<string>(entry?.type || 'regular_in');
	const [entryTime, setEntryTime] = useState<string>(
		entry?.entry_time ? format(new Date(entry.entry_time), 'HH:mm', { locale: es }) : ''
	);

	// Reset form when entry changes
	useEffect(() => {
		if (entry) {
			setEntryType(entry.type);
			setEntryTime(format(new Date(entry.entry_time), 'HH:mm', { locale: es }));
			setDescription(entry.description || '');
		}
	}, [entry]);

	const handleSave = async () => {
		if (!entry) return;

		// Validate time format
		if (!entryTime || !/^\d{2}:\d{2}$/.test(entryTime)) {
			toast({
				title: 'Error de validación',
				description: translateError('La hora debe tener formato HH:MM'),
				variant: 'destructive',
			});
			return;
		}

		setLoading(true);
		try {
			// Parse time
			const [hours, minutes] = entryTime.split(':').map(Number);
			const date = new Date(entry.entry_time);
			date.setHours(hours, minutes, 0, 0);

			const { error } = await updateAttendanceEntry(entry.id, {
				type: entryType,
				entry_time: date.toISOString(),
				description: description || null,
			});

			if (error) {
				toast({
					title: 'Error al actualizar registro',
					description: translateError(error) || 'No se pudo actualizar el registro',
					variant: 'destructive',
				});
			} else {
				toast({
					title: 'Registro actualizado',
					description: 'El registro de asistencia se actualizó correctamente',
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

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>Editar Registro de Asistencia</DialogTitle>
					<DialogDescription>
						Modifica los detalles del registro de asistencia. Los cambios se guardarán
						inmediatamente.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-4">
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
						<Label htmlFor="entry-time">Hora</Label>
						<Input
							id="entry-time"
							type="time"
							value={entryTime}
							onChange={(e) => setEntryTime(e.target.value)}
						/>
					</div>

					{entry && (
						<div className="text-sm text-gray-500">
							<p>Fecha: {formatCreatedAt(entry.attendance_date)}</p>
							<p>Empleado: {entry.user_name || 'Desconocido'}</p>
						</div>
					)}

					{entry && (
						<div className="space-y-2">
							<Label htmlFor="description">Descripción</Label>
							<Input
								id="description"
								type="text"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
							/>
						</div>
					)}
				</div>
				<DialogFooter>
					<Button onClick={handleSave} disabled={loading} className="w-full">
						{loading ? 'Guardando...' : 'Guardar'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
