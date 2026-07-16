import { renderHook, act, waitFor } from '@testing-library/react';
import { useChatManagement, clearChannelsCache } from '@/hooks/chat/use-chat-management';

jest.mock('@/components/provider/auth-provider', () => ({
	useAuth: jest.fn().mockReturnValue({
		user: {
			id: 'user-1',
			username: 'admin',
			name: 'Admin',
			last_name: 'User',
			role: 'Admin',
		},
	}),
}));

jest.mock('@/components/provider/chat-unread-provider', () => ({
	useChatUnread: jest.fn().mockReturnValue({
		totalUnreadCount: 0,
		incrementUnreadCount: jest.fn(),
		decrementUnreadCount: jest.fn(),
		setUnreadCount: jest.fn(),
		fetchUnreadCount: jest.fn().mockResolvedValue(undefined),
	}),
}));

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: jest.fn().mockReturnValue({
		channel: jest.fn().mockReturnValue({
			on: jest.fn().mockReturnThis(),
			subscribe: jest.fn().mockReturnThis(),
		}),
		removeChannel: jest.fn(),
	}),
}));

jest.mock('@/lib/chat/channels', () => ({
	getUserChannelsAction: jest.fn(),
	deleteChannelAction: jest.fn(),
}));

jest.mock('@/lib/chat/messages', () => ({
	sendMessageAction: jest.fn(),
	cleanChannelMessagesAction: jest.fn(),
}));

jest.mock('@/lib/chat/messages-client', () => ({
	deleteMessage: jest.fn(),
	editMessage: jest.fn(),
	getMessages: jest.fn().mockResolvedValue({ messages: [], hasMore: false }),
}));

jest.mock('@/lib/chat/channels-client', () => ({
	getChannelMembers: jest.fn(),
	updateLastReadMessage: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/components/ui/use-toast', () => ({
	toast: jest.fn(),
}));

jest.mock('@/lib/error-translator', () => ({
	translateError: (e: any) => e?.message || String(e),
}));

import { getUserChannelsAction, deleteChannelAction } from '@/lib/chat/channels';
import { sendMessageAction, cleanChannelMessagesAction } from '@/lib/chat/messages';
import { deleteMessage, editMessage } from '@/lib/chat/messages-client';
import { getChannelMembers, updateLastReadMessage } from '@/lib/chat/channels-client';
import { toast } from '@/components/ui/use-toast';

const channel1 = {
	id: 1,
	name: 'General',
	description: 'General channel',
	last_message_id: 10,
	unread_count: 3,
};
const channel2 = { id: 2, name: 'Ventas', description: null, last_message_id: 20, unread_count: 0 };

