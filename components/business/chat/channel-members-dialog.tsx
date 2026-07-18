'use client';

import { useState, useEffect } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { UserPlus, UserMinus, Users } from 'lucide-react';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
	addMemberToChannelAction,
	removeMemberFromChannelAction,
	getAvailableUsersAction,
} from '@/lib/chat/channel-members';
import { ChannelWithLastMessage } from '@/lib/chat/chat-types';
import { toast } from '@/components/ui/use-toast';

interface ChannelMembersDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	channel: ChannelWithLastMessage | null;
	members: any[];
	onMembersUpdated: () => void;
	currentUserRole: string;
}

export function ChannelMembersDialog({
	open,
	onOpenChange,
	channel,
	members,
	onMembersUpdated,
	currentUserRole,
}: ChannelMembersDialogProps) {
	const [availableUsers, setAvailableUsers] = useState<any[]>([]);
	const [selectedUser, setSelectedUser] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [memberToRemove, setMemberToRemove] = useState<{ userId: string; username: string } | null>(
		null
	);

	const isAdmin = currentUserRole === 'Admin';

	useEffect(() => {
		if (open && isAdmin) {
			loadAvailableUsers();
		}
	}, [open, isAdmin]);

	const loadAvailableUsers = async () => {
		setLoading(true);
		const result = await getAvailableUsersAction();
		if (result.success && result.data) {
			setAvailableUsers(result.data);
		}
		setLoading(false);
	};

	const handleAddMember = async () => {
		if (!channel || !selectedUser) return;

		setLoading(true);
		setError('');

		const targetUser = availableUsers.find((u) => u.uid_user === selectedUser);

		const result = await addMemberToChannelAction(channel.id, selectedUser);

		if (!result.error) {
			setSelectedUser('');
			onMembersUpdated();
			toast({
				title: 'Miembro agregado',
				description: `${targetUser?.username || 'Usuario'} fue agregado al canal.`,
			});
		} else {
			setError(result.error || 'Error al agregar miembro');
			toast({
				title: 'Error al agregar miembro',
				description: result.error,
				variant: 'destructive',
			});
		}

		setLoading(false);
	};

	const handleRemoveMember = async (userId: string, username: string) => {
		if (!channel) return;

		setLoading(true);
		setError('');

		const result = await removeMemberFromChannelAction(channel.id, userId);

		if (!result.error) {
			onMembersUpdated();
			toast({ title: 'Miembro removido', description: `${username} fue removido del canal.` });
		} else {
			setError(result.error || 'Error al remover miembro');
			toast({
				title: 'Error al remover miembro',
				description: result.error,
				variant: 'destructive',
			});
		}

		setLoading(false);
	};

	const existingMemberIds = members.map((m) => m.users?.uid_user || m.user_id);
	const availableToAdd = availableUsers.filter((u) => !existingMemberIds.includes(u.uid_user));

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Miembros del canal</DialogTitle>
						<DialogDescription>
							{channel?.name || 'Canal'} - {members.length} miembro{members.length !== 1 ? 's' : ''}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						{isAdmin && (
							<div className="space-y-2">
								<Label>Agregar miembro</Label>
								<div className="flex gap-2">
									<select
										className="flex-1 px-3 py-2 border rounded-md"
										value={selectedUser}
										onChange={(e) => setSelectedUser(e.target.value)}
									>
										<option value="">Seleccionar usuario</option>
										{availableToAdd.map((user) => (
											<option key={user.uid_user} value={user.uid_user}>
												{user.username} ({user.role})
											</option>
										))}
									</select>
									<Button
										onClick={handleAddMember}
										disabled={loading || !selectedUser}
										size="icon"
										aria-label="Agregar miembro"
									>
										<UserPlus className="h-4 w-4" />
									</Button>
								</div>
							</div>
						)}

						{error && <div className="text-sm text-destructive">{error}</div>}

						{/* Members List */}
						<div className="space-y-2">
							<Label>Miembros actuales</Label>
							<div className="h-64 border rounded-md p-2 overflow-y-auto">
								{members.length === 0 ? (
									<div className="text-center text-sm text-muted-foreground py-4">
										No hay miembros en este canal
									</div>
								) : (
									<div className="space-y-2">
										{members.map((member) => (
											<div
												key={member.id}
												className="flex items-center justify-between p-2 bg-muted rounded"
											>
												<div className="flex items-center gap-2">
													<Users className="h-4 w-4 text-muted-foreground" />
													<div>
														<div className="font-medium">
															{member.users?.username || member.user_id}
														</div>
														<div className="text-xs text-muted-foreground">
															{member.users?.role || 'Usuario'}
														</div>
													</div>
												</div>
												{isAdmin && (
													<Button
														variant="ghost"
														size="icon"
														onClick={() =>
															setMemberToRemove({
																userId: member.user_id,
																username: member.users?.username || 'Usuario',
															})
														}
														disabled={loading}
														aria-label={`Remover ${member.users?.username || 'Usuario'}`}
													>
														<UserMinus className="h-4 w-4 text-destructive" />
													</Button>
												)}
											</div>
										))}
									</div>
								)}
							</div>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			<AlertDialog
				open={!!memberToRemove}
				onOpenChange={(open) => !open && setMemberToRemove(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Remover miembro</AlertDialogTitle>
						<AlertDialogDescription>
							¿Estás seguro de que querés remover a <strong>{memberToRemove?.username}</strong> del
							canal?
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								if (memberToRemove) {
									handleRemoveMember(memberToRemove.userId, memberToRemove.username);
									setMemberToRemove(null);
								}
							}}
						>
							Remover
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
