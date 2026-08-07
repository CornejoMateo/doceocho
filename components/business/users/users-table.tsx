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
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Edit, Trash2, Shield } from 'lucide-react';
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
				<>
					{/* Desktop Table */}
					<div className="hidden md:block">
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
												<Select
													value={user.role}
													onValueChange={(value) => onUpdateRole(user, value)}
												>
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
					</div>

					{/* Mobile Cards */}
					<div className="md:hidden space-y-3">
						{users.map((user) => (
							<Card key={user.uid_user || user.username}>
								<CardContent className="p-4">
									<div className="space-y-3">
										<div className="flex items-start justify-between gap-2">
											<div className="flex-1 min-w-0">
												<p className="font-semibold text-base truncate">{user.username}</p>
												<p className="text-sm text-muted-foreground">
													{user.name} {user.last_name}
												</p>
											</div>
											<div className="flex items-center gap-1 flex-shrink-0">
												{!isCurrentUser(user) && (
													<>
														<Button
															variant="ghost"
															size="sm"
															onClick={() => onEdit(user)}
															className="h-8 w-8 p-0"
															aria-label={`Editar ${user.username}`}
														>
															<Edit className="h-4 w-4" />
														</Button>
														<Button
															variant="ghost"
															size="sm"
															className="text-destructive hover:text-destructive h-8 w-8 p-0"
															onClick={() => onDelete(user)}
															aria-label={`Eliminar ${user.username}`}
														>
															<Trash2 className="h-4 w-4" />
														</Button>
													</>
												)}
											</div>
										</div>

										<div className="flex items-center gap-2 pt-2 border-t">
											<Shield className="h-4 w-4 text-muted-foreground flex-shrink-0" />
											{user.username !== currentUser?.username ? (
												<Select
													value={user.role}
													onValueChange={(value) => onUpdateRole(user, value)}
												>
													<SelectTrigger
														className={cn(
															'h-8 flex-1',
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
												</Select>
											) : (
												<Label className="text-muted-foreground text-sm">{user.role}</Label>
											)}
										</div>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				</>
			)}
		</div>
	);
}
