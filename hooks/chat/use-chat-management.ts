import { useState, useEffect, useRef, useCallback } from 'react';
import { ChannelWithLastMessage, MessageWithUser } from '@/lib/chat/chat-types';
import { getUserChannelsAction, deleteChannelAction } from '@/lib/chat/channels';
import {
	sendMessageAction,
	deleteMessageAction,
	editMessageAction,
	cleanChannelMessagesAction,
} from '@/lib/chat/messages';
import { getChannelMembersAction, updateLastReadMessage } from '@/lib/chat/channel-members';
import { getSupabaseClient } from '@/lib/supabase-client';
import { toast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';
import { useAuth } from '@/components/provider/auth-provider';
import { useChatUnread } from '@/components/provider/chat-unread-provider';

type ChannelsCacheEntry = {
	data: ChannelWithLastMessage[];
	timestamp: number;
};

let channelsCache: ChannelsCacheEntry | null = null;

export function clearChannelsCache() {
	channelsCache = null;
}
const CHANNELS_CACHE_TTL = 30_000;

interface UseChatManagementProps {
	currentUserUid: string;
	currentUserRole: string;
	messages: MessageWithUser[];
	messagesLoading: boolean;
	onMessagesCleaned?: () => void;
}

export function useChatManagement({
	currentUserUid,
	currentUserRole,
	onMessagesCleaned,
}: UseChatManagementProps) {
	const [channels, setChannels] = useState<ChannelWithLastMessage[]>([]);
	const [selectedChannel, setSelectedChannel] = useState<ChannelWithLastMessage | null>(null);
	const [newMessage, setNewMessage] = useState('');
	const [loading, setLoading] = useState(true);
	const [initialLoadDone, setInitialLoadDone] = useState(false);
	const [showCreateDialog, setShowCreateDialog] = useState(false);
	const [showMembersDialog, setShowMembersDialog] = useState(false);
	const [members, setMembers] = useState<any[]>([]);
	const [searchTerm, setSearchTerm] = useState('');
	const [showSearch, setShowSearch] = useState(false);
	const [showDateSearch, setShowDateSearch] = useState(false);
	const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' });
	const [editingMessage, setEditingMessage] = useState<{ id: number; content: string } | null>(
		null
	);
	const [showSidebar, setShowSidebar] = useState(true);
	const [showCleanupDialog, setShowCleanupDialog] = useState(false);
	const [cleanupDate, setCleanupDate] = useState('');
	const [sending, setSending] = useState(false);
	const selectedChannelRef = useRef(selectedChannel);
	selectedChannelRef.current = selectedChannel;
	const [scrolledToUnread, setScrolledToUnread] = useState(false);
	const [replyingTo, setReplyingTo] = useState<MessageWithUser | null>(null);
	const [scrollTrigger, setScrollTrigger] = useState(0);
	const [pendingDeleteMessage, setPendingDeleteMessage] = useState<number | null>(null);
	const [pendingDeleteChannel, setPendingDeleteChannel] = useState<{
		id: number;
		name: string;
	} | null>(null);
	const [pendingCleanupMessages, setPendingCleanupMessages] = useState(false);
	const { user: authUser } = useAuth();

	const { totalUnreadCount, decrementUnreadCount } = useChatUnread();

	const loadChannels = useCallback(
		async (isBackgroundUpdate = false) => {
			try {
				if (!currentUserUid) {
					if (!isBackgroundUpdate) {
						setLoading(false);
						setInitialLoadDone(true);
					}
					return;
				}

				const isFresh = channelsCache && Date.now() - channelsCache.timestamp < CHANNELS_CACHE_TTL;

				if (channelsCache && !isBackgroundUpdate) {
					setChannels(channelsCache.data);
					setLoading(false);
					setInitialLoadDone(true);
				}

				if (isFresh) return;

				if (!channelsCache) {
					setLoading(true);
				}

				const result = await getUserChannelsAction();
				console.table(
					result.data?.map((c) => ({
						name: c.name,
						unread: c.unread_count,
						lastRead: c.last_read_message_id,
						lastMessage: c.last_message_id,
					}))
				);
				if (result.success && result.data) {
					channelsCache = { data: result.data, timestamp: Date.now() };
					setChannels(result.data);
				}
			} finally {
				if (!isBackgroundUpdate) {
					setLoading(false);
					setInitialLoadDone(true);
				}
			}
		},
		[currentUserUid]
	);

	useEffect(() => {
		if (!currentUserUid) return;

		const supabase = getSupabaseClient();
		const channel = supabase
			.channel('channels-messages')
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'messages',
				},
				(payload) => {
					const msgChannelId = payload.new.channel_id;
					const msgUserId = payload.new.user_id;
					if (msgUserId !== currentUserUid) {
						const isViewingChannel = selectedChannelRef.current?.id === msgChannelId;

						channelsCache = null;

						setChannels((prev) =>
							prev.map((ch) =>
								ch.id === msgChannelId
									? {
											...ch,
											unread_count: isViewingChannel ? 0 : (ch.unread_count || 0) + 1,
											last_message_id: payload.new.id,
										}
									: ch
							)
						);
					}
				}
			)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'channel_members',
					filter: `user_id=eq.${currentUserUid}`,
				},
				(payload) => {
					if (payload.eventType === 'INSERT') {
						channelsCache = null;
						loadChannels(true);
					} else if (payload.eventType === 'DELETE') {
						const channelId = payload.old.channel_id;
						setChannels((prev) => prev.filter((ch) => ch.id !== channelId));
						setSelectedChannel((prev) => (prev?.id === channelId ? null : prev));
					} else if (payload.eventType === 'UPDATE') {
						const newLastReadId = payload.new.last_read_message_id;
						const oldLastReadId = payload.old.last_read_message_id;
						if (newLastReadId !== oldLastReadId) {
							channelsCache = null;
							const channelId = payload.new.channel_id;
							setChannels((prev) =>
								prev.map((ch) =>
									ch.id === channelId
										? { ...ch, unread_count: 0, last_read_message_id: newLastReadId }
										: ch
								)
							);
						}
					}
				}
			)
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	}, [currentUserUid]);

	useEffect(() => {
		if (!selectedChannel) return;
		const latest = channels.find((ch) => ch.id === selectedChannel.id);
		if (latest && latest.last_message_id !== selectedChannel.last_message_id) {
			setSelectedChannel((prev) =>
				prev ? { ...prev, last_message_id: latest.last_message_id } : prev
			);
		}
	}, [channels, selectedChannel?.id]);

	const loadMembers = async (channelId: number) => {
		if (!currentUserUid) return;
		const result = await getChannelMembersAction(channelId);
		if (result.success && result.data) {
			setMembers(result.data);
		}
	};

	const handleSendMessage = async (channelId: number) => {
		if (!channelId || !currentUserUid || !newMessage.trim() || sending) return;

		setSending(true);

		const messageContent = newMessage.trim();
		setNewMessage('');

		const replyToId = replyingTo?.id ?? null;

		setReplyingTo(null);

		try {
			const result = await sendMessageAction(channelId, messageContent, replyToId || undefined);

			if (!result.success) {
				setNewMessage(messageContent);
				toast({
					title: 'Error al enviar mensaje',
					description: translateError(result.error) || 'Error al enviar mensaje',
					variant: 'destructive',
				});
				return;
			}

			setScrollTrigger((prev) => prev + 1);
		} finally {
			setSending(false);
		}
	};

	const handleChannelSelect = async (channel: ChannelWithLastMessage) => {
		setSelectedChannel(channel);

		const unreadToRemove = channel.unread_count ?? 0;

		if (unreadToRemove > 0) {
			decrementUnreadCount(unreadToRemove);
		}

		setChannels((prev) => {
			const updated = prev.map((ch) =>
				ch.id === channel.id
					? {
							...ch,
							unread_count: 0,
							last_read_message_id: channel.last_message_id,
						}
					: ch
			);

			channelsCache = {
				data: updated,
				timestamp: Date.now(),
			};

			return updated;
		});

		if (channel.last_message_id) {
			updateLastReadMessage(channel.last_message_id, channel.id, currentUserUid);
		}

		setSearchTerm('');
		setShowSearch(false);
		setShowDateSearch(false);
		setDateRange({ from: '', to: '' });
		setShowSidebar(false);
		setScrolledToUnread(false);
		setReplyingTo(null);
	};

	const handleScrolledToUnread = async () => {
		if (!selectedChannel?.last_message_id) return;

		const unreadToRemove = selectedChannel.unread_count ?? 0;

		void updateLastReadMessage(selectedChannel.last_message_id, selectedChannel.id, currentUserUid);

		setSelectedChannel((prev) =>
			prev
				? {
						...prev,
						last_read_message_id: prev.last_message_id,
						unread_count: 0,
					}
				: prev
		);

		setChannels((prev) => {
			const updated = prev.map((ch) =>
				ch.id === selectedChannel.id
					? {
							...ch,
							last_read_message_id: selectedChannel.last_message_id,
							unread_count: 0,
						}
					: ch
			);
			channelsCache = { data: updated, timestamp: Date.now() };
			return updated;
		});

		if (unreadToRemove > 0) {
			decrementUnreadCount(unreadToRemove);
		}
	};

	const handleReplyTo = (message: MessageWithUser) => {
		setReplyingTo(message);
	};

	const handleCancelReply = () => {
		setReplyingTo(null);
	};

	const handleCreateChannel = () => {
		setShowCreateDialog(true);
	};

	const handleShowMembers = async () => {
		if (selectedChannel) {
			await loadMembers(selectedChannel.id);
			setShowMembersDialog(true);
		}
	};

	const handleChannelCreated = () => {
		channelsCache = null;
		loadChannels();
		setShowCreateDialog(false);
		toast({ title: 'Canal creado' });
	};

	const handleDeleteMessage = async (messageId: number) => {
		if (!currentUserUid) return;
		setPendingDeleteMessage(messageId);
	};

	const confirmDeleteMessage = async () => {
		if (pendingDeleteMessage === null) return;
		const messageId = pendingDeleteMessage;
		setPendingDeleteMessage(null);

		const result = await deleteMessageAction(messageId);

		if (result.success) {
			toast({ title: 'Mensaje eliminado' });
		} else {
			toast({
				title: 'Error al eliminar mensaje',
				description: translateError(result.error) || 'Error al eliminar mensaje',
				variant: 'destructive',
			});
		}
	};

	const handleEditMessage = async (messageId: number, newContent: string) => {
		if (!currentUserUid) return;

		const result = await editMessageAction(messageId, newContent);
		if (result.success) {
			setEditingMessage(null);
			toast({ title: 'Mensaje editado' });
		} else {
			toast({
				title: 'Error al editar mensaje',
				description: translateError(result.error) || 'Error al editar mensaje',
				variant: 'destructive',
			});
		}
	};

	const handleDeleteChannel = async (channelId: number, channelName: string) => {
		if (!currentUserUid) return;
		setPendingDeleteChannel({ id: channelId, name: channelName });
	};

	const confirmDeleteChannel = async () => {
		if (!pendingDeleteChannel) return;
		const { id: channelId, name: channelName } = pendingDeleteChannel;
		setPendingDeleteChannel(null);

		const result = await deleteChannelAction(channelId);
		if (result.success) {
			if (selectedChannel?.id === channelId) {
				setSelectedChannel(null);
			}
			channelsCache = null;
			loadChannels();
			toast({
				title: 'Canal eliminado',
				description: `El canal "${channelName}" ha sido eliminado.`,
			});
		} else {
			toast({
				title: 'Error al eliminar canal',
				description: translateError(result.error) || 'Error al eliminar canal',
				variant: 'destructive',
			});
		}
	};

	const handleCleanupMessages = async () => {
		if (!selectedChannel || !currentUserUid || !cleanupDate) return;
		setPendingCleanupMessages(true);
	};

	const confirmCleanupMessages = async () => {
		if (!selectedChannel || !currentUserUid || !cleanupDate) return;
		setPendingCleanupMessages(false);

		const result = await cleanChannelMessagesAction(selectedChannel.id, cleanupDate);

		if (result.success) {
			toast({
				title: 'Mensajes eliminados',
				description: `Se eliminaron ${result.deletedCount || 0} mensajes del canal.`,
			});
			setShowCleanupDialog(false);
			setCleanupDate('');
			onMessagesCleaned?.();
		} else {
			toast({
				title: 'Error al limpiar mensajes',
				description: translateError(result.error) || 'Error al limpiar mensajes del canal',
				variant: 'destructive',
			});
		}
	};

	return {
		// State
		channels,
		selectedChannel,
		newMessage,
		loading,
		initialLoadDone,
		totalUnreadCount,
		showCreateDialog,
		showMembersDialog,
		members,
		searchTerm,
		showSearch,
		showDateSearch,
		dateRange,
		editingMessage,
		showSidebar,
		showCleanupDialog,
		cleanupDate,
		sending,
		scrolledToUnread,
		replyingTo,
		pendingDeleteMessage,
		pendingDeleteChannel,
		pendingCleanupMessages,
		scrollTrigger,

		// Setters
		setNewMessage,
		setSearchTerm,
		setShowSearch,
		setShowDateSearch,
		setDateRange,
		setEditingMessage,
		setShowSidebar,
		setShowCleanupDialog,
		setCleanupDate,
		setShowCreateDialog,
		setShowMembersDialog,
		setSelectedChannel,
		setChannels,

		// Actions
		loadChannels,
		loadMembers,
		handleSendMessage,
		handleChannelSelect,
		handleScrolledToUnread,
		handleCreateChannel,
		handleShowMembers,
		handleChannelCreated,
		handleDeleteMessage,
		handleEditMessage,
		handleDeleteChannel,
		handleCleanupMessages,
		handleReplyTo,
		handleCancelReply,
		confirmDeleteMessage,
		confirmDeleteChannel,
		confirmCleanupMessages,

		// Cancel confirmations
		cancelDeleteMessage: () => setPendingDeleteMessage(null),
		cancelDeleteChannel: () => setPendingDeleteChannel(null),
		cancelCleanupMessages: () => setPendingCleanupMessages(false),

		// Computed
		isAdmin: currentUserRole === 'Admin',
	};
}
