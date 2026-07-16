'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';
import { useAuth } from '@/components/provider/auth-provider';
import { useChatRealtime } from '@/hooks/chat/use-chat-realtime';
import { usePushNotifications } from '@/hooks/push/use-push-notifications';
import { useChatManagement } from '@/hooks/chat/use-chat-management';
import { ChatSidebar } from './chat-sidebar';
import { ChatHeader } from './chat-header';
import { MessagesList, MessagesListRef } from './messages-list';
import { MessageInput } from './message-input';
import { PushNotificationSettings } from '@/components/business/chat/push-notification-settings';
import { CleanupMessagesDialog } from '@/components/business/chat/cleanup-messages-dialog';
import { CreateChannelDialog } from './create-channel-dialog';
import { ChannelMembersDialog } from './channel-members-dialog';
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
import { useIsMobile } from '@/components/ui/use-mobile';
import { CHAT_CONSTANTS } from '@/constants/chat/chat.constants';

export function ChatManagement() {
	const { user } = useAuth();
	const isMobile = useIsMobile();
	const {
		isSupported: pushSupported,
		permission: pushPermission,
		subscription: pushSubscription,
		requestPermission,
		subscribe,
		unsubscribe,
	} = usePushNotifications();

	const [initialScrollDone, setInitialScrollDone] = useState(false);

	const refreshRef = useRef<() => void>(() => {});

	const chatManagement = useChatManagement({
		currentUserUid: user?.id || '',
		currentUserRole: user?.role || '',
		messages: [],
		messagesLoading: false,
		onMessagesCleaned: () => refreshRef.current(),
	});

	const {
		messages,
		loading: messagesLoading,
		refresh,
	} = useChatRealtime(chatManagement.selectedChannel?.id || null);

	refreshRef.current = refresh;

	const filteredMessages = useMemo(() => {
		let result = messages;

		if (chatManagement.searchTerm) {
			const term = chatManagement.searchTerm.toLowerCase();
			result = result.filter(
				(msg) =>
					msg.content?.toLowerCase().includes(term) ||
					msg.users?.username?.toLowerCase().includes(term) ||
					msg.users?.name?.toLowerCase().includes(term) ||
					msg.users?.last_name?.toLowerCase().includes(term)
			);
		}

		const { from, to } = chatManagement.dateRange;
		if (from || to) {
			const fromDate = from ? new Date(`${from}T00:00:00`) : null;
			const toDate = to ? new Date(`${to}T23:59:59.999`) : null;

			result = result.filter((msg) => {
				const msgDate = new Date(msg.created_at);
				if (fromDate && msgDate < fromDate) return false;
				if (toDate && msgDate > toDate) return false;
				return true;
			});
		}

		return result;
	}, [messages, chatManagement.searchTerm, chatManagement.dateRange]);

	useEffect(() => {
		if (user) {
			chatManagement.loadChannels();
		}
	}, [user, chatManagement.loadChannels]);

	const messagesListRef = useRef<MessagesListRef>(null);

	const previousLastMessageId = useRef<number | null>(null);

	useEffect(() => {
		if (filteredMessages.length === 0) return;

		const lastMessage = filteredMessages.at(-1)!;

		if (lastMessage.id === previousLastMessageId.current) return;

		previousLastMessageId.current = lastMessage.id;
		const nearBottom = messagesListRef.current?.isNearBottom();

		if (lastMessage.user_id !== user?.id && nearBottom) {
			messagesListRef.current?.scrollToBottom({
				behavior: 'smooth',
			});
		} else {
			if (lastMessage.user_id === user?.id) {
				messagesListRef.current?.scrollToBottom({
					behavior: 'smooth',
				});
			}
		}
	}, [filteredMessages, user?.id]);

	const previousChannelId = useRef<number | null>(null);

	useEffect(() => {
		const currentId = chatManagement.selectedChannel?.id ?? null;

		if (!currentId || messagesLoading || filteredMessages.length === 0) {
			return;
		}

		if (currentId === previousChannelId.current && initialScrollDone) {
			return;
		}

		previousChannelId.current = currentId;

		const unreadId = chatManagement.firstUnreadMessageId;

		requestAnimationFrame(() => {
			if (unreadId) {
				const exists = filteredMessages.some((msg) => msg.id === unreadId);

				if (exists) {
					messagesListRef.current?.scrollToMessage(unreadId, {
						block: 'center',
						behavior: 'auto',
					});

					setInitialScrollDone(true);
					chatManagement.handleScrolledToUnread();
					return;
				}
			}

			messagesListRef.current?.scrollToBottom({
				behavior: 'auto',
			});

			setInitialScrollDone(true);
		});
		chatManagement.handleScrolledToUnread();
	}, [
		chatManagement.selectedChannel?.id,
		messagesLoading,
		filteredMessages.length,
		initialScrollDone,
	]);

	if (!user) {
		return <div className="p-4">Cargando...</div>;
	}

	return (
		<div className="flex h-[calc(100vh-8rem)] gap-4 relative overflow-hidden">
			{' '}
			{(!isMobile || !chatManagement.selectedChannel) && (
				<ChatSidebar
					channels={chatManagement.channels}
					selectedChannel={chatManagement.selectedChannel}
					loading={chatManagement.loading}
					initialLoadDone={chatManagement.initialLoadDone}
					isAdmin={chatManagement.isAdmin}
					onChannelSelect={(channel) => {
						if (chatManagement.selectedChannel?.id !== channel.id) {
							setInitialScrollDone(false);
						}

						chatManagement.handleChannelSelect(channel);
					}}
					onCreateChannel={chatManagement.handleCreateChannel}
					onDeleteChannel={chatManagement.handleDeleteChannel}
					pushNotificationSettings={
						<PushNotificationSettings
							isSupported={pushSupported}
							permission={pushPermission}
							subscription={pushSubscription}
							onRequestPermission={requestPermission}
							onSubscribe={subscribe}
							onUnsubscribe={unsubscribe}
						/>
					}
				/>
			)}
			{(!isMobile || chatManagement.selectedChannel) && (
				<Card className="flex-1 flex flex-col min-h-0">
					{chatManagement.selectedChannel ? (
						<>
							<ChatHeader
								channel={chatManagement.selectedChannel}
								showSearch={chatManagement.showSearch}
								searchTerm={chatManagement.searchTerm}
								showDateSearch={chatManagement.showDateSearch}
								dateRange={chatManagement.dateRange}
								isAdmin={chatManagement.isAdmin}
								isMobile={isMobile}
								onSearchToggle={() => {
									chatManagement.setShowDateSearch(false);
									chatManagement.setDateRange({ from: '', to: '' });
									chatManagement.setShowSearch(!chatManagement.showSearch);
									if (chatManagement.showSearch) chatManagement.setSearchTerm('');
								}}
								onSearchChange={chatManagement.setSearchTerm}
								onDateSearchToggle={() => {
									chatManagement.setShowSearch(false);
									chatManagement.setSearchTerm('');
									chatManagement.setShowDateSearch(!chatManagement.showDateSearch);
									if (chatManagement.showDateSearch)
										chatManagement.setDateRange({ from: '', to: '' });
								}}
								onDateRangeChange={chatManagement.setDateRange}
								onShowMembers={chatManagement.handleShowMembers}
								onCleanupMessages={() => chatManagement.setShowCleanupDialog(true)}
								onSearchByDate={() => {
									chatManagement.setShowSearch(false);
									chatManagement.setSearchTerm('');
									chatManagement.setShowDateSearch(true);
								}}
								onBack={() => {
									chatManagement.setSelectedChannel(null);
									chatManagement.setShowSidebar(true);
								}}
							/>

							<MessagesList
								key={chatManagement.selectedChannel?.id ?? 'no-channel'}
								filteredMessages={filteredMessages}
								searchTerm={chatManagement.searchTerm}
								isFiltering={
									!!chatManagement.searchTerm ||
									!!chatManagement.dateRange.from ||
									!!chatManagement.dateRange.to
								}
								currentUserId={user.id}
								editingMessage={chatManagement.editingMessage}
								messagesLoading={messagesLoading}
								onEditMessage={chatManagement.handleEditMessage}
								onDeleteMessage={chatManagement.handleDeleteMessage}
								onSetEditingMessage={chatManagement.setEditingMessage}
								onReplyTo={chatManagement.handleReplyTo}
								ref={messagesListRef}
								initialScrollDone={initialScrollDone}
							/>

							<MessageInput
								newMessage={chatManagement.newMessage}
								sending={chatManagement.sending}
								replyingTo={chatManagement.replyingTo}
								onMessageChange={chatManagement.setNewMessage}
								onSendMessage={() =>
									chatManagement.selectedChannel &&
									chatManagement.handleSendMessage(chatManagement.selectedChannel.id)
								}
								onCancelReply={chatManagement.handleCancelReply}
							/>
						</>
					) : (
						!isMobile && (
							<div className="flex-1 flex items-center justify-center text-muted-foreground">
								<div className="text-center">
									<MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
									<p>{CHAT_CONSTANTS.MESSAGES.SELECT_CHANNEL}</p>
								</div>
							</div>
						)
					)}
				</Card>
			)}
			{chatManagement.showCreateDialog && (
				<CreateChannelDialog
					open={chatManagement.showCreateDialog}
					onOpenChange={chatManagement.setShowCreateDialog}
					onChannelCreated={chatManagement.handleChannelCreated}
				/>
			)}
			{chatManagement.showMembersDialog && (
				<ChannelMembersDialog
					open={chatManagement.showMembersDialog}
					onOpenChange={chatManagement.setShowMembersDialog}
					channel={chatManagement.selectedChannel}
					members={chatManagement.members}
					onMembersUpdated={() => {
						if (chatManagement.selectedChannel) {
							chatManagement.loadMembers(chatManagement.selectedChannel.id);
						}
					}}
					currentUserRole={user.role}
				/>
			)}
			<CleanupMessagesDialog
				open={chatManagement.showCleanupDialog}
				onOpenChange={chatManagement.setShowCleanupDialog}
				cleanupDate={chatManagement.cleanupDate}
				onCleanupDateChange={chatManagement.setCleanupDate}
				onCleanup={chatManagement.handleCleanupMessages}
			/>
			<AlertDialog
				open={chatManagement.pendingDeleteMessage !== null}
				onOpenChange={() => chatManagement.cancelDeleteMessage()}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Eliminar mensaje</AlertDialogTitle>
						<AlertDialogDescription>
							¿Estás seguro de que quieres eliminar este mensaje?
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction onClick={chatManagement.confirmDeleteMessage}>
							Eliminar
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			<AlertDialog
				open={chatManagement.pendingDeleteChannel !== null}
				onOpenChange={() => chatManagement.cancelDeleteChannel()}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Eliminar canal</AlertDialogTitle>
						<AlertDialogDescription>
							{chatManagement.pendingDeleteChannel
								? `¿Estás seguro de que quieres eliminar el canal "${chatManagement.pendingDeleteChannel.name}"? Esta acción eliminará todos los mensajes y miembros del canal.`
								: ''}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction onClick={chatManagement.confirmDeleteChannel}>
							Eliminar
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			<AlertDialog
				open={chatManagement.pendingCleanupMessages}
				onOpenChange={() => chatManagement.cancelCleanupMessages()}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Limpiar mensajes</AlertDialogTitle>
						<AlertDialogDescription>
							¿Estás seguro de que quieres eliminar todos los mensajes anteriores a la fecha
							seleccionada? Esta acción no se puede deshacer.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction onClick={chatManagement.confirmCleanupMessages}>
							Eliminar
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
