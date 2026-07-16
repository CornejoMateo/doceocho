import { renderHook, act, waitFor } from '@testing-library/react';
import { useChatManagement, clearChannelsCache } from '@/hooks/chat/use-chat-management';
import { useChatRealtime } from '@/hooks/chat/use-chat-realtime';

jest.mock('@/components/provider/auth-provider', () => ({
	useAuth: jest.fn(),
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
			on: jest.fn().mockImplementation(function () {
				return this;
			}),
			subscribe: jest.fn().mockReturnThis(),
		}),
		removeChannel: jest.fn(),

		from: jest.fn().mockReturnValue({
			select: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			single: jest.fn().mockResolvedValue({
				data: null,
				error: null,
			}),
		}),
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
	getMessages: jest.fn(),
	deleteMessage: jest.fn(),
	editMessage: jest.fn(),
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

import { useAuth } from '@/components/provider/auth-provider';
import { getUserChannelsAction, deleteChannelAction } from '@/lib/chat/channels';
import { sendMessageAction } from '@/lib/chat/messages';
import { getMessages, deleteMessage, editMessage } from '@/lib/chat/messages-client';
import { updateLastReadMessage } from '@/lib/chat/channels-client';
import { toast } from '@/components/ui/use-toast';

// ─── 5 users ───────────────────────────────────────────────────────────────────
const users = [
	{ id: 'user-1', username: 'admin', name: 'Admin', last_name: 'User', role: 'Admin' },
	{ id: 'user-2', username: 'maria', name: 'María', last_name: 'López', role: 'Colocador' },
	{ id: 'user-3', username: 'pedro', name: 'Pedro', last_name: 'García', role: 'Taller' },
	{ id: 'user-4', username: 'laura', name: 'Laura', last_name: 'Martínez', role: 'Colocador' },
	{ id: 'user-5', username: 'diego', name: 'Diego', last_name: 'Rodríguez', role: 'Admin' },
];

const channel = {
	id: 1,
	name: 'Proyecto Casa',
	description: 'Chat del proyecto',
	last_message_id: null,
	unread_count: 0,
};

describe('Integration: Multi-user chat simulation', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		clearChannelsCache();
		(getUserChannelsAction as jest.Mock).mockResolvedValue({ success: true, data: [channel] });
	});

	it('5 users send messages and they appear in order', async () => {
		let messageIdCounter = 100;
		const allSentMessages: any[] = [];

		(sendMessageAction as jest.Mock).mockImplementation(
			async (channelId: number, content: string, replyToId?: number) => {
				const msgId = messageIdCounter++;
				const senderIdx = allSentMessages.length % 5;
				const sender = users[senderIdx];
				const msg = {
					id: msgId,
					content,
					user_id: sender.id,
					channel_id: channelId,
					created_at: new Date().toISOString(),
					edited_at: null,
					deleted_at: null,
					reply_to: replyToId ?? null,
					users: {
						uid_user: sender.id,
						username: sender.username,
						name: sender.name,
						last_name: sender.last_name,
						role: sender.role,
					},
				};
				allSentMessages.push(msg);
				return { success: true, data: msg };
			}
		);

		// User 1 (Admin) logs in
		(useAuth as jest.Mock).mockReturnValue({ user: users[0] });
		(getMessages as jest.Mock).mockResolvedValue({ messages: [], hasMore: false });

		const { result: management1 } = renderHook(() =>
			useChatManagement({
				currentUserUid: users[0].id,
				currentUserRole: users[0].role,
				messages: [],
				messagesLoading: false,
			})
		);

		const { result: realtime1 } = renderHook(() => useChatRealtime(1));

		await act(async () => {
			await management1.current.loadChannels();
		});

		act(() => {
			management1.current.handleChannelSelect(channel);
		});

		await waitFor(() => {
			expect(realtime1.current.loading).toBe(false);
		});

		// User 1 sends first message
		act(() => {
			management1.current.setNewMessage('Hola a todos! Soy Admin');
		});

		await act(async () => {
			await management1.current.handleSendMessage(1);
		});

		expect(allSentMessages).toHaveLength(1);
		expect(allSentMessages[0].content).toBe('Hola a todos! Soy Admin');
		expect(allSentMessages[0].user_id).toBe('user-1');

		// User 2 sends a message
		act(() => {
			management1.current.setNewMessage('Hola Admin! María acá');
		});

		await act(async () => {
			await management1.current.handleSendMessage(1);
		});

		expect(allSentMessages).toHaveLength(2);
		expect(allSentMessages[1].content).toBe('Hola Admin! María acá');

		// User 3 sends a message
		act(() => {
			management1.current.setNewMessage('Pedro por acá, todo bien?');
		});

		await act(async () => {
			await management1.current.handleSendMessage(1);
		});

		expect(allSentMessages).toHaveLength(3);

		// User 4 sends a message
		act(() => {
			management1.current.setNewMessage('Laura también! Hola gente');
		});

		await act(async () => {
			await management1.current.handleSendMessage(1);
		});

		expect(allSentMessages).toHaveLength(4);

		// User 5 sends a message
		act(() => {
			management1.current.setNewMessage('Diego aquí. ¿Reunión mañana?');
		});

		await act(async () => {
			await management1.current.handleSendMessage(1);
		});

		expect(allSentMessages).toHaveLength(5);

		// Verify all messages are in order
		expect(allSentMessages.map((m: any) => m.content)).toEqual([
			'Hola a todos! Soy Admin',
			'Hola Admin! María acá',
			'Pedro por acá, todo bien?',
			'Laura también! Hola gente',
			'Diego aquí. ¿Reunión mañana?',
		]);

		// Verify all users have correct data
		allSentMessages.forEach((msg: any, i: number) => {
			expect(msg.user_id).toBe(users[i].id);
			expect(msg.users.username).toBe(users[i].username);
		});
	});

	it('receives new messages from realtime subscription', async () => {
		let realtimeCallback: any;

		const supabase = require('@/lib/supabase-client').getSupabaseClient();
		supabase.channel.mockReturnValue({
			on: jest.fn(function (event, filter, callback) {
				realtimeCallback = callback;
				return this;
			}),
			subscribe: jest.fn().mockReturnThis(),
		});

		(getMessages as jest.Mock).mockResolvedValue({
			messages: [],
			hasMore: false,
		});

		const { result } = renderHook(() => useChatRealtime(1));

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		act(() => {
			realtimeCallback({
				eventType: 'INSERT',
				new: {
					id: 1,
					content: 'Nuevo mensaje realtime',
					user_id: 'user-2',
					channel_id: 1,
					created_at: new Date().toISOString(),
					edited_at: null,
					deleted_at: null,
					reply_to: null,
					users: {
						uid_user: 'user-2',
						username: 'maria',
						name: 'María',
						last_name: 'López',
						role: 'Colocador',
					},
				},
			});
		});

		await waitFor(() => {
			expect(result.current.messages).toHaveLength(1);
		});

		expect(result.current.messages[0].content).toBe('Nuevo mensaje realtime');
	});

	it('updates message when realtime UPDATE event arrives', async () => {
		let realtimeCallback: any;

		const supabase = require('@/lib/supabase-client').getSupabaseClient();
		supabase.channel.mockReturnValue({
			on: jest.fn(function (event, filter, callback) {
				realtimeCallback = callback;
				return this;
			}),
			subscribe: jest.fn().mockReturnThis(),
		});

		const originalMessage = {
			id: 1,
			content: 'Original',
			user_id: 'user-1',
			channel_id: 1,
			created_at: new Date().toISOString(),
			edited_at: null,
			deleted_at: null,
			reply_to: null,
			users: null,
		};

		(getMessages as jest.Mock).mockResolvedValue({
			messages: [originalMessage],
			hasMore: false,
		});

		const { result } = renderHook(() => useChatRealtime(1));

		await waitFor(() => {
			expect(result.current.messages).toHaveLength(1);
		});

		act(() => {
			realtimeCallback({
				eventType: 'UPDATE',
				new: {
					...originalMessage,
					content: 'Editado',
					edited_at: new Date().toISOString(),
				},
			});
		});

		await waitFor(() => {
			expect(result.current.messages[0].content).toBe('Editado');
		});
	});

	it('removes message when realtime DELETE event arrives', async () => {
		let realtimeCallback: any;

		const supabase = require('@/lib/supabase-client').getSupabaseClient();

		supabase.channel.mockReturnValue({
			on: jest.fn(function (event, filter, callback) {
				realtimeCallback = callback;
				return this;
			}),
			subscribe: jest.fn().mockReturnThis(),
		});

		const message = {
			id: 50,
			content: 'Eliminar',
			user_id: 'user-1',
			channel_id: 1,
			created_at: new Date().toISOString(),
			edited_at: null,
			deleted_at: null,
			reply_to: null,
			users: null,
		};

		(getMessages as jest.Mock).mockResolvedValue({
			messages: [message],
			hasMore: false,
		});

		const { result } = renderHook(() => useChatRealtime(1));

		await waitFor(() => {
			expect(result.current.messages).toHaveLength(1);
		});

		act(() => {
			realtimeCallback({
				eventType: 'DELETE',
				old: {
					id: 50,
				},
			});
		});

		await waitFor(() => {
			expect(result.current.messages).toHaveLength(0);
		});
	});

	it('does not overwrite newer messages when old refresh finishes later', async () => {
		let resolveFetch: any;
		let realtimeCallback: any;

		const supabase = require('@/lib/supabase-client').getSupabaseClient();
		supabase.channel.mockReturnValue({
			on: jest.fn(function (event: any, filter: any, callback: any) {
				realtimeCallback = callback;
				return this;
			}),
			subscribe: jest.fn().mockReturnThis(),
		});

		(getMessages as jest.Mock).mockImplementation(
			() =>
				new Promise((resolve) => {
					resolveFetch = resolve;
				})
		);

		const { result } = renderHook(() => useChatRealtime(1));

		await waitFor(() => {
			expect(result.current.loading).toBe(true);
		});

		act(() => {
			realtimeCallback({
				eventType: 'INSERT',
				new: {
					id: 100,
					content: 'Nuevo realtime',
					user_id: 'user-1',
					channel_id: 1,
					created_at: '2024-01-01T00:00:00Z',
					edited_at: null,
					deleted_at: null,
					reply_to: null,
				},
			});
		});

		await waitFor(() => {
			expect(result.current.messages).toHaveLength(1);
		});

		await act(async () => {
			resolveFetch({
				messages: [
					{
						id: 1,
						content: 'Mensaje viejo',
						user_id: 'user-2',
						channel_id: 1,
						created_at: '2024-01-01T00:01:00Z',
						edited_at: null,
						deleted_at: null,
						reply_to: null,
						users: null,
					},
				],
				hasMore: false,
			});
		});
		expect(result.current.messages.some((m: any) => m.content === 'Nuevo realtime')).toBe(true);
	});

	it('reloads channels after cache expiration', async () => {
		jest.useFakeTimers();

		const { result } = renderHook(() =>
			useChatManagement({
				currentUserUid: users[0].id,
				currentUserRole: users[0].role,
				messages: [],
				messagesLoading: false,
			})
		);

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

	it('user replies to a message and reply_to is correctly set', async () => {
		let messageIdCounter = 200;

		(sendMessageAction as jest.Mock).mockImplementation(
			async (channelId: number, content: string, replyToId?: number) => {
				const msgId = messageIdCounter++;
				const msg = {
					id: msgId,
					content,
					user_id: 'user-1',
					channel_id: channelId,
					created_at: new Date().toISOString(),
					edited_at: null,
					deleted_at: null,
					reply_to: replyToId ?? null,
					users: {
						uid_user: 'user-1',
						username: 'admin',
						name: 'Admin',
						last_name: 'User',
						role: 'Admin',
					},
				};
				return { success: true, data: msg };
			}
		);

		(useAuth as jest.Mock).mockReturnValue({ user: users[0] });
		(getMessages as jest.Mock).mockResolvedValue({ messages: [], hasMore: false });

		const { result: management } = renderHook(() =>
			useChatManagement({
				currentUserUid: users[0].id,
				currentUserRole: users[0].role,
				messages: [],
				messagesLoading: false,
			})
		);

		await act(async () => {
			await management.current.loadChannels();
		});

		// Send original message
		act(() => {
			management.current.setNewMessage('Mensaje original');
		});

		await act(async () => {
			await management.current.handleSendMessage(1);
		});

		// Reply to it
		const originalMessage = {
			id: 200,
			content: 'Mensaje original',
			user_id: 'user-1',
			channel_id: 1,
			created_at: '2024-01-01T00:00:00Z',
			edited_at: null,
			deleted_at: null,
			reply_to: null,
		};

		act(() => {
			management.current.handleReplyTo(originalMessage as any);
		});

		expect(management.current.replyingTo).toEqual(originalMessage);

		act(() => {
			management.current.setNewMessage('Esta es la respuesta');
		});

		await act(async () => {
			await management.current.handleSendMessage(1);
		});

		// Verify reply_to was sent
		expect(sendMessageAction).toHaveBeenLastCalledWith(1, 'Esta es la respuesta', 200);
		expect(management.current.replyingTo).toBeNull();

		// Cancel reply
		const msg2 = { id: 300, content: 'test', user_id: 'user-2' } as any;
		act(() => {
			management.current.handleReplyTo(msg2);
		});

		act(() => {
			management.current.handleCancelReply();
		});

		expect(management.current.replyingTo).toBeNull();
	});

	it('user edits a message successfully', async () => {
		(editMessage as jest.Mock).mockResolvedValue({ id: 10, content: 'Edited text' });

		(useAuth as jest.Mock).mockReturnValue({ user: users[0] });
		(getMessages as jest.Mock).mockResolvedValue({ messages: [], hasMore: false });

		const { result: management } = renderHook(() =>
			useChatManagement({
				currentUserUid: users[0].id,
				currentUserRole: users[0].role,
				messages: [],
				messagesLoading: false,
			})
		);

		// Enter editing mode
		act(() => {
			management.current.setEditingMessage({ id: 10, content: 'Original text' });
		});

		expect(management.current.editingMessage).toEqual({ id: 10, content: 'Original text' });

		// Edit the message
		await act(async () => {
			await management.current.handleEditMessage(10, 'Edited text');
		});

		expect(editMessage).toHaveBeenCalledWith(10, 'Edited text');
		expect(management.current.editingMessage).toBeNull();
		expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Mensaje editado' }));
	});

	it('user deletes a message with confirmation flow', async () => {
		(deleteMessage as jest.Mock).mockResolvedValue({ id: 42 });

		(useAuth as jest.Mock).mockReturnValue({ user: users[0] });
		(getMessages as jest.Mock).mockResolvedValue({ messages: [], hasMore: false });

		const { result: management } = renderHook(() =>
			useChatManagement({
				currentUserUid: users[0].id,
				currentUserRole: users[0].role,
				messages: [],
				messagesLoading: false,
			})
		);

		// Step 1: Request delete
		act(() => {
			management.current.handleDeleteMessage(42);
		});

		expect(management.current.pendingDeleteMessage).toBe(42);

		// Step 2: Cancel delete
		act(() => {
			management.current.cancelDeleteMessage();
		});

		expect(management.current.pendingDeleteMessage).toBeNull();

		// Step 3: Request delete again and confirm
		act(() => {
			management.current.handleDeleteMessage(42);
		});

		await act(async () => {
			await management.current.confirmDeleteMessage();
		});

		expect(deleteMessage).toHaveBeenCalledWith(42);
		expect(management.current.pendingDeleteMessage).toBeNull();
	});

	it('admin deletes a channel with confirmation flow', async () => {
		(deleteChannelAction as jest.Mock).mockResolvedValue({ success: true });

		(useAuth as jest.Mock).mockReturnValue({ user: users[0] });
		(getMessages as jest.Mock).mockResolvedValue({ messages: [], hasMore: false });

		const { result: management } = renderHook(() =>
			useChatManagement({
				currentUserUid: users[0].id,
				currentUserRole: users[0].role,
				messages: [],
				messagesLoading: false,
			})
		);

		await act(async () => {
			await management.current.loadChannels();
		});

		act(() => {
			management.current.handleChannelSelect(channel);
		});

		expect(management.current.selectedChannel).toEqual(channel);

		// Request delete
		act(() => {
			management.current.handleDeleteChannel(1, 'Proyecto Casa');
		});

		expect(management.current.pendingDeleteChannel).toEqual({ id: 1, name: 'Proyecto Casa' });

		// Confirm delete
		await act(async () => {
			await management.current.confirmDeleteChannel();
		});

		expect(deleteChannelAction).toHaveBeenCalledWith(1);
		expect(management.current.selectedChannel).toBeNull();
	});

	it('simulates unread messages: user 2 and 3 send while user 1 is away', async () => {
		const channelsWithUnread = [{ ...channel, unread_count: 0 }];
		(getUserChannelsAction as jest.Mock).mockResolvedValue({
			success: true,
			data: channelsWithUnread,
		});

		(useAuth as jest.Mock).mockReturnValue({ user: users[0] });
		(getMessages as jest.Mock).mockResolvedValue({ messages: [], hasMore: false });

		const { result: management } = renderHook(() =>
			useChatManagement({
				currentUserUid: users[0].id,
				currentUserRole: users[0].role,
				messages: [],
				messagesLoading: false,
			})
		);

		await act(async () => {
			await management.current.loadChannels();
		});

		// Simulate incoming messages from other users by updating channel unread
		act(() => {
			management.current.setChannels((prev: any[]) =>
				prev.map((ch) => (ch.id === 1 ? { ...ch, unread_count: 5 } : ch))
			);
		});

		expect(management.current.totalUnreadCount).toBe(0);

		// User 1 selects the channel
		act(() => {
			management.current.handleChannelSelect(channel);
		});

		expect(management.current.selectedChannel).toEqual(channel);
	});

	it('multiple users: loadMore pagination works correctly', async () => {
		const page1 = Array.from({ length: 50 }, (_, i) => ({
			id: i + 1,
			content: `Message ${i + 1}`,
			user_id: `user-${(i % 5) + 1}`,
			channel_id: 1,
			created_at: `2024-01-01T00:${String(i).padStart(2, '0')}:00Z`,
			edited_at: null,
			deleted_at: null,
			reply_to: null,
			users: {
				uid_user: `user-${(i % 5) + 1}`,
				username: `user${(i % 5) + 1}`,
				name: `User ${(i % 5) + 1}`,
				last_name: '',
				role: 'Admin',
			},
		}));

		const page2 = Array.from({ length: 10 }, (_, i) => ({
			id: i + 51,
			content: `Old message ${i + 51}`,
			user_id: `user-${(i % 5) + 1}`,
			channel_id: 1,
			created_at: `2023-12-31T23:${String(i).padStart(2, '0')}:00Z`,
			edited_at: null,
			deleted_at: null,
			reply_to: null,
			users: null,
		}));

		(getMessages as jest.Mock)
			.mockResolvedValueOnce({ messages: page1, hasMore: true })
			.mockResolvedValueOnce({ messages: page2, hasMore: false });

		const { result } = renderHook(() => useChatRealtime(1));

		await waitFor(() => {
			expect(result.current.messages).toHaveLength(50);
		});

		expect(result.current.hasMore).toBe(true);

		await act(async () => {
			await result.current.loadOlderMessages();
		});

		expect(result.current.messages).toHaveLength(60);
		expect(result.current.hasMore).toBe(false);
		// Older messages should be at the beginning
		expect(result.current.messages[0].content).toBe('Old message 51');
		expect(result.current.messages[10].content).toBe('Message 1');
	});
});
