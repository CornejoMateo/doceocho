import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Users, X, UserPlus } from 'lucide-react';
import { getBoardMembers, addBoardMember, removeBoardMember } from '@/lib/kanban/board-members';
import { listUsers } from '@/lib/users/users';
import { getSupabaseClient } from '@/lib/supabase-client';
import type { BoardMember } from './types';
import type { User } from '@/lib/users/users';
import { toast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';

interface BoardMembersModalProps {
	boardId: number | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function BoardMembersModal({ boardId, open, onOpenChange }: BoardMembersModalProps) {
	const [members, setMembers] = useState<BoardMember[]>([]);
	const [availableUsers, setAvailableUsers] = useState<User[]>([]);
	const [memberUsers, setMemberUsers] = useState<Record<string, User>>({});
	const [loading, setLoading] = useState(false);
	const [addingUserId, setAddingUserId] = useState<string | null>(null);

	useEffect(() => {
		if (open && boardId) {
			loadData();
		}
	}, [open, boardId]);

	const loadData = async () => {
		if (!boardId) return;
		setLoading(true);
		try {
			const [membersResult, usersResult] = await Promise.all([
				getBoardMembers(boardId),
				listUsers(),
			]);

			if (!membersResult.error && membersResult.data) {
				setMembers(membersResult.data);

				// Fetch user details for each member
				const memberIds = membersResult.data.map((m) => m.user_id);
				const supabase = getSupabaseClient();
				const { data: usersData } = await supabase
					.from('users')
					.select('*')
					.in('uid_user', memberIds);

				const usersMap: Record<string, User> = {};
				if (usersData) {
					usersData.forEach((u: any) => {
						usersMap[u.uid_user] = u;
					});
				}
				setMemberUsers(usersMap);
			}

			if (!usersResult.error && usersResult.data) {
				// Filter out users who are already members
				const memberIds = membersResult.data?.map((m) => m.user_id) || [];
				setAvailableUsers(usersResult.data.filter((u) => !memberIds.includes(u.uid_user)));
			}
		} catch (error) {
			console.error('Error loading data:', error);
		} finally {
			setLoading(false);
		}
	};

	const handleAddMember = async (userId: string) => {
		if (!boardId) return;
		setAddingUserId(userId);
		try {
			const { error } = await addBoardMember(userId, boardId);
			if (error) {
				toast({
					variant: 'destructive',
					title: 'Error al agregar miembro',
					description: translateError(error),
				});
			} else {
				toast({
					title: 'Miembro agregado',
					description: 'El usuario ha sido agregado al tablero.',
				});
				await loadData();
			}
		} catch (error) {
			toast({
				variant: 'destructive',
				title: 'Error al agregar miembro',
				description: translateError(error),
			});
		} finally {
			setAddingUserId(null);
		}
	};

	const handleRemoveMember = async (memberId: number) => {
		try {
			const { error } = await removeBoardMember(memberId);
			if (error) {
				toast({
					variant: 'destructive',
					title: 'Error al eliminar miembro',
					description: translateError(error),
				});
			} else {
				toast({
					title: 'Miembro eliminado',
					description: 'El usuario ha sido eliminado del tablero.',
				});
				await loadData();
			}
		} catch (error) {
			toast({
				variant: 'destructive',
				title: 'Error al eliminar miembro',
				description: translateError(error),
			});
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md max-h-[80vh] overflow-hidden flex flex-col">
				<DialogHeader>
					<DialogTitle asChild>
						<VisuallyHidden>Miembros del tablero</VisuallyHidden>
					</DialogTitle>
					<div className="flex items-center gap-2 mb-4">
						<Users className="h-5 w-5" />
						<h2 className="text-lg font-semibold">Miembros del tablero</h2>
					</div>
				</DialogHeader>

				<div className="flex-1 overflow-y-auto space-y-4">
					{loading ? (
						<div className="text-center py-8">
							<p className="text-muted-foreground">Cargando...</p>
						</div>
					) : (
						<>
							<div>
								<h3 className="text-sm font-medium mb-2">Miembros actuales</h3>
								{members.length === 0 ? (
									<p className="text-sm text-muted-foreground">No hay miembros en este tablero.</p>
								) : (
									<div className="space-y-2">
										{members.map((member) => {
											const user = memberUsers[member.user_id];
											return (
												<div
													key={member.id}
													className="flex items-center justify-between p-2 border rounded-md"
												>
													<div className="flex-1">
														<p className="text-sm font-medium">
															{user ? `${user.name} ${user.last_name}` : member.user_id}
														</p>
														{user && (
															<p className="text-xs text-muted-foreground">@{user.username}</p>
														)}
													</div>
													<Button
														variant="ghost"
														size="icon"
														className="h-6 w-6 text-destructive hover:text-destructive"
														onClick={() => handleRemoveMember(member.id)}
													>
														<X className="h-4 w-4" />
													</Button>
												</div>
											);
										})}
									</div>
								)}
							</div>

							<div>
								<h3 className="text-sm font-medium mb-2">Agregar miembros</h3>
								{availableUsers.length === 0 ? (
									<p className="text-sm text-muted-foreground">No hay usuarios disponibles.</p>
								) : (
									<div className="space-y-2">
										{availableUsers.map((user) => (
											<div
												key={user.uid_user}
												className="flex items-center justify-between p-2 border rounded-md"
											>
												<div className="flex-1">
													<p className="text-sm font-medium">
														{user.name} {user.last_name}
													</p>
													<p className="text-xs text-muted-foreground">@{user.username}</p>
												</div>
												<Button
													variant="ghost"
													size="icon"
													className="h-6 w-6"
													onClick={() => handleAddMember(user.uid_user)}
													disabled={addingUserId === user.uid_user}
												>
													<UserPlus className="h-4 w-4" />
												</Button>
											</div>
										))}
									</div>
								)}
							</div>
						</>
					)}
				</div>

				<div className="flex gap-2 justify-end mt-4">
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cerrar
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
