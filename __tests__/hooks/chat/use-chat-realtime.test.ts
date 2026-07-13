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

jest.mock('@/lib/chat/messages', () => ({
	getMessagesAction: jest.fn(),
}));

import { getMessagesAction } from '@/lib/chat/messages';

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
		(getMessagesAction as jest.Mock).mockResolvedValue({ data: messages, hasMore: false });

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
		(getMessagesAction as jest.Mock).mockResolvedValue({ data: messages, hasMore: false });

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

	it('loadMore prepends older messages and returns count', async () => {
		const olderMessages = [
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
		];

		(getMessagesAction as jest.Mock)
			.mockResolvedValueOnce({ data: messages, hasMore: true })
			.mockResolvedValueOnce({ data: olderMessages, hasMore: false });

		const { result } = renderHook(() => useChatRealtime(1));

		await waitFor(() => {
			expect(result.current.messages).toHaveLength(3);
		});

		let addedCount = 0;
		await act(async () => {
			addedCount = await result.current.loadMore();
		});

		expect(addedCount).toBe(2);
		expect(result.current.messages).toHaveLength(5);
		expect(result.current.messages[0].content).toBe('Old message');
		expect(result.current.hasMore).toBe(false);
	});

	it('loadMore does nothing when hasMore is false', async () => {
		(getMessagesAction as jest.Mock).mockResolvedValue({ data: messages, hasMore: false });

		const { result } = renderHook(() => useChatRealtime(1));

		await waitFor(() => {
			expect(result.current.messages).toHaveLength(3);
		});

		let addedCount = 0;
		await act(async () => {
			addedCount = await result.current.loadMore();
		});

		expect(addedCount).toBe(0);
		expect(getMessagesAction).toHaveBeenCalledTimes(1);
	});

	it('loadMore returns 0 on error', async () => {
		(getMessagesAction as jest.Mock)
			.mockResolvedValueOnce({ data: messages, hasMore: true })
			.mockResolvedValueOnce({ data: null, error: 'Network error' });

		const { result } = renderHook(() => useChatRealtime(1));

		await waitFor(() => {
			expect(result.current.messages).toHaveLength(3);
		});

		let addedCount = 0;
		await act(async () => {
			addedCount = await result.current.loadMore();
		});

		expect(addedCount).toBe(0);
		expect(result.current.error).toBe('Network error');
	});

	it('deduplicates messages via window event', async () => {
		(getMessagesAction as jest.Mock).mockResolvedValue({ data: messages, hasMore: false });

		const { result } = renderHook(() => useChatRealtime(1));

		await waitFor(() => {
			expect(result.current.messages).toHaveLength(3);
		});

		act(() => {
			window.dispatchEvent(new CustomEvent('new-message', { detail: messages[0] }));
		});

		await waitFor(() => {
			expect(result.current.messages).toHaveLength(3);
		});

		act(() => {
			window.dispatchEvent(new CustomEvent('new-message', { detail: { ...messages[0], id: 99 } }));
		});

		await waitFor(() => {
			expect(result.current.messages).toHaveLength(4);
		});
	});

	it('refresh re-fetches messages', async () => {
		(getMessagesAction as jest.Mock).mockResolvedValue({ data: messages, hasMore: false });

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
		(getMessagesAction as jest.Mock).mockResolvedValue({ data: newMessages, hasMore: false });

		await act(async () => {
			result.current.refresh();
		});

		await waitFor(() => {
			expect(result.current.messages).toHaveLength(4);
		});
	});

	it('handles window new-message event', async () => {
		(getMessagesAction as jest.Mock).mockResolvedValue({ data: messages, hasMore: false });

		const { result } = renderHook(() => useChatRealtime(1));

		await waitFor(() => {
			expect(result.current.messages).toHaveLength(3);
		});

		const newMsg = {
			id: 4,
			content: 'From event',
			user_id: 'user-2',
			channel_id: 1,
			created_at: '2024-01-01T00:04:00Z',
			edited_at: null,
			deleted_at: null,
			reply_to: null,
			users: null,
		};

		act(() => {
			window.dispatchEvent(new CustomEvent('new-message', { detail: newMsg }));
		});

		await waitFor(() => {
			expect(result.current.messages).toHaveLength(4);
		});

		expect(result.current.messages[3].content).toBe('From event');
	});

	it('ignores duplicate new-message events', async () => {
		(getMessagesAction as jest.Mock).mockResolvedValue({ data: messages, hasMore: false });

		const { result } = renderHook(() => useChatRealtime(1));

		await waitFor(() => {
			expect(result.current.messages).toHaveLength(3);
		});

		const existingMsg = messages[0];

		act(() => {
			window.dispatchEvent(new CustomEvent('new-message', { detail: existingMsg }));
		});

		await waitFor(() => {
			expect(result.current.messages).toHaveLength(3);
		});
	});

	it('sets up realtime channel subscription for the given channelId', async () => {
		const supabase = require('@/lib/supabase-client').getSupabaseClient();
		(getMessagesAction as jest.Mock).mockResolvedValue({ data: [], hasMore: false });

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
		(getMessagesAction as jest.Mock).mockResolvedValue({ data: [], hasMore: false });

		const { unmount } = renderHook(() => useChatRealtime(1));

		unmount();

		expect(supabase.removeChannel).toHaveBeenCalledWith(mockChannel);
	});
	it('sets error when initial fetch fails', async () => {
		(getMessagesAction as jest.Mock).mockResolvedValue({
			data: null,
			error: 'Failed to fetch messages',
		});

		const { result } = renderHook(() => useChatRealtime(1));

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		expect(result.current.error).toBe('Failed to fetch messages');
		expect(result.current.messages).toEqual([]);
	});
	it('does not update state after unmount during fetch', async () => {
		let resolveFetch: any;

		(getMessagesAction as jest.Mock).mockImplementation(
			() =>
				new Promise((resolve) => {
					resolveFetch = resolve;
				})
		);

		const { result, unmount } = renderHook(() => useChatRealtime(1));

		expect(result.current.loading).toBe(true);

		unmount();

		await act(async () => {
			resolveFetch({
				data: messages,
				hasMore: false,
			});
		});

		expect(result.current.messages).toEqual([]);
	});
	it('fetches messages again when channelId changes', async () => {
		(getMessagesAction as jest.Mock)
			.mockResolvedValueOnce({
				data: messages,
				hasMore: false,
			})
			.mockResolvedValueOnce({
				data: [{ ...messages[0], id: 10, content: 'New channel' }],
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

		expect(getMessagesAction).toHaveBeenCalledTimes(2);
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

		(getMessagesAction as jest.Mock).mockResolvedValue({
			data: [],
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

		(getMessagesAction as jest.Mock).mockResolvedValue({
			data: [],
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
