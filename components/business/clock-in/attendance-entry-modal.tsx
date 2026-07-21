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
import { AttendanceEntryWithDate, getEntryTypeLabel } from '@/lib/attendance/attendance';
import { translateError } from '@/lib/error-translator';
import { updateAttendanceEntry, deleteAttendanceEntry } from '@/lib/attendance/attendance';
import { toast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCreatedAt } from '@/utils/format-date';

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
	const [deleteLoading, setDeleteLoading] = useState(false);
	const [entryType, setEntryType] = useState<string>(entry?.type || 'regular_in');
	const [entryTime, setEntryTime] = useState<string>(
		entry?.entry_time ? format(new Date(entry.entry_time), 'HH:mm', { locale: es }) : ''
	);

	// Reset form when entry changes
	useEffect(() => {
		if (entry) {
			setEntryType(entry.type);
			setEntryTime(format(new Date(entry.entry_time), 'HH:mm', { locale: es }));
		}
	}, [entry]);

	const handleSave = async () => {
		if (!entry) return;

		// Validate time format
		if (!entryTime || !/^\d{2}:\d{2}$/.test(entryTime)) {
			toast({
				title: 'Error de validación',
				description: 'La hora debe tener formato HH:MM',
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
				description: 'Error al procesar la solicitud',
				variant: 'destructive',
			});
		}
		setLoading(false);
	};

	const handleDelete = async () => {
		if (!entry) return;

		if (
			!confirm(
				'¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.'
			)
		) {
			return;
		}

		setDeleteLoading(true);
		try {
			const { error } = await deleteAttendanceEntry(entry.id);

			if (error) {
				toast({
					title: 'Error al eliminar registro',
					description: translateError(error) || 'No se pudo eliminar el registro',
					variant: 'destructive',
				});
			} else {
				toast({
					title: 'Registro eliminado',
					description: 'El registro de asistencia se eliminó correctamente',
				});
				onOpenChange(false);
				onUpdate();
			}
		} catch (error) {
			toast({
				title: 'Error',
				description: 'Error al procesar la solicitud',
				variant: 'destructive',
			});
		}
		setDeleteLoading(false);
	};

	const handleReset = () => {
		if (!entry) return;
		setEntryType(entry.type);
		setEntryTime(format(new Date(entry.entry_time), 'HH:mm', { locale: es }));
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
								<SelectItem value="regular_in">{getEntryTypeLabel('regular_in')}</SelectItem>
								<SelectItem value="regular_out">{getEntryTypeLabel('regular_out')}</SelectItem>
								<SelectItem value="overtime_in">{getEntryTypeLabel('overtime_in')}</SelectItem>
								<SelectItem value="overtime_out">{getEntryTypeLabel('overtime_out')}</SelectItem>
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
				</div>
				<DialogFooter className="flex flex-col sm:flex-row gap-2">
					<Button
						variant="destructive"
						onClick={handleDelete}
						disabled={deleteLoading || loading}
						className="w-full sm:w-auto"
					>
						{deleteLoading ? 'Eliminando...' : 'Eliminar'}
					</Button>
					<div className="flex gap-2 w-full sm:w-auto">
						<Button variant="outline" onClick={handleReset} disabled={loading} className="flex-1">
							Restaurar
						</Button>
						<Button onClick={handleSave} disabled={loading} className="flex-1">
							{loading ? 'Guardando...' : 'Guardar'}
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
