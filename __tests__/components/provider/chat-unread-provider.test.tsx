import { render, screen, act } from '@testing-library/react';
import { ChatUnreadProvider, useChatUnread } from '@/components/provider/chat-unread-provider';

jest.mock('@/components/provider/auth-provider', () => ({
	useAuth: jest.fn(),
}));

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: jest.fn(),
}));

function TestConsumer() {
	const {
		totalUnreadCount,
		incrementUnreadCount,
		decrementUnreadCount,
		setUnreadCount,
		fetchUnreadCount,
	} = useChatUnread();

	return (
		<div>
			<span data-testid="count">{totalUnreadCount}</span>
			<button onClick={() => incrementUnreadCount()}>inc</button>
			<button onClick={() => incrementUnreadCount(5)}>inc5</button>
			<button onClick={() => decrementUnreadCount()}>dec</button>
			<button onClick={() => decrementUnreadCount(10)}>dec10</button>
			<button onClick={() => setUnreadCount(42)}>set42</button>
			<button onClick={() => setUnreadCount(-5)}>setNeg</button>
			<button onClick={() => fetchUnreadCount()}>fetch</button>
		</div>
	);
}

function ThrowingConsumer() {
	useChatUnread();
	return null;
}

const mockUser = { id: 'user-1' };

function setupSupabase(overrides = {}) {
	const mockSubscribe = jest.fn();
	const mockOnChain: any = {};
	mockOnChain.on = jest.fn().mockReturnValue(mockOnChain);
	mockOnChain.subscribe = mockSubscribe;
	const mockChannel = jest.fn().mockReturnValue(mockOnChain);
	const mockRemoveChannel = jest.fn();
	const mockRpc = jest.fn().mockResolvedValue({ data: 5, error: null });

	const supabase = {
		channel: mockChannel,
		removeChannel: mockRemoveChannel,
		rpc: mockRpc,
		...overrides,
	};

	const { getSupabaseClient } = require('@/lib/supabase-client');
	(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

	return supabase;
}

describe('ChatUnreadProvider', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('throws when useChatUnread is used outside provider', () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
		expect(() => render(<ThrowingConsumer />)).toThrow(
			'useChatUnread must be used within a ChatUnreadProvider'
		);
		spy.mockRestore();
	});

	it('renders children', () => {
		const { useAuth } = require('@/components/provider/auth-provider');
		(useAuth as jest.Mock).mockReturnValue({ user: mockUser });
		setupSupabase();

		render(
			<ChatUnreadProvider>
				<div data-testid="child">Hello</div>
			</ChatUnreadProvider>
		);
		expect(screen.getByTestId('child')).toBeInTheDocument();
	});

	it('provides initial totalUnreadCount of 0', () => {
		const { useAuth } = require('@/components/provider/auth-provider');
		(useAuth as jest.Mock).mockReturnValue({ user: mockUser });
		setupSupabase();

		render(
			<ChatUnreadProvider>
				<TestConsumer />
			</ChatUnreadProvider>
		);
		expect(screen.getByTestId('count')).toHaveTextContent('0');
	});

	it('fetches unread count on mount and displays result', async () => {
		const { useAuth } = require('@/components/provider/auth-provider');
		(useAuth as jest.Mock).mockReturnValue({ user: mockUser });
		const supabase = setupSupabase();
		supabase.rpc.mockResolvedValue({ data: 7, error: null });

		await act(async () => {
			render(
				<ChatUnreadProvider>
					<TestConsumer />
				</ChatUnreadProvider>
			);
		});

		expect(supabase.rpc).toHaveBeenCalledWith('get_unread_messages_count', { p_user_id: 'user-1' });
		expect(screen.getByTestId('count')).toHaveTextContent('7');
	});

	it('sets count to 0 when user is null', async () => {
		const { useAuth } = require('@/components/provider/auth-provider');
		(useAuth as jest.Mock).mockReturnValue({ user: null });

		await act(async () => {
			render(
				<ChatUnreadProvider>
					<TestConsumer />
				</ChatUnreadProvider>
			);
		});

		expect(screen.getByTestId('count')).toHaveTextContent('0');
	});

	it('does not call RPC when user is null', async () => {
		const { useAuth } = require('@/components/provider/auth-provider');
		(useAuth as jest.Mock).mockReturnValue({ user: null });
		const supabase = setupSupabase();

		await act(async () => {
			render(
				<ChatUnreadProvider>
					<TestConsumer />
				</ChatUnreadProvider>
			);
		});

		expect(supabase.rpc).not.toHaveBeenCalled();
	});

	it('handles RPC error gracefully', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
		const { useAuth } = require('@/components/provider/auth-provider');
		(useAuth as jest.Mock).mockReturnValue({ user: mockUser });
		const supabase = setupSupabase();
		supabase.rpc.mockResolvedValue({ data: null, error: { message: 'fail' } });

		await act(async () => {
			render(
				<ChatUnreadProvider>
					<TestConsumer />
				</ChatUnreadProvider>
			);
		});

		expect(screen.getByTestId('count')).toHaveTextContent('0');
		spy.mockRestore();
	});

	it('handles thrown error in fetchUnreadCount gracefully', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
		const { useAuth } = require('@/components/provider/auth-provider');
		(useAuth as jest.Mock).mockReturnValue({ user: mockUser });
		const supabase = setupSupabase();
		supabase.rpc.mockRejectedValue(new Error('network'));

		await act(async () => {
			render(
				<ChatUnreadProvider>
					<TestConsumer />
				</ChatUnreadProvider>
			);
		});

		expect(screen.getByTestId('count')).toHaveTextContent('0');
		spy.mockRestore();
	});

	it('defaults to 0 when RPC returns null data', async () => {
		const { useAuth } = require('@/components/provider/auth-provider');
		(useAuth as jest.Mock).mockReturnValue({ user: mockUser });
		const supabase = setupSupabase();
		supabase.rpc.mockResolvedValue({ data: null, error: null });

		await act(async () => {
			render(
				<ChatUnreadProvider>
					<TestConsumer />
				</ChatUnreadProvider>
			);
		});

		expect(screen.getByTestId('count')).toHaveTextContent('0');
	});

	it('subscribes to messages INSERT and channel_members UPDATE', async () => {
		const { useAuth } = require('@/components/provider/auth-provider');
		(useAuth as jest.Mock).mockReturnValue({ user: mockUser });
		const supabase = setupSupabase();

		await act(async () => {
			render(
				<ChatUnreadProvider>
					<TestConsumer />
				</ChatUnreadProvider>
			);
		});

		expect(supabase.channel).toHaveBeenCalledWith('chat-unread-user-1');
		expect(supabase.channel().on).toHaveBeenCalledTimes(2);

		expect(supabase.channel().on).toHaveBeenCalledWith(
			'postgres_changes',
			{ event: 'INSERT', schema: 'public', table: 'messages' },
			expect.any(Function)
		);
		expect(supabase.channel().on).toHaveBeenCalledWith(
			'postgres_changes',
			{ event: 'UPDATE', schema: 'public', table: 'channel_members', filter: 'user_id=eq.user-1' },
			expect.any(Function)
		);
		expect(supabase.channel().on().subscribe).toHaveBeenCalled();
	});

	it('cleans up subscription on unmount', async () => {
		const { useAuth } = require('@/components/provider/auth-provider');
		(useAuth as jest.Mock).mockReturnValue({ user: mockUser });
		const supabase = setupSupabase();

		const { unmount } = await act(async () => {
			const result = render(
				<ChatUnreadProvider>
					<TestConsumer />
				</ChatUnreadProvider>
			);
			return result;
		});

		unmount();

		expect(supabase.removeChannel).toHaveBeenCalled();
	});

	it('refetches unread count when postgres_changes triggers', async () => {
		const { useAuth } = require('@/components/provider/auth-provider');
		(useAuth as jest.Mock).mockReturnValue({ user: mockUser });
		const supabase = setupSupabase();

		let rpcCallCount = 0;
		supabase.rpc.mockImplementation(async () => {
			rpcCallCount++;
			return { data: rpcCallCount === 1 ? 2 : 10, error: null };
		});

		await act(async () => {
			render(
				<ChatUnreadProvider>
					<TestConsumer />
				</ChatUnreadProvider>
			);
		});

		expect(screen.getByTestId('count')).toHaveTextContent('2');

		// Simulate postgres_changes trigger by calling the callback
		const messagesCallback = supabase.channel().on.mock.calls[0][2];

		await act(async () => {
			messagesCallback();
		});

		expect(screen.getByTestId('count')).toHaveTextContent('10');
	});

	it('incrementUnreadCount increases count by 1 by default', async () => {
		const { useAuth } = require('@/components/provider/auth-provider');
		(useAuth as jest.Mock).mockReturnValue({ user: mockUser });
		const supabase = setupSupabase();
		supabase.rpc.mockResolvedValue({ data: 3, error: null });

		await act(async () => {
			render(
				<ChatUnreadProvider>
					<TestConsumer />
				</ChatUnreadProvider>
			);
		});

		expect(screen.getByTestId('count')).toHaveTextContent('3');

		await act(async () => {
			screen.getByText('inc').click();
		});

		expect(screen.getByTestId('count')).toHaveTextContent('4');
	});

	it('incrementUnreadCount with custom amount', async () => {
		const { useAuth } = require('@/components/provider/auth-provider');
		(useAuth as jest.Mock).mockReturnValue({ user: mockUser });
		const supabase = setupSupabase();
		supabase.rpc.mockResolvedValue({ data: 1, error: null });

		await act(async () => {
			render(
				<ChatUnreadProvider>
					<TestConsumer />
				</ChatUnreadProvider>
			);
		});

		await act(async () => {
			screen.getByText('inc5').click();
		});

		expect(screen.getByTestId('count')).toHaveTextContent('6');
	});

	it('decrementUnreadCount decreases count by 1 by default', async () => {
		const { useAuth } = require('@/components/provider/auth-provider');
		(useAuth as jest.Mock).mockReturnValue({ user: mockUser });
		const supabase = setupSupabase();
		supabase.rpc.mockResolvedValue({ data: 5, error: null });

		await act(async () => {
			render(
				<ChatUnreadProvider>
					<TestConsumer />
				</ChatUnreadProvider>
			);
		});

		await act(async () => {
			screen.getByText('dec').click();
		});

		expect(screen.getByTestId('count')).toHaveTextContent('4');
	});

	it('decrementUnreadCount does not go below 0', async () => {
		const { useAuth } = require('@/components/provider/auth-provider');
		(useAuth as jest.Mock).mockReturnValue({ user: mockUser });
		const supabase = setupSupabase();
		supabase.rpc.mockResolvedValue({ data: 3, error: null });

		await act(async () => {
			render(
				<ChatUnreadProvider>
					<TestConsumer />
				</ChatUnreadProvider>
			);
		});

		await act(async () => {
			screen.getByText('dec10').click();
		});

		expect(screen.getByTestId('count')).toHaveTextContent('0');
	});

	it('setUnreadCount sets the count', async () => {
		const { useAuth } = require('@/components/provider/auth-provider');
		(useAuth as jest.Mock).mockReturnValue({ user: mockUser });
		const supabase = setupSupabase();

		await act(async () => {
			render(
				<ChatUnreadProvider>
					<TestConsumer />
				</ChatUnreadProvider>
			);
		});

		await act(async () => {
			screen.getByText('set42').click();
		});

		expect(screen.getByTestId('count')).toHaveTextContent('42');
	});

	it('setUnreadCount does not go below 0', async () => {
		const { useAuth } = require('@/components/provider/auth-provider');
		(useAuth as jest.Mock).mockReturnValue({ user: mockUser });
		const supabase = setupSupabase();

		await act(async () => {
			render(
				<ChatUnreadProvider>
					<TestConsumer />
				</ChatUnreadProvider>
			);
		});

		await act(async () => {
			screen.getByText('setNeg').click();
		});

		expect(screen.getByTestId('count')).toHaveTextContent('0');
	});

	it('manual fetch works via exposed fetchUnreadCount', async () => {
		const { useAuth } = require('@/components/provider/auth-provider');
		(useAuth as jest.Mock).mockReturnValue({ user: mockUser });
		const supabase = setupSupabase();

		let callCount = 0;
		supabase.rpc.mockImplementation(async () => {
			callCount++;
			return { data: callCount, error: null };
		});

		await act(async () => {
			render(
				<ChatUnreadProvider>
					<TestConsumer />
				</ChatUnreadProvider>
			);
		});

		expect(screen.getByTestId('count')).toHaveTextContent('1');

		await act(async () => {
			screen.getByText('fetch').click();
		});

		expect(screen.getByTestId('count')).toHaveTextContent('2');
	});
});
