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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';
import { EMPLOYEE_STATUSES, EmployeeStatus } from '@/constants/human-resources/employees';
import { Employee, createEmployee, updateEmployee } from '@/lib/human-resources/employees';
import { User } from '@/lib/users/users';

const NO_USER_VALUE = 'none';

const emptyForm = {
	name: '',
	last_name: '',
	identity_number: '',
	birth_date: '',
	phone_number: '',
	email: '',
	address: '',
	locality: '',
	position: '',
	hire_date: '',
	termination_date: '',
	status: 'Activo' as EmployeeStatus,
	emergency_contact_name: '',
	emergency_contact_phone: '',
	notes: '',
	user_id: NO_USER_VALUE,
};

type EmployeeFormValues = typeof emptyForm;

function toFormValues(employee: Employee): EmployeeFormValues {
	return {
		name: employee.name || '',
		last_name: employee.last_name || '',
		identity_number: employee.identity_number || '',
		birth_date: employee.birth_date || '',
		phone_number: employee.phone_number || '',
		email: employee.email || '',
		address: employee.address || '',
		locality: employee.locality || '',
		position: employee.position || '',
		hire_date: employee.hire_date || '',
		termination_date: employee.termination_date || '',
		status: employee.status || 'Activo',
		emergency_contact_name: employee.emergency_contact_name || '',
		emergency_contact_phone: employee.emergency_contact_phone || '',
		notes: employee.notes || '',
		user_id: employee.user_id || NO_USER_VALUE,
	};
}

interface EmployeeFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	employeeToEdit?: Employee | null;
	users: User[];
	/** Users already linked to another employee, so they are not offered twice. */
	linkedUserIds: string[];
	onSaved: () => void;
}

