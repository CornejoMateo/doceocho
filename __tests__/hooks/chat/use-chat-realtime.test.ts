import { renderHook, act, waitFor } from '@testing-library/react';
import { useChatRealtime } from '@/hooks/chat/use-chat-realtime';

jest.mock('@/components/provider/auth-provider', () => ({
	useAuth: jest.fn().mockReturnValue({
		user: { id: 'user-1', username: 'admin', name: 'Admin', last_name: 'User', role: 'Admin' },
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

jest.mock('@/lib/chat/messages-client', () => ({
	getMessages: jest.fn(),
}));

import { getMessages } from '@/lib/chat/messages-client';

const messages = [
	{
		id: 1,
		content: 'Hola',
		user_id: 'user-1',
		channel_id: 1,
		created_at: '2024-01-01T00:00:00Z',
		edited_at: null,
		deleted_at: null,
		reply_to: null,
		users: {
			uid_user: 'user-1',
			username: 'admin',
			name: 'Admin',
			last_name: 'User',
			role: 'Admin',
		},
	},
	{
		id: 2,
		content: 'Hello',
		user_id: 'user-2',
		channel_id: 1,
		created_at: '2024-01-01T00:01:00Z',
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
	{
		id: 3,
		content: 'Hey',
		user_id: 'user-3',
		channel_id: 1,
		created_at: '2024-01-01T00:02:00Z',
		edited_at: null,
		deleted_at: null,
		reply_to: 1,
		users: {
			uid_user: 'user-3',
			username: 'pedro',
			name: 'Pedro',
			last_name: 'García',
			role: 'Taller',
		},
	},
];

describe('useChatRealtime', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('has correct initial state', () => {
		const { result } = renderHook(() => useChatRealtime(null));

		expect(result.current.messages).toEqual([]);
		expect(result.current.loading).toBe(false);
		expect(result.current.loadingMore).toBe(false);
		expect(result.current.hasMore).toBe(true);
		expect(result.current.error).toBeNull();
	});

	it('fetches messages when channelId is provided', async () => {
		(getMessages as jest.Mock).mockResolvedValue({ messages, hasMore: false });

		const { result } = renderHook(() => useChatRealtime(1));

		expect(result.current.loading).toBe(true);

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		expect(result.current.messages).toHaveLength(3);
		expect(result.current.messages[0].content).toBe('Hola');
		expect(result.current.hasMore).toBe(false);
	});

	it('clears messages when channelId is null', async () => {
		(getMessages as jest.Mock).mockResolvedValue({ messages, hasMore: false });

		const { result, rerender } = renderHook(({ channelId }) => useChatRealtime(channelId), {
			initialProps: { channelId: 1 as number | null },
		});

		await waitFor(() => {
			expect(result.current.messages).toHaveLength(3);
		});

		rerender({ channelId: null });

		await waitFor(() => {
			expect(result.current.messages).toEqual([]);
		});
	});

	it('loadOlderMessages prepends older messages', async () => {
		const olderMessages = [
			{
				id: -1,
				content: 'Even older',
				user_id: 'user-5',
				channel_id: 1,
				created_at: '2023-12-31T22:00:00Z',
				edited_at: null,
				deleted_at: null,
				reply_to: null,
				users: null,
			},
			{
				id: 0,
				content: 'Old message',
				user_id: 'user-4',
				channel_id: 1,
				created_at: '2023-12-31T23:00:00Z',
				edited_at: null,
				deleted_at: null,
				reply_to: null,
				users: null,
			},
		];

		(getMessages as jest.Mock)
			.mockResolvedValueOnce({ messages, hasMore: true })
			.mockResolvedValueOnce({ messages: olderMessages, hasMore: false });

		const { result } = renderHook(() => useChatRealtime(1));

		await waitFor(() => {
			expect(result.current.messages).toHaveLength(3);
		});

		await act(async () => {
			await result.current.loadOlderMessages();
		});

		expect(result.current.messages).toHaveLength(5);
		expect(result.current.messages[0].content).toBe('Even older');
		expect(result.current.hasMore).toBe(false);
	});

	it('loadOlderMessages does nothing when hasMore is false', async () => {
		(getMessages as jest.Mock).mockResolvedValue({ messages, hasMore: false });

		const { result } = renderHook(() => useChatRealtime(1));

		await waitFor(() => {
			expect(result.current.messages).toHaveLength(3);
		});

		await act(async () => {
			await result.current.loadOlderMessages();
		});

		expect(getMessages).toHaveBeenCalledTimes(1);
	});

	it('loadOlderMessages does nothing when loadingMore is true', async () => {
		let resolveFirstLoad: any;

		(getMessages as jest.Mock).mockResolvedValueOnce({ messages, hasMore: true });

		const { result } = renderHook(() => useChatRealtime(1));

		await waitFor(() => {
			expect(result.current.messages).toHaveLength(3);
		});

		(getMessages as jest.Mock).mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					resolveFirstLoad = resolve;
				})
		);

		await act(async () => {
			result.current.loadOlderMessages();
		});

		expect(result.current.loadingMore).toBe(true);
		expect(getMessages).toHaveBeenCalledTimes(2);

		await act(async () => {
			result.current.loadOlderMessages();
		});

		expect(getMessages).toHaveBeenCalledTimes(2);

		await act(async () => {
			resolveFirstLoad({ messages: [], hasMore: false });
		});

		expect(result.current.loadingMore).toBe(false);
	});

	it('deduplicates messages from loadOlderMessages', async () => {
		const olderMessages = [
			{
				id: 1,
				content: 'Duplicate',
				user_id: 'user-2',
				channel_id: 1,
				created_at: '2023-12-31T23:00:00Z',
				edited_at: null,
				deleted_at: null,
				reply_to: null,
				users: null,
			},
		];

		(getMessages as jest.Mock)
			.mockResolvedValueOnce({ messages, hasMore: true })
			.mockResolvedValueOnce({ messages: olderMessages, hasMore: false });

		const { result } = renderHook(() => useChatRealtime(1));

		await waitFor(() => {
			expect(result.current.messages).toHaveLength(3);
		});

		await act(async () => {
			await result.current.loadOlderMessages();
		});

		expect(result.current.messages).toHaveLength(3);
	});

	it('refresh re-fetches messages', async () => {
		(getMessages as jest.Mock).mockResolvedValue({ messages, hasMore: false });

		const { result } = renderHook(() => useChatRealtime(1));

		await waitFor(() => {
			expect(result.current.messages).toHaveLength(3);
		});

		const newMessages = [
			...messages,
			{
				id: 4,
				content: 'New!',
				user_id: 'user-1',
				channel_id: 1,
				created_at: '2024-01-01T00:03:00Z',
				edited_at: null,
				deleted_at: null,
				reply_to: null,
				users: null,
			},
		];
		(getMessages as jest.Mock).mockResolvedValue({ messages: newMessages, hasMore: false });

		await act(async () => {
			result.current.refresh();
		});

		await waitFor(() => {
			expect(result.current.messages).toHaveLength(4);
		});
	});

	it('sets up realtime channel subscription for the given channelId', async () => {
		const supabase = require('@/lib/supabase-client').getSupabaseClient();
		(getMessages as jest.Mock).mockResolvedValue({ messages: [], hasMore: false });

		renderHook(() => useChatRealtime(1));

		expect(supabase.channel).toHaveBeenCalledWith('messages-1');
	});

	it('does not set up realtime subscription when channelId is null', () => {
		const supabase = require('@/lib/supabase-client').getSupabaseClient();

		renderHook(() => useChatRealtime(null));

		expect(supabase.channel).not.toHaveBeenCalled();
	});

	it('cleans up realtime subscription on unmount', async () => {
		const supabase = require('@/lib/supabase-client').getSupabaseClient();
		const mockChannel = {
			on: jest.fn().mockReturnThis(),
			subscribe: jest.fn().mockReturnThis(),
		};
		supabase.channel.mockReturnValue(mockChannel);
		(getMessages as jest.Mock).mockResolvedValue({ messages: [], hasMore: false });

		const { unmount } = renderHook(() => useChatRealtime(1));

		unmount();

		expect(supabase.removeChannel).toHaveBeenCalledWith(mockChannel);
	});

	it('sets error when initial fetch fails', async () => {
		(getMessages as jest.Mock).mockRejectedValue(new Error('Failed to fetch messages'));

		const { result } = renderHook(() => useChatRealtime(1));

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		expect(result.current.error).toBe('Failed to fetch messages');
		expect(result.current.messages).toEqual([]);
	});

	it('fetches messages again when channelId changes', async () => {
		(getMessages as jest.Mock)
			.mockResolvedValueOnce({ messages, hasMore: false })
			.mockResolvedValueOnce({
				messages: [{ ...messages[0], id: 10, content: 'New channel' }],
				hasMore: false,
			});

		const { result, rerender } = renderHook(({ channelId }) => useChatRealtime(channelId), {
			initialProps: {
				channelId: 1,
			},
		});

		await waitFor(() => {
			expect(result.current.messages).toHaveLength(3);
		});

		rerender({
			channelId: 2,
		});

		await waitFor(() => {
			expect(result.current.messages[0].content).toBe('New channel');
		});

		expect(getMessages).toHaveBeenCalledTimes(2);
	});

	it('removes previous realtime channel when channelId changes', async () => {
		const supabase = require('@/lib/supabase-client').getSupabaseClient();

		const channel1 = {
			on: jest.fn().mockReturnThis(),
			subscribe: jest.fn().mockReturnThis(),
		};

		const channel2 = {
			on: jest.fn().mockReturnThis(),
			subscribe: jest.fn().mockReturnThis(),
		};

		supabase.channel.mockReturnValueOnce(channel1).mockReturnValueOnce(channel2);

		(getMessages as jest.Mock).mockResolvedValue({
			messages: [],
			hasMore: false,
		});

		const { rerender } = renderHook(({ id }) => useChatRealtime(id), {
			initialProps: {
				id: 1,
			},
		});

		rerender({
			id: 2,
		});

		expect(supabase.removeChannel).toHaveBeenCalledWith(channel1);
	});

	it('adds message received from realtime INSERT', async () => {
		const supabase = require('@/lib/supabase-client').getSupabaseClient();

		let realtimeCallback: any;
		const mockChannel = {
			on: jest.fn().mockImplementation((_event: any, _filter: any, cb: any) => {
				realtimeCallback = cb;
				return mockChannel;
			}),
			subscribe: jest.fn().mockReturnThis(),
		};
		supabase.channel.mockReturnValue(mockChannel);
		supabase.from = jest.fn().mockReturnValue({
			select: jest.fn().mockReturnValue({
				eq: jest.fn().mockReturnValue({
					single: jest.fn().mockResolvedValue({
						data: {
							uid_user: 'user-1',
							username: 'admin',
							name: 'Admin',
							last_name: 'User',
							role: 'Admin',
						},
					}),
				}),
			}),
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
					id: 5,
					content: 'Realtime message',
					user_id: 'user-1',
					channel_id: 1,
					created_at: '2024-01-01T00:05:00Z',
					edited_at: null,
					deleted_at: null,
					reply_to: null,
				},
			});
		});

		await waitFor(() => {
			expect(result.current.messages).toHaveLength(1);
		});

		expect(result.current.messages[0].content).toBe('Realtime message');
	});
});
