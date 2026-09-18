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
	createAdminAttendanceEntry,
	updateAttendanceEntry,
} from '@/lib/attendance/attendance-entries';
import { translateError } from '@/lib/error-translator';
import { toast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { es } from 'date-fns/locale';
import { formatCreatedAt } from '@/utils/format-date';
import { getLocalDate } from '@/utils/format-date';
import { ENTRY_TYPES } from '@/constants/attendance/attendance';
import { User } from '@/lib/users/users';

const ARGENTINA_TIME_ZONE = 'America/Argentina/Buenos_Aires';

interface AttendanceEntryModalProps {
	entry: AttendanceEntryWithDate | null;
	userId?: string | null;
	userName?: string | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onUpdate: () => void;
	showUserSelect?: boolean;
	users?: User[];
}

export function AttendanceEntryModal({
	entry,
	userId,
	userName,
	open,
	onOpenChange,
	onUpdate,
	showUserSelect = false,
	users = [],
}: AttendanceEntryModalProps) {
	const isEditing = !!entry;

	const [loading, setLoading] = useState(false);
	const [entryType, setEntryType] = useState<string>(ENTRY_TYPES[0].value);
	const [entryDate, setEntryDate] = useState<string>(getLocalDate());
	const [entryTime, setEntryTime] = useState<string>(format(new Date(), 'HH:mm', { locale: es }));
	const [description, setDescription] = useState<string>('');
	const [selectedUserId, setSelectedUserId] = useState<string>(userId || '');
	const [isDirty, setIsDirty] = useState(false);
	const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);

	// Reset form when the modal opens
	useEffect(() => {
		if (open) {
			setIsDirty(false);
			if (entry) {
				setEntryType(entry.type);
				setEntryTime(
					format(toZonedTime(new Date(entry.entry_time), ARGENTINA_TIME_ZONE), 'HH:mm', {
						locale: es,
					})
				);
				setEntryDate(entry.attendance_date);
				setDescription(entry.description || '');
			} else {
				setSelectedUserId('');
				setEntryType(ENTRY_TYPES[0].value);
				setEntryTime(format(new Date(), 'HH:mm', { locale: es }));
				setEntryDate(getLocalDate());
				setDescription('');
			}
		}
	}, [open, entry]);

	const handleClose = () => {
		if (isDirty) {
			setConfirmCloseOpen(true);
		} else {
			onOpenChange(false);
		}
	};

	const markDirty = () => {
		if (!isDirty) setIsDirty(true);
	};

	const handleConfirmClose = () => {
		setConfirmCloseOpen(false);
		onOpenChange(false);
	};

	const handleSave = async () => {
		const targetUserId = showUserSelect ? selectedUserId : entry?.user_id || userId;
		if (!targetUserId) {
			toast({
				title: 'Error',
				description: showUserSelect
					? 'Debes seleccionar un empleado'
					: 'No se seleccionó ningún usuario',
				variant: 'destructive',
			});
			return;
		}

		// Validate date and time
		if (!entryTime || !/^\d{2}:\d{2}$/.test(entryTime)) {
			toast({
				title: 'Error de validación',
				description: 'La hora debe tener formato HH:MM',
				variant: 'destructive',
			});
			return;
		}

		if (!isEditing && !entryDate) {
			toast({
				title: 'Error de validación',
				description: 'La fecha y hora son requeridas',
				variant: 'destructive',
			});
			return;
		}

		setLoading(true);
		try {
			const [hours, minutes] = entryTime.split(':').map(Number);

			let entryTimeISO: string;
			if (isEditing && entry) {
				const date = new Date(entry.entry_time);
				date.setHours(hours, minutes, 0, 0);
				entryTimeISO = date.toISOString();
			} else {
				const [year, month, day] = entryDate.split('-').map(Number);
				const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
				entryTimeISO = date.toISOString();
			}

			const { error } = isEditing
				? await updateAttendanceEntry(entry!.id, {
						type: entryType,
						entry_time: entryTimeISO,
						description: description || null,
					})
				: await createAdminAttendanceEntry(
						targetUserId,
						entryType as 'regular_in' | 'regular_out' | 'overtime_in' | 'overtime_out',
						entryTimeISO,
						description || null
					);

			if (error) {
				toast({
					title: isEditing ? 'Error al actualizar registro' : 'Error al crear registro',
					description: translateError(error),
					variant: 'destructive',
				});
				return;
			} else {
				toast({
					title: isEditing ? 'Registro actualizado' : 'Registro creado',
					description: isEditing
						? 'El registro de asistencia se actualizó correctamente'
						: 'El registro de asistencia se creó correctamente',
				});
				setIsDirty(false);
				onOpenChange(false);
				onUpdate();
			}
		} catch (error) {
			toast({
				title: 'Error',
				description: translateError(error) || 'Error al procesar la solicitud',
				variant: 'destructive',
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<>
			<Dialog open={open} onOpenChange={handleClose}>
				<DialogContent showCloseButton={false} className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>
							{isEditing ? 'Editar Registro de Asistencia' : 'Crear Registro de Asistencia'}
						</DialogTitle>
						<DialogDescription>
							{isEditing
								? 'Modifica los detalles del registro de asistencia. Los cambios se guardarán inmediatamente.'
								: 'Crea manualmente un registro de asistencia para corregir errores'}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						{showUserSelect && !isEditing ? (
							<div className="space-y-2">
								<Label htmlFor="user-select">Empleado</Label>

								<Select
									value={selectedUserId}
									onValueChange={(v) => {
										setSelectedUserId(v);
										markDirty();
									}}
								>
									<SelectTrigger id="user-select">
										<SelectValue placeholder="Selecciona un empleado" />
									</SelectTrigger>
									<SelectContent>
										{users.map(
											(user) =>
												user.role === 'Taller' && (
													<SelectItem key={user.uid_user} value={user.uid_user}>
														{user.name && user.last_name
															? `${user.name} ${user.last_name}`
															: user.username}
													</SelectItem>
												)
										)}
									</SelectContent>
								</Select>
							</div>
						) : (
							(entry?.user_name || userName) && (
								<div className="text-sm text-muted-foreground">
									<p>Empleado: {entry?.user_name || userName}</p>
								</div>
							)
						)}
						<div className="space-y-2">
							<Label htmlFor="entry-type">Tipo de Registro</Label>
							<Select
								value={entryType}
								onValueChange={(v) => {
									setEntryType(v);
									markDirty();
								}}
							>
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

						{isEditing && entry ? (
							<div className="text-sm text-muted-foreground">
								<p>Fecha: {formatCreatedAt(entry.attendance_date)}</p>
							</div>
						) : (
							<div className="space-y-2">
								<Label htmlFor="entry-date">Fecha</Label>
								<Input
									id="entry-date"
									type="date"
									value={entryDate}
									onChange={(e) => {
										setEntryDate(e.target.value);
										markDirty();
									}}
								/>
							</div>
						)}

						<div className="space-y-2">
							<Label htmlFor="entry-time">Hora</Label>
							<Input
								id="entry-time"
								type="time"
								value={entryTime}
								onChange={(e) => {
									setEntryTime(e.target.value);
									markDirty();
								}}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="entry-description">Descripción (opcional)</Label>
							<Input
								id="entry-description"
								type="text"
								value={description}
								onChange={(e) => {
									setDescription(e.target.value);
									markDirty();
								}}
							/>
						</div>
					</div>
					<DialogFooter>
						<div className="flex gap-2 w-full justify-end">
							<Button type="button" variant="outline" onClick={handleClose}>
								Cancelar
							</Button>
							<Button type="button" onClick={handleSave} disabled={loading}>
								{loading ? 'Guardando...' : isEditing ? 'Guardar' : 'Crear'}
							</Button>
						</div>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<Dialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
				<DialogContent className="sm:max-w-[400px]">
					<DialogHeader>
						<DialogTitle>Cambios sin guardar</DialogTitle>
						<DialogDescription>
							Tenés cambios sin guardar. Si cerrás, se perderán los cambios.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<div className="flex gap-2 w-full justify-end">
							<Button type="button" variant="outline" onClick={() => setConfirmCloseOpen(false)}>
								Cancelar
							</Button>
							<Button type="button" variant="destructive" onClick={handleConfirmClose}>
								Cerrar sin guardar
							</Button>
						</div>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