export function EmployeeFormDialog({
	open,
	onOpenChange,
	employeeToEdit,
	users,
	linkedUserIds,
	onSaved,
}: EmployeeFormDialogProps) {
	const { toast } = useToast();
	const [isLoading, setIsLoading] = useState(false);
	const [formData, setFormData] = useState<EmployeeFormValues>(emptyForm);

	const isEditing = Boolean(employeeToEdit);

	useEffect(() => {
		if (!open) return;

		setFormData(employeeToEdit ? toFormValues(employeeToEdit) : emptyForm);
	}, [open, employeeToEdit]);

	const availableUsers = users.filter(
		(user) =>
			Boolean(user.uid_user) &&
			(!linkedUserIds.includes(user.uid_user) || user.uid_user === employeeToEdit?.user_id)
	);

	const handleFieldChange = (field: keyof EmployeeFormValues, value: string) => {
		setFormData((previous) => ({ ...previous, [field]: value }));
	};

	// Picking a system user prefills the fields that already live in the users table.
	const handleUserChange = (value: string) => {
		const selectedUser = users.find((user) => user.uid_user === value);

		setFormData((previous) => ({
			...previous,
			user_id: value,
			name: selectedUser?.name || previous.name,
			last_name: selectedUser?.last_name || previous.last_name,
			email: selectedUser?.mail || previous.email,
		}));
	};

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();

		if (!formData.name.trim() || !formData.last_name.trim()) {
			toast({
				variant: 'destructive',
				title: 'Faltan datos',
				description: 'El nombre y el apellido son obligatorios.',
			});
			return;
		}

		setIsLoading(true);

		const payload = {
			name: formData.name.trim(),
			last_name: formData.last_name.trim(),
			identity_number: formData.identity_number.trim() || null,
			birth_date: formData.birth_date || null,
			phone_number: formData.phone_number.trim() || null,
			email: formData.email.trim() || null,
			address: formData.address.trim() || null,
			locality: formData.locality.trim() || null,
			position: formData.position.trim() || null,
			hire_date: formData.hire_date || null,
			termination_date: formData.termination_date || null,
			status: formData.status,
			emergency_contact_name: formData.emergency_contact_name.trim() || null,
			emergency_contact_phone: formData.emergency_contact_phone.trim() || null,
			notes: formData.notes.trim() || null,
			user_id: formData.user_id === NO_USER_VALUE ? null : formData.user_id,
		};

		try {
			const { error } = employeeToEdit
				? await updateEmployee(employeeToEdit.id, payload)
				: await createEmployee(payload);

			if (error) {
				toast({
					variant: 'destructive',
					title: isEditing ? 'Error al actualizar empleado' : 'Error al crear empleado',
					description: translateError(error),
				});
				return;
			}

			toast({
				title: isEditing ? 'Empleado actualizado' : 'Empleado creado',
				description: isEditing
					? 'Los datos del empleado se guardaron correctamente.'
					: 'El empleado se creó correctamente.',
			});

			onOpenChange(false);
			onSaved();
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="w-[95vw] max-w-2xl max-h-[95dvh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{isEditing ? 'Editar empleado' : 'Nuevo empleado'}</DialogTitle>
					<DialogDescription>
						Completá la información del empleado. Solo el nombre y el apellido son obligatorios.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-6">
					<div className="space-y-4">
						<h4 className="text-sm font-medium text-foreground">Datos personales</h4>
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="grid gap-2">
								<Label htmlFor="employee-name">Nombre *</Label>
								<Input
									id="employee-name"
									value={formData.name}
									onChange={(event) => handleFieldChange('name', event.target.value)}
									disabled={isLoading}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="employee-last-name">Apellido *</Label>
								<Input
									id="employee-last-name"
									value={formData.last_name}
									onChange={(event) => handleFieldChange('last_name', event.target.value)}
									disabled={isLoading}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="employee-identity-number">DNI</Label>
								<Input
									id="employee-identity-number"
									value={formData.identity_number}
									onChange={(event) => handleFieldChange('identity_number', event.target.value)}
									disabled={isLoading}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="employee-birth-date">Fecha de nacimiento</Label>
								<Input
									id="employee-birth-date"
									type="date"
									value={formData.birth_date}
									onChange={(event) => handleFieldChange('birth_date', event.target.value)}
									disabled={isLoading}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="employee-phone">Teléfono</Label>
								<Input
									id="employee-phone"
									value={formData.phone_number}
									onChange={(event) => handleFieldChange('phone_number', event.target.value)}
									disabled={isLoading}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="employee-email">Email</Label>
								<Input
									id="employee-email"
									type="email"
									value={formData.email}
									onChange={(event) => handleFieldChange('email', event.target.value)}
									disabled={isLoading}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="employee-address">Dirección</Label>
								<Input
									id="employee-address"
									value={formData.address}
									onChange={(event) => handleFieldChange('address', event.target.value)}
									disabled={isLoading}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="employee-locality">Localidad</Label>
								<Input
									id="employee-locality"
									value={formData.locality}
									onChange={(event) => handleFieldChange('locality', event.target.value)}
									disabled={isLoading}
								/>
							</div>
						</div>
					</div>

					<div className="space-y-4">
						<h4 className="text-sm font-medium text-foreground">Datos laborales</h4>
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="grid gap-2">
								<Label htmlFor="employee-position">Puesto</Label>
								<Input
									id="employee-position"
									value={formData.position}
									onChange={(event) => handleFieldChange('position', event.target.value)}
									disabled={isLoading}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="employee-status">Estado</Label>
								<Select
									value={formData.status}
									onValueChange={(value) => handleFieldChange('status', value)}
									disabled={isLoading}
								>
									<SelectTrigger id="employee-status">
										<SelectValue placeholder="Seleccioná un estado" />
									</SelectTrigger>
									<SelectContent>
										{EMPLOYEE_STATUSES.map((status) => (
											<SelectItem key={status} value={status}>
												{status}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="employee-hire-date">Fecha de ingreso</Label>
								<Input
									id="employee-hire-date"
									type="date"
									value={formData.hire_date}
									onChange={(event) => handleFieldChange('hire_date', event.target.value)}
									disabled={isLoading}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="employee-termination-date">Fecha de egreso</Label>
								<Input
									id="employee-termination-date"
									type="date"
									value={formData.termination_date}
									onChange={(event) => handleFieldChange('termination_date', event.target.value)}
									disabled={isLoading}
								/>
							</div>
							<div className="grid gap-2 sm:col-span-2">
								<Label htmlFor="employee-user">Usuario del sistema</Label>
								<Select
									value={formData.user_id}
									onValueChange={handleUserChange}
									disabled={isLoading}
								>
									<SelectTrigger id="employee-user">
										<SelectValue placeholder="Sin usuario asociado" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value={NO_USER_VALUE}>Sin usuario asociado</SelectItem>
										{availableUsers.map((user) => (
											<SelectItem key={user.uid_user} value={user.uid_user}>
												{user.username}
												{user.name || user.last_name
													? ` — ${user.last_name || ''} ${user.name || ''}`.trimEnd()
													: ''}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<p className="text-xs text-muted-foreground">
									Vinculá al empleado con su usuario si tiene acceso al sistema.
								</p>
							</div>
						</div>
					</div>

					<div className="space-y-4">
						<h4 className="text-sm font-medium text-foreground">Contacto de emergencia</h4>
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="grid gap-2">
								<Label htmlFor="employee-emergency-name">Nombre</Label>
								<Input
									id="employee-emergency-name"
									value={formData.emergency_contact_name}
									onChange={(event) =>
										handleFieldChange('emergency_contact_name', event.target.value)
									}
									disabled={isLoading}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="employee-emergency-phone">Teléfono</Label>
								<Input
									id="employee-emergency-phone"
									value={formData.emergency_contact_phone}
									onChange={(event) =>
										handleFieldChange('emergency_contact_phone', event.target.value)
									}
									disabled={isLoading}
								/>
							</div>
						</div>
					</div>

					<div className="grid gap-2">
						<Label htmlFor="employee-notes">Observaciones</Label>
						<Textarea
							id="employee-notes"
							value={formData.notes}
							onChange={(event) => handleFieldChange('notes', event.target.value)}
							rows={3}
							disabled={isLoading}
						/>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isLoading}
						>
							Cancelar
						</Button>
						<Button type="submit" disabled={isLoading}>
							{isLoading ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear empleado'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
