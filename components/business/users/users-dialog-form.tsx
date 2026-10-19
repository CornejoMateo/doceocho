'use client';

import { DialogFooter } from '@/components/ui/dialog';
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
import { Eye, EyeOff } from 'lucide-react';
import { User } from '@/lib/users/users';
import {
	getSelectableRoles,
	isRoleSelectLocked,
	isSuperadmin,
	UserRole,
} from '@/constants/users/user-role';
import { UserViewsEditor } from '@/components/business/users/user-views-editor';

export interface UserFormData {
	username: string;
	password: string;
	role: string;
	name: string;
	last_name: string;
	/** Custom views; null or missing means the role defaults. */
	views?: string[] | null;
}

interface UsersDialogFormProps {
	editingUser: User | null;
	formData: UserFormData;
	setFormData: (data: UserFormData | ((prev: UserFormData) => UserFormData)) => void;
	saving: boolean;
	showPassword: boolean;
	setShowPassword: (show: boolean | ((prev: boolean) => boolean)) => void;
	handleSave: () => Promise<void>;
	onCancel: () => void;
	callerRole?: UserRole;
}

export function UsersDialogForm({
	editingUser,
	formData,
	setFormData,
	saving,
	showPassword,
	setShowPassword,
	handleSave,
	onCancel,
	callerRole,
}: UsersDialogFormProps) {
	const targetRole = editingUser?.role;
	const selectableRoles = getSelectableRoles(callerRole, targetRole);
	const roleSelectLocked = isRoleSelectLocked(callerRole, targetRole);

	return (
		<div className="grid gap-4 py-4">
			<div className="grid gap-2">
				<Label htmlFor="username" className="text-foreground">
					Nombre de usuario
				</Label>
				<Input
					id="username"
					value={formData.username}
					onChange={(e) =>
						setFormData((p) => ({
							...p,
							username: e.target.value.replace(/\s/g, ''),
						}))
					}
					className="bg-background"
					placeholder="ej: juanperez"
				/>
			</div>
			<div className="grid gap-2">
				<Label htmlFor="last_name" className="text-foreground">
					Apellido
				</Label>
				<Input
					id="last_name"
					value={formData.last_name}
					onChange={(e) => setFormData((p) => ({ ...p, last_name: e.target.value }))}
					className="bg-background"
					placeholder="ej: Pérez"
				/>
			</div>
			<div className="grid gap-2">
				<Label htmlFor="name" className="text-foreground">
					Nombre
				</Label>
				<Input
					id="name"
					value={formData.name}
					onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
					className="bg-background"
					placeholder="ej: Juan"
				/>
			</div>
			<div className="grid gap-2">
				<Label htmlFor="password" className="text-foreground">
					Contraseña{''}
					{editingUser && (
						<span className="text-muted-foreground font-normal">
							(La contraseña no se muestra por seguridad, dejá en blanco para no cambiar)
						</span>
					)}
				</Label>
				<div className="relative">
					<Input
						id="password"
						type={showPassword ? 'text' : 'password'}
						value={formData.password}
						onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
						className="bg-background pr-10"
					/>
					<button
						type="button"
						onClick={() => setShowPassword((p) => !p)}
						className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
						tabIndex={-1}
					>
						{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
					</button>
				</div>
			</div>
			<div className="grid gap-2">
				<Label htmlFor="role" className="text-foreground">
					Rol
				</Label>
				<Select
					value={formData.role}
					onValueChange={(value) => setFormData((p) => ({ ...p, role: value }))}
					disabled={roleSelectLocked}
				>
					<SelectTrigger className="bg-background">
						<SelectValue placeholder="Seleccionar rol" />
					</SelectTrigger>
					<SelectContent>
						{selectableRoles.map((role) => (
							<SelectItem
								key={role}
								value={role}
								disabled={role === 'Superadmin' && roleSelectLocked}
							>
								{role}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			{isSuperadmin(callerRole) && (
				<UserViewsEditor
					role={formData.role}
					views={formData.views ?? null}
					onChange={(views) => setFormData((p) => ({ ...p, views }))}
				/>
			)}
			<DialogFooter className="gap-2">
				<Button variant="outline" onClick={onCancel}>
					Cancelar
				</Button>
				<Button onClick={handleSave} disabled={saving}>
					{saving ? 'Guardando...' : editingUser ? 'Guardar cambios' : 'Crear usuario'}
				</Button>
			</DialogFooter>
		</div>
	);
}
