'use client';

import { useEffect, useMemo, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';
import { useAuth } from '@/components/provider/auth-provider';
import { useChatRealtime } from '@/hooks/chat/use-chat-realtime';
import { usePushNotifications } from '@/hooks/push/use-push-notifications';
import { useChatManagement } from '@/hooks/chat/use-chat-management';
import { ChatSidebar } from './chat-sidebar';
import { ChatHeader } from './chat-header';
import { MessagesList, MessagesListHandle } from './messages-list';
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
		loadingMore,
		hasMore,
		loadMore,
		refresh,
	} = useChatRealtime(chatManagement.selectedChannel?.id || null);

	refreshRef.current = refresh;

	const optimisticMessages = chatManagement.optimisticMessages.filter(
		(m) => m.channel_id === chatManagement.selectedChannel?.id
	);

	const allMessages = useMemo(
		() => [...messages, ...optimisticMessages],
		[messages, optimisticMessages]
	);

	const filteredMessages = chatManagement.searchTerm
		? allMessages.filter(
				(msg) =>
					(msg.content?.toLowerCase().includes(chatManagement.searchTerm.toLowerCase()) ||
						msg.users?.username?.toLowerCase().includes(chatManagement.searchTerm.toLowerCase()) ||
						msg.users?.name?.toLowerCase().includes(chatManagement.searchTerm.toLowerCase()) ||
						msg.users?.last_name
							?.toLowerCase()
							.includes(chatManagement.searchTerm.toLowerCase())) &&
					msg.deleted_at === null
			)
		: allMessages;

	const messagesListRef = useRef<MessagesListHandle>(null);
	const prevOptimisticCountRef = useRef(optimisticMessages.length);

	useEffect(() => {
		if (optimisticMessages.length > prevOptimisticCountRef.current) {
			requestAnimationFrame(() => {
				messagesListRef.current?.scrollToBottom();
			});
		}
		prevOptimisticCountRef.current = optimisticMessages.length;
	}, [optimisticMessages.length]);

	useEffect(() => {
		if (user) {
			chatManagement.loadChannels();
		}
	}, [user, chatManagement.loadChannels]);

	if (!user) {
		return <div className="p-4">Cargando...</div>;
	}

	return (
		<div className="flex min-h-[calc(100vh-8rem)] gap-4 relative overflow-hidden">
			{(!isMobile || !chatManagement.selectedChannel) && (
				<ChatSidebar
					channels={chatManagement.channels}
					selectedChannel={chatManagement.selectedChannel}
					loading={chatManagement.loading}
					initialLoadDone={chatManagement.initialLoadDone}
					isAdmin={chatManagement.isAdmin}
					onChannelSelect={chatManagement.handleChannelSelect}
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
								isAdmin={chatManagement.isAdmin}
								isMobile={isMobile}
								onSearchToggle={() => chatManagement.setShowSearch(!chatManagement.showSearch)}
								onSearchChange={chatManagement.setSearchTerm}
								onShowMembers={chatManagement.handleShowMembers}
								onCleanupMessages={() => chatManagement.setShowCleanupDialog(true)}
								onSearchByDate={() => chatManagement.setShowSearch(!chatManagement.showSearch)}
								onBack={() => {
									chatManagement.setSelectedChannel(null);
									chatManagement.setShowSidebar(true);
								}}
							/>

							<MessagesList
								ref={messagesListRef}
								key={chatManagement.selectedChannel?.id ?? 'no-channel'}
								messages={allMessages}
								filteredMessages={filteredMessages}
								searchTerm={chatManagement.searchTerm}
								currentUserId={user.id}
								editingMessage={chatManagement.editingMessage}
								messagesLoading={messagesLoading}
								hasMore={hasMore}
								loadingMore={loadingMore}
								onLoadMore={loadMore}
								onEditMessage={chatManagement.handleEditMessage}
								onDeleteMessage={chatManagement.handleDeleteMessage}
								onSetEditingMessage={chatManagement.setEditingMessage}
								onReplyTo={chatManagement.handleReplyTo}
								channelId={chatManagement.selectedChannel?.id ?? null}
								lastReadMessageId={chatManagement.selectedChannel?.last_read_message_id ?? null}
								onScrolledToUnread={chatManagement.handleScrolledToUnread}
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
