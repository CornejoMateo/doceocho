'use client';

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { User } from '@/lib/users/users';
import { roles } from '@/constants/users/user-role';

interface UsersTableProps {
	users: User[];
	loading: boolean;
	currentUser: { username: string } | null;
	isCurrentUser: (user: User) => boolean;
	onEdit: (user: User) => void;
	onDelete: (user: User) => void;
	onAdd: () => void;
	onUpdateRole: (user: User, newRole: string) => Promise<void>;
}

export function UsersTable({
	users,
	loading,
	currentUser,
	isCurrentUser,
	onEdit,
	onDelete,
	onAdd,
	onUpdateRole,
}: UsersTableProps) {
	return (
		<div className="space-y-4">
			<div className="flex justify-end">
				<Button onClick={onAdd} className="gap-2">
					<Plus className="h-4 w-4" />
					Agregar usuario
				</Button>
			</div>

			{loading ? (
				<p className="text-center text-muted-foreground py-8">Cargando usuarios...</p>
			) : users.length === 0 ? (
				<p className="text-center text-muted-foreground py-8">No hay usuarios registrados</p>
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="text-center">Usuario</TableHead>
							<TableHead className="text-center">Apellido</TableHead>
							<TableHead className="text-center">Nombre</TableHead>
							<TableHead className="text-center">Rol</TableHead>
							<TableHead className="text-center w-[200px]">Acciones</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{users.map((user) => (
							<TableRow key={user.uid_user || user.username}>
								<TableCell className="font-medium text-center">{user.username}</TableCell>
								<TableCell className="text-center">{user.last_name || '-'}</TableCell>
								<TableCell className="text-center">{user.name || '-'}</TableCell>
								<TableCell className="text-center">
									<div className="flex items-center gap-2 justify-center">
										<Select value={user.role} onValueChange={(value) => onUpdateRole(user, value)}>
											{user.username !== currentUser?.username ? (
												<>
													<SelectTrigger
														className={cn(
															'h-8 w-[130px] text-center',
															user.role === 'Admin' ? 'border-primary/30 text-primary' : ''
														)}
													>
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														{roles.map((role) => (
															<SelectItem key={role} value={role}>
																{role}
															</SelectItem>
														))}
													</SelectContent>
												</>
											) : (
												<Label className="text-muted-foreground">{user.role}</Label>
											)}
										</Select>
									</div>
								</TableCell>
								<TableCell className="text-center">
									{!isCurrentUser(user) && (
										<div className="flex items-center gap-1 justify-center">
											<Button
												variant="ghost"
												size="sm"
												onClick={() => onEdit(user)}
												aria-label={`Editar ${user.username}`}
											>
												<Edit className="h-4 w-4" />
											</Button>
											<Button
												variant="ghost"
												size="sm"
												className="text-destructive hover:text-destructive"
												onClick={() => onDelete(user)}
												aria-label={`Eliminar ${user.username}`}
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
									)}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
		</div>
	);
}
