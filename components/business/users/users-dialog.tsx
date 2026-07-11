'use client';

import { useState, useEffect } from 'react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from '@/components/ui/dialog';
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';
import {
	User,
	listUsers,
	createUser,
	deleteUser,
	updateUser,
	updateUserPassword,
} from '@/lib/users/users';
import { UserRole } from '@/constants/users/user-role';
import { useAuth } from '@/components/provider/auth-provider';
import { UsersTable } from './users-table';
import { UsersDialogForm } from './users-dialog-form';

interface UsersDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function UsersDialog({ open, onOpenChange }: UsersDialogProps) {
	const { toast } = useToast();
	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(false);
	const [showForm, setShowForm] = useState(false);
	const [editingUser, setEditingUser] = useState<User | null>(null);
	const [formData, setFormData] = useState({
		username: '',
		password: '',
		role: '',
		name: '',
		last_name: '',
	});
	const [saving, setSaving] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [userToDelete, setUserToDelete] = useState<User | null>(null);
	const [deleting, setDeleting] = useState(false);
	const { user: currentUser } = useAuth();

	const isCurrentUser = (user: User) => user.username === currentUser?.username;

	const loadUsers = async () => {
		setLoading(true);
		try {
			const { data, error } = await listUsers();
			if (error) {
				toast({
					title: 'Error al cargar usuarios',
					description: translateError(error) || 'Ocurrió un error al cargar los usuarios',
					variant: 'destructive',
				});
			} else {
				setUsers(data ?? []);
			}
		} catch (error: any) {
			toast({
				title: 'Error al cargar usuarios',
				description: translateError(error?.message) || 'Ocurrió un error al cargar los usuarios',
				variant: 'destructive',
			});
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (open) {
			loadUsers();
			setShowForm(false);
			setEditingUser(null);
			setFormData({ username: '', password: '', role: '', name: '', last_name: '' });
		}
	}, [open]);

	const handleEdit = (user: User) => {
		setEditingUser(user);
		setFormData({
			username: user.username,
			password: '',
			role: user.role,
			name: user.name || '',
			last_name: user.last_name || '',
		});
		setShowForm(true);
	};

	const handleSave = async () => {
		if (!formData.username || !formData.role) {
			toast({ title: 'Completá todos los campos', variant: 'destructive' });
			return;
		}

		setSaving(true);

		if (editingUser) {
			const { error: updateError } = await updateUser(editingUser.uid_user!, {
				username: formData.username,
				role: formData.role as UserRole,
				name: formData.name,
				last_name: formData.last_name,
			});

			if (updateError) {
				toast({
					title: 'Error al actualizar usuario',
					description: translateError(updateError) || 'Ocurrió un error al actualizar el usuario',
					variant: 'destructive',
				});
				setSaving(false);
				return;
			}

			if (formData.password) {
				const { error: pwError } = await updateUserPassword(
					editingUser.uid_user!,
					formData.password
				);

				if (pwError) {
					toast({
						title: 'Error al actualizar contraseña',
						description: translateError(pwError),
						variant: 'destructive',
					});
					setSaving(false);
					return;
				}
			}

			toast({
				title: 'Usuario actualizado',
				description: `${formData.username} ha sido actualizado correctamente.`,
			});
		} else {
			if (!formData.password) {
				toast({ title: 'La contraseña es obligatoria', variant: 'destructive' });
				setSaving(false);
				return;
			}

			const { error } = await createUser({
				username: formData.username,
				password: formData.password,
				role: formData.role as UserRole,
				name: formData.name,
				last_name: formData.last_name,
			});

			if (error) {
				toast({
					title: 'Error al crear usuario',
					description: translateError(error),
					variant: 'destructive',
				});
				setSaving(false);
				return;
			}

			toast({
				title: 'Usuario creado',
				description: `${formData.username} ha sido creado correctamente.`,
			});
		}

		setShowForm(false);
		setEditingUser(null);
		setFormData({ username: '', password: '', role: '', name: '', last_name: '' });
		await loadUsers();
		setSaving(false);
	};

	const handleUpdateRole = async (user: User, newRole: string) => {
		if (!user.uid_user) return;

		const { error } = await updateUser(user.uid_user, { role: newRole as UserRole });

		if (error) {
			toast({
				title: 'Error al actualizar rol',
				description: translateError(error),
				variant: 'destructive',
			});
		} else {
			toast({
				title: 'Rol actualizado',
				description: `El rol de ${user.username} ahora es ${newRole}.`,
			});
			await loadUsers();
		}
	};

	const confirmDelete = async () => {
		const user = userToDelete;
		if (!user?.uid_user) {
			toast({
				title: 'Error al eliminar usuario',
				description: 'El usuario no tiene un ID válido.',
				variant: 'destructive',
			});
			setUserToDelete(null);
			return;
		}
		setDeleting(true);
		const { error } = await deleteUser(user.uid_user);
		setDeleting(false);
		setUserToDelete(null);
		if (error) {
			toast({
				title: 'Error al eliminar usuario',
				description: translateError(error),
				variant: 'destructive',
			});
		} else {
			toast({
				title: 'Usuario eliminado',
				description: `${user.username} ha sido eliminado correctamente.`,
			});
			await loadUsers();
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="bg-card !max-w-3xl max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="text-foreground">
						{showForm ? (editingUser ? 'Editar usuario' : 'Nuevo usuario') : 'Configurar usuarios'}
					</DialogTitle>
					<DialogDescription className="text-muted-foreground">
						{showForm
							? editingUser
								? 'Actualizá los datos del usuario'
								: 'Completá los datos del nuevo usuario'
							: 'Administrá los usuarios del sistema'}
					</DialogDescription>
				</DialogHeader>

				{!showForm ? (
					<UsersTable
						users={users}
						loading={loading}
						currentUser={currentUser}
						isCurrentUser={isCurrentUser}
						onEdit={handleEdit}
						onDelete={(user) => setUserToDelete(user)}
						onAdd={() => setShowForm(true)}
						onUpdateRole={handleUpdateRole}
					/>
				) : (
					<UsersDialogForm
						editingUser={editingUser}
						formData={formData}
						setFormData={setFormData}
						saving={saving}
						showPassword={showPassword}
						setShowPassword={setShowPassword}
						handleSave={handleSave}
						onCancel={() => {
							setShowForm(false);
							setEditingUser(null);
							setFormData({ username: '', password: '', role: '', name: '', last_name: '' });
						}}
					/>
				)}
			</DialogContent>
			<AlertDialog open={!!userToDelete} onOpenChange={(o) => !o && setUserToDelete(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
					</AlertDialogHeader>
					<p className="text-sm text-muted-foreground">
						Esta acción no se puede deshacer. Se eliminará el usuario{' '}
						<strong>{userToDelete?.username}</strong> y no podrá iniciar sesión.
					</p>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
						<Button onClick={confirmDelete} disabled={deleting} variant="destructive">
							{deleting ? 'Eliminando...' : 'Eliminar'}
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Dialog>
	);
}