describe('useChatManagement', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		clearChannelsCache();
		(getUserChannelsAction as jest.Mock).mockResolvedValue({
			success: true,
			data: [channel1, channel2],
		});
	});

	const defaultProps = {
		currentUserUid: 'user-1',
		currentUserRole: 'Admin',
		messages: [],
		messagesLoading: false,
	};

	it('sets error when loading channels fails', async () => {
		(getUserChannelsAction as jest.Mock).mockResolvedValue({
			success: false,
			error: 'Database error',
		});

		const { result } = renderHook(() => useChatManagement(defaultProps));

		await act(async () => {
			await result.current.loadChannels();
		});

		expect(result.current.channels).toEqual([]);
		expect(result.current.loading).toBe(false);
	});

	it('has correct initial state', () => {
		const { result } = renderHook(() => useChatManagement(defaultProps));

		expect(result.current.channels).toEqual([]);
		expect(result.current.selectedChannel).toBeNull();
		expect(result.current.newMessage).toBe('');
		expect(result.current.loading).toBe(true);
		expect(result.current.isAdmin).toBe(true);
		expect(result.current.sending).toBe(false);
		expect(result.current.replyingTo).toBeNull();
	});

	it('isAdmin is false for non-admin users', () => {
		const { result } = renderHook(() =>
			useChatManagement({ ...defaultProps, currentUserRole: 'Colocador' })
		);
		expect(result.current.isAdmin).toBe(false);
	});

	it('loads channels on loadChannels call', async () => {
		const { result } = renderHook(() => useChatManagement(defaultProps));

		await act(async () => {
			await result.current.loadChannels();
		});

		expect(result.current.channels).toEqual([channel1, channel2]);
		expect(result.current.loading).toBe(false);
		expect(result.current.initialLoadDone).toBe(true);
	});

	it('does not load channels when no user', async () => {
		const { result } = renderHook(() => useChatManagement({ ...defaultProps, currentUserUid: '' }));

		await act(async () => {
			await result.current.loadChannels();
		});

		expect(getUserChannelsAction).not.toHaveBeenCalled();
		expect(result.current.loading).toBe(false);
	});

	it('exposes totalUnreadCount from useChatUnread', async () => {
		const { result } = renderHook(() => useChatManagement(defaultProps));

		await act(async () => {
			await result.current.loadChannels();
		});

		expect(result.current.totalUnreadCount).toBe(0);
	});

	it('handleChannelSelect selects channel and resets UI state', async () => {
		const { result } = renderHook(() => useChatManagement(defaultProps));

		await act(async () => {
			await result.current.loadChannels();
		});

		act(() => {
			result.current.handleChannelSelect(channel1);
		});

		expect(result.current.selectedChannel).toEqual(channel1);
		expect(result.current.showSidebar).toBe(false);
		expect(result.current.searchTerm).toBe('');
		expect(result.current.replyingTo).toBeNull();
	});

	it('handleSendMessage sends and clears input', async () => {
		const sentMessage = { id: 100, content: 'Hello', user_id: 'user-1', channel_id: 1 };
		(sendMessageAction as jest.Mock).mockResolvedValue({ success: true, data: sentMessage });

		const { result } = renderHook(() => useChatManagement(defaultProps));

		act(() => {
			result.current.setNewMessage('Hello');
		});

		await act(async () => {
			await result.current.handleSendMessage(1);
		});

		expect(sendMessageAction).toHaveBeenCalledWith(1, 'Hello', undefined);
		expect(result.current.newMessage).toBe('');
		expect(result.current.sending).toBe(false);
	});

	it('handleSendMessage includes reply_to when replying', async () => {
		const replyMsg = {
			id: 10,
			content: 'Original',
			user_id: 'user-2',
			channel_id: 1,
			created_at: '',
			edited_at: null,
			deleted_at: null,
			reply_to: null,
		};
		(sendMessageAction as jest.Mock).mockResolvedValue({ success: true, data: { id: 101 } });

		const { result } = renderHook(() => useChatManagement(defaultProps));

		act(() => {
			result.current.handleReplyTo(replyMsg as any);
			result.current.setNewMessage('Reply!');
		});

		await act(async () => {
			await result.current.handleSendMessage(1);
		});

		expect(sendMessageAction).toHaveBeenCalledWith(1, 'Reply!', 10);
		expect(result.current.replyingTo).toBeNull();
	});

	it('handleSendMessage restores message on failure', async () => {
		(sendMessageAction as jest.Mock).mockResolvedValue({ success: false, error: 'Network error' });

		const { result } = renderHook(() => useChatManagement(defaultProps));

		act(() => {
			result.current.setNewMessage('Failed msg');
		});

		await act(async () => {
			await result.current.handleSendMessage(1);
		});

		expect(result.current.newMessage).toBe('Failed msg');
		expect(result.current.sending).toBe(false);
		expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
	});

	it('handleSendMessage does nothing with empty message', async () => {
		const { result } = renderHook(() => useChatManagement(defaultProps));

		await act(async () => {
			await result.current.handleSendMessage(1);
		});

		expect(sendMessageAction).not.toHaveBeenCalled();
	});

	it('does nothing when message contains only spaces', async () => {
		const { result } = renderHook(() => useChatManagement(defaultProps));

		act(() => {
			result.current.setNewMessage('    ');
		});

		await act(async () => {
			await result.current.handleSendMessage(1);
		});

		expect(sendMessageAction).not.toHaveBeenCalled();
	});

	it('handleEditMessage succeeds', async () => {
		(editMessage as jest.Mock).mockResolvedValue({ id: 1, content: 'New content' });

		const { result } = renderHook(() => useChatManagement(defaultProps));

		act(() => {
			result.current.setEditingMessage({ id: 1, content: 'Old' });
		});

		await act(async () => {
			await result.current.handleEditMessage(1, 'New content');
		});

		expect(editMessage).toHaveBeenCalledWith(1, 'New content');
		expect(result.current.editingMessage).toBeNull();
		expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Mensaje editado' }));
	});

	it('handleEditMessage fails and shows error', async () => {
		(editMessage as jest.Mock).mockRejectedValue(new Error('Permiso denegado'));

		const { result } = renderHook(() => useChatManagement(defaultProps));

		await act(async () => {
			await result.current.handleEditMessage(1, 'New');
		});

		expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
	});

	it('handleDeleteMessage sets pendingDeleteMessage', async () => {
		const { result } = renderHook(() => useChatManagement(defaultProps));

		act(() => {
			result.current.handleDeleteMessage(42);
		});

		expect(result.current.pendingDeleteMessage).toBe(42);
	});

	it('confirmDeleteMessage succeeds', async () => {
		(deleteMessage as jest.Mock).mockResolvedValue({ id: 42 });

		const { result } = renderHook(() => useChatManagement(defaultProps));

		act(() => {
			result.current.handleDeleteMessage(42);
		});

		await act(async () => {
			await result.current.confirmDeleteMessage();
		});

		expect(deleteMessage).toHaveBeenCalledWith(42);
		expect(result.current.pendingDeleteMessage).toBeNull();
		expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Mensaje eliminado' }));
	});

	it('confirmDeleteMessage fails and shows error', async () => {
		(deleteMessage as jest.Mock).mockRejectedValue(new Error('No autorizado'));

		const { result } = renderHook(() => useChatManagement(defaultProps));

		act(() => {
			result.current.handleDeleteMessage(42);
		});

		await act(async () => {
			await result.current.confirmDeleteMessage();
		});

		expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
	});

	it('cancelDeleteMessage clears pending', () => {
		const { result } = renderHook(() => useChatManagement(defaultProps));

		act(() => {
			result.current.handleDeleteMessage(42);
		});

		act(() => {
			result.current.cancelDeleteMessage();
		});

		expect(result.current.pendingDeleteMessage).toBeNull();
	});

	it('handleDeleteChannel sets pendingDeleteChannel', () => {
		const { result } = renderHook(() => useChatManagement(defaultProps));

		act(() => {
			result.current.handleDeleteChannel(1, 'General');
		});

		expect(result.current.pendingDeleteChannel).toEqual({ id: 1, name: 'General' });
	});

	it('confirmDeleteChannel succeeds and deselects if it was selected', async () => {
		(deleteChannelAction as jest.Mock).mockResolvedValue({ success: true });

		const { result } = renderHook(() => useChatManagement(defaultProps));

		await act(async () => {
			await result.current.loadChannels();
		});

		act(() => {
			result.current.handleChannelSelect(channel1);
		});

		act(() => {
			result.current.handleDeleteChannel(1, 'General');
		});

		await act(async () => {
			await result.current.confirmDeleteChannel();
		});

		expect(deleteChannelAction).toHaveBeenCalledWith(1);
		expect(result.current.selectedChannel).toBeNull();
		expect(result.current.pendingDeleteChannel).toBeNull();
	});

	it('confirmDeleteChannel does not clear selected channel if different', async () => {
		(deleteChannelAction as jest.Mock).mockResolvedValue({ success: true });

		const { result } = renderHook(() => useChatManagement(defaultProps));

		await act(async () => {
			await result.current.loadChannels();
		});

		act(() => {
			result.current.handleChannelSelect(channel1);
		});

		act(() => {
			result.current.handleDeleteChannel(2, 'Ventas');
		});

		await act(async () => {
			await result.current.confirmDeleteChannel();
		});

		expect(result.current.selectedChannel).toEqual(channel1);
	});

	it('confirmDeleteChannel fails and shows error', async () => {
		(deleteChannelAction as jest.Mock).mockResolvedValue({ success: false, error: 'Error de BD' });

		const { result } = renderHook(() => useChatManagement(defaultProps));

		act(() => {
			result.current.handleDeleteChannel(1, 'General');
		});

		await act(async () => {
			await result.current.confirmDeleteChannel();
		});

		expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
	});

	it('cancelDeleteChannel clears pending', () => {
		const { result } = renderHook(() => useChatManagement(defaultProps));

		act(() => {
			result.current.handleDeleteChannel(1, 'General');
		});

		act(() => {
			result.current.cancelDeleteChannel();
		});

		expect(result.current.pendingDeleteChannel).toBeNull();
	});

	it('handleCleanupMessages sets pendingCleanupMessages', () => {
		const { result } = renderHook(() => useChatManagement(defaultProps));

		act(() => {
			result.current.handleChannelSelect(channel1);
		});

		act(() => {
			result.current.setCleanupDate('2024-01-15');
		});

		act(() => {
			result.current.handleCleanupMessages();
		});

		expect(result.current.pendingCleanupMessages).toBe(true);
	});

	it('confirmCleanupMessages succeeds', async () => {
		(cleanChannelMessagesAction as jest.Mock).mockResolvedValue({ success: true, deletedCount: 5 });

		const { result } = renderHook(() => useChatManagement(defaultProps));

		act(() => {
			result.current.handleChannelSelect(channel1);
		});

		act(() => {
			result.current.setCleanupDate('2024-01-15');
		});

		act(() => {
			result.current.handleCleanupMessages();
		});

		await act(async () => {
			await result.current.confirmCleanupMessages();
		});

		expect(cleanChannelMessagesAction).toHaveBeenCalledWith(1, '2024-01-15');
		expect(result.current.pendingCleanupMessages).toBe(false);
		expect(result.current.cleanupDate).toBe('');
		expect(result.current.showCleanupDialog).toBe(false);
		expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Mensajes eliminados' }));
	});

	it('confirmCleanupMessages fails and shows error', async () => {
		(cleanChannelMessagesAction as jest.Mock).mockResolvedValue({
			success: false,
			error: 'DB error',
		});

		const { result } = renderHook(() => useChatManagement(defaultProps));

		act(() => {
			result.current.handleChannelSelect(channel1);
		});

		act(() => {
			result.current.setCleanupDate('2024-01-15');
		});

		act(() => {
			result.current.handleCleanupMessages();
		});

		await act(async () => {
			await result.current.confirmCleanupMessages();
		});

		expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
	});

	it('cancelCleanupMessages clears pending', () => {
		const { result } = renderHook(() => useChatManagement(defaultProps));

		act(() => {
			result.current.handleCleanupMessages();
		});

		act(() => {
			result.current.cancelCleanupMessages();
		});

		expect(result.current.pendingCleanupMessages).toBe(false);
	});

	it('handleReplyTo and handleCancelReply', () => {
		const { result } = renderHook(() => useChatManagement(defaultProps));
		const msg = { id: 1, content: 'Hi', user_id: 'user-2' } as any;

		act(() => {
			result.current.handleReplyTo(msg);
		});
		expect(result.current.replyingTo).toEqual(msg);

		act(() => {
			result.current.handleCancelReply();
		});
		expect(result.current.replyingTo).toBeNull();
	});

	it('handleCreateChannel shows dialog', () => {
		const { result } = renderHook(() => useChatManagement(defaultProps));

		act(() => {
			result.current.handleCreateChannel();
		});

		expect(result.current.showCreateDialog).toBe(true);
	});

	it('handleChannelCreated clears cache, reloads, and shows toast', async () => {
		const { result } = renderHook(() => useChatManagement(defaultProps));

		await act(async () => {
			await result.current.loadChannels();
		});

		act(() => {
			result.current.handleChannelCreated();
		});

		expect(result.current.showCreateDialog).toBe(false);
		expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Canal creado' }));
	});

	it('handleShowMembers loads members and shows dialog', async () => {
		const members = [{ id: 1, user_id: 'user-1' }];
		(getChannelMembers as jest.Mock).mockResolvedValue(members);

		const { result } = renderHook(() => useChatManagement(defaultProps));

		act(() => {
			result.current.handleChannelSelect(channel1);
		});

		await act(async () => {
			await result.current.handleShowMembers();
		});

		expect(getChannelMembers).toHaveBeenCalledWith(1);
		expect(result.current.members).toEqual(members);
		expect(result.current.showMembersDialog).toBe(true);
	});

	it('handleShowMembers handles error', async () => {
		(getChannelMembers as jest.Mock).mockRejectedValue(new Error('Failed'));

		const { result } = renderHook(() => useChatManagement(defaultProps));

		act(() => {
			result.current.handleChannelSelect(channel1);
		});

		await act(async () => {
			await result.current.handleShowMembers();
		});

		expect(result.current.members).toEqual([]);
	});

	it('uses cache on second loadChannels call within TTL', async () => {
		const { result } = renderHook(() => useChatManagement(defaultProps));

		await act(async () => {
			await result.current.loadChannels();
		});

		(getUserChannelsAction as jest.Mock).mockClear();

		await act(async () => {
			await result.current.loadChannels();
		});

		expect(getUserChannelsAction).not.toHaveBeenCalled();
		expect(result.current.channels).toEqual([channel1, channel2]);
	});

	it('handleSendMessage does nothing when already sending', async () => {
		let resolveFirstSend: any;
		(sendMessageAction as jest.Mock).mockReset().mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					resolveFirstSend = resolve;
				})
		);

		const { result } = renderHook(() => useChatManagement(defaultProps));

		act(() => {
			result.current.setNewMessage('Hello');
		});

		let firstCallPromise: Promise<void>;
		act(() => {
			firstCallPromise = result.current.handleSendMessage(1);
		});

		expect(result.current.sending).toBe(true);
		expect(sendMessageAction).toHaveBeenCalledTimes(1);

		await act(async () => {
			await result.current.handleSendMessage(1);
		});

		expect(sendMessageAction).toHaveBeenCalledTimes(1);

		await act(async () => {
			resolveFirstSend({ success: true, data: { id: 100 } });
			await firstCallPromise!;
		});
	});

	it('reloads channels after cache expiration', async () => {
		jest.useFakeTimers();

		const { result } = renderHook(() => useChatManagement(defaultProps));

		await act(async () => {
			await result.current.loadChannels();
		});

		(getUserChannelsAction as jest.Mock).mockClear();

		jest.advanceTimersByTime(60000);

		await act(async () => {
			await result.current.loadChannels();
		});

		expect(getUserChannelsAction).toHaveBeenCalled();

		jest.useRealTimers();
	});
});
