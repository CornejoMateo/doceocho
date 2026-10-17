import { renderHook, act, waitFor } from '@testing-library/react';
import { useOptimizedRealtime } from '@/hooks/use-optimized-realtime';
import { getSupabaseClient } from '@/lib/supabase-client';

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: jest.fn(),
}));

describe('useOptimizedRealtime', () => {
	const mockSubscribe = jest.fn();
	const mockOn = jest.fn();
	const mockChannel = jest.fn();
	const mockRemoveChannel = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		localStorage.clear();

		mockSubscribe.mockReturnValue({});
		mockOn.mockReturnValue({
			subscribe: mockSubscribe,
		});

		mockChannel.mockReturnValue({
			on: mockOn,
			subscribe: mockSubscribe,
		});

		(getSupabaseClient as jest.Mock).mockReturnValue({
			channel: mockChannel,
			removeChannel: mockRemoveChannel,
		});
	});

	it('fetches data on mount', async () => {
		const fetchFromDb = jest.fn().mockResolvedValue([
			{ id: 1, name: 'Mateo' },
			{ id: 2, name: 'Juan' },
		]);

		const { result } = renderHook(() => useOptimizedRealtime('clients', fetchFromDb));

		expect(result.current.loading).toBe(true);

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		expect(fetchFromDb).toHaveBeenCalledTimes(1);

		expect(result.current.data).toEqual([
			{ id: 1, name: 'Mateo' },
			{ id: 2, name: 'Juan' },
		]);
	});

	it('loads data from cache first', async () => {
		localStorage.setItem(
			'test_cache',
			JSON.stringify({
				data: [{ id: 1, name: 'Cached user' }],
				timestamp: Date.now(),
				version: 1,
			})
		);

		const fetchFromDb = jest.fn().mockResolvedValue([{ id: 2, name: 'Fresh user' }]);

		const { result } = renderHook(() => useOptimizedRealtime('clients', fetchFromDb, 'test_cache'));

		expect(result.current.data).toEqual([{ id: 1, name: 'Cached user' }]);

		await waitFor(() => {
			expect(result.current.data).toEqual([{ id: 2, name: 'Fresh user' }]);
		});
	});

	it('handles fetch errors', async () => {
		const fetchFromDb = jest.fn().mockRejectedValue(new Error('DB Error'));

		const { result } = renderHook(() => useOptimizedRealtime('clients', fetchFromDb));

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		expect(result.current.error).toBe('DB Error');
		expect(result.current.data).toEqual([]);
	});

	it('refreshes data manually', async () => {
		const fetchFromDb = jest
			.fn()
			.mockResolvedValueOnce([{ id: 1, name: 'Old' }])
			.mockResolvedValueOnce([{ id: 2, name: 'New' }]);

		const { result } = renderHook(() => useOptimizedRealtime('clients', fetchFromDb));

		await waitFor(() => {
			expect(result.current.data).toEqual([{ id: 1, name: 'Old' }]);
		});

		await act(async () => {
			await result.current.refresh();
		});

		expect(result.current.data).toEqual([{ id: 2, name: 'New' }]);
	});

	it('invalidates cache and refetches', async () => {
		localStorage.setItem(
			'test_cache',
			JSON.stringify({
				data: [{ id: 1, name: 'Cached' }],
				timestamp: Date.now(),
				version: 1,
			})
		);

		const fetchFromDb = jest.fn().mockResolvedValue([{ id: 2, name: 'Fresh' }]);

		const { result } = renderHook(() => useOptimizedRealtime('clients', fetchFromDb, 'test_cache'));

		await waitFor(() => {
			expect(result.current.data).toEqual([{ id: 2, name: 'Fresh' }]);
		});

		await act(async () => {
			result.current.invalidateCache();
		});

		expect(localStorage.getItem('test_cache')).not.toContain('Cached');
	});

	it('subscribes to realtime changes', () => {
		const fetchFromDb = jest.fn().mockResolvedValue([]);

		renderHook(() => useOptimizedRealtime('clients', fetchFromDb));

		expect(mockChannel).toHaveBeenCalledWith('clients-optimized-realtime');

		expect(mockOn).toHaveBeenCalledWith(
			'postgres_changes',
			{
				event: '*',
				schema: 'public',
				table: 'clients',
			},
			expect.any(Function)
		);
	});

	it('triggers full fetch on INSERT/UPDATE for balances table', async () => {
		const fetchFromDb = jest
			.fn()
			.mockResolvedValueOnce([{ id: 1, amount: 100 }])
			.mockResolvedValue([{ id: 1, amount: 200 }]);

		renderHook(() => useOptimizedRealtime('balances', fetchFromDb));

		await waitFor(() => {
			expect(fetchFromDb).toHaveBeenCalledTimes(1);
		});

		const processEvent = mockOn.mock.calls[0][2];
		await act(async () => {
			processEvent({
				eventType: 'UPDATE',
				new: { id: 1, amount: 150 },
				old: { id: 1, amount: 100 },
			});
		});

		expect(fetchFromDb).toHaveBeenCalledTimes(2);
	});

	it('triggers full fetch on INSERT/UPDATE for folder_budgets table', async () => {
		const fetchFromDb = jest
			.fn()
			.mockResolvedValueOnce([{ id: 1, work_id: null }])
			.mockResolvedValue([{ id: 1, work_id: 5 }]);

		renderHook(() => useOptimizedRealtime('folder_budgets', fetchFromDb));

		await waitFor(() => {
			expect(fetchFromDb).toHaveBeenCalledTimes(1);
		});

		const processEvent = mockOn.mock.calls[0][2];
		await act(async () => {
			processEvent({
				eventType: 'UPDATE',
				new: { id: 1, work_id: 5 },
				old: { id: 1, work_id: null },
			});
		});

		expect(fetchFromDb).toHaveBeenCalledTimes(2);
	});

	it('does in-place update for other tables on UPDATE event', async () => {
		const fetchFromDb = jest.fn().mockResolvedValue([{ id: 1, name: 'Original' }]);

		const { result } = renderHook(() => useOptimizedRealtime('clients', fetchFromDb));

		await waitFor(() => {
			expect(result.current.data).toEqual([{ id: 1, name: 'Original' }]);
		});

		const processEvent = mockOn.mock.calls[0][2];
		await act(async () => {
			processEvent({
				eventType: 'UPDATE',
				new: { id: 1, name: 'Updated' },
				old: { id: 1, name: 'Original' },
			});
		});

		expect(fetchFromDb).toHaveBeenCalledTimes(1);
		expect(result.current.data).toEqual([{ id: 1, name: 'Updated' }]);
	});

	it('adds inserted record for other tables on INSERT event', async () => {
		const fetchFromDb = jest.fn().mockResolvedValue([{ id: 1, name: 'First' }]);

		const { result } = renderHook(() => useOptimizedRealtime('clients', fetchFromDb));

		await waitFor(() => {
			expect(result.current.data).toEqual([{ id: 1, name: 'First' }]);
		});

		const processEvent = mockOn.mock.calls[0][2];
		await act(async () => {
			processEvent({ eventType: 'INSERT', new: { id: 2, name: 'Second' } });
		});

		expect(fetchFromDb).toHaveBeenCalledTimes(1);
		expect(result.current.data).toHaveLength(2);
		expect(result.current.data[0]).toEqual({ id: 2, name: 'Second' });
	});

	it('removes deleted record for other tables on DELETE event', async () => {
		const fetchFromDb = jest.fn().mockResolvedValue([
			{ id: 1, name: 'First' },
			{ id: 2, name: 'Second' },
		]);

		const { result } = renderHook(() => useOptimizedRealtime('clients', fetchFromDb));

		await waitFor(() => {
			expect(result.current.data).toHaveLength(2);
		});

		const processEvent = mockOn.mock.calls[0][2];
		await act(async () => {
			processEvent({ eventType: 'DELETE', old: { id: 1 } });
		});

		expect(result.current.data).toHaveLength(1);
		expect(result.current.data[0]).toEqual({ id: 2, name: 'Second' });
	});

	it('cleans up realtime subscription on unmount', () => {
		const fetchFromDb = jest.fn().mockResolvedValue([]);

		const { unmount } = renderHook(() => useOptimizedRealtime('clients', fetchFromDb));

		unmount();

		expect(mockRemoveChannel).toHaveBeenCalled();
	});

	describe('users authorization gate', () => {
		it('stays inert while not authorized', async () => {
			const fetchFromDb = jest.fn().mockResolvedValue([{ id: 1, name: 'Admin' }]);

			const { result } = renderHook(() =>
				useOptimizedRealtime('users', fetchFromDb, 'users_cache', false)
			);

			expect(result.current.data).toEqual([]);
			expect(result.current.loading).toBe(false);
			expect(result.current.error).toBeNull();
			expect(fetchFromDb).not.toHaveBeenCalled();
			expect(mockChannel).not.toHaveBeenCalled();

			await act(async () => {
				result.current.refresh();
			});

			expect(fetchFromDb).not.toHaveBeenCalled();
		});

		it('does not crash and starts fetching when isAuthorized flips false -> true', async () => {
			const fetchFromDb = jest.fn().mockResolvedValue([{ id: 1, name: 'Admin' }]);

			const { result, rerender } = renderHook(
				({ isAuthorized }: { isAuthorized: boolean }) =>
					useOptimizedRealtime('users', fetchFromDb, 'users_cache', isAuthorized),
				{ initialProps: { isAuthorized: false } }
			);

			expect(result.current.data).toEqual([]);
			expect(fetchFromDb).not.toHaveBeenCalled();

			// Same hook instance, gate flips: this used to throw a hook-order error.
			await act(async () => {
				rerender({ isAuthorized: true });
			});

			await waitFor(() => {
				expect(result.current.data).toEqual([{ id: 1, name: 'Admin' }]);
			});

			expect(result.current.loading).toBe(false);
			expect(fetchFromDb).toHaveBeenCalledTimes(1);
			expect(mockChannel).toHaveBeenCalledWith('users-optimized-realtime');
		});

		it('does not crash and goes inert when isAuthorized flips true -> false', async () => {
			const fetchFromDb = jest.fn().mockResolvedValue([{ id: 1, name: 'Admin' }]);

			const { result, rerender } = renderHook(
				({ isAuthorized }: { isAuthorized: boolean }) =>
					useOptimizedRealtime('users', fetchFromDb, 'users_cache', isAuthorized),
				{ initialProps: { isAuthorized: true } }
			);

			await waitFor(() => {
				expect(result.current.data).toEqual([{ id: 1, name: 'Admin' }]);
			});

			// Same hook instance, gate closes (logout): this used to throw a hook-order error.
			await act(async () => {
				rerender({ isAuthorized: false });
			});

			expect(result.current.data).toEqual([]);
			expect(result.current.loading).toBe(false);
			expect(result.current.error).toBeNull();
			expect(mockRemoveChannel).toHaveBeenCalled();
		});

		it('keeps the gated return values referentially stable across renders', () => {
			const fetchFromDb = jest.fn().mockResolvedValue([]);

			const { result, rerender } = renderHook(
				({ isAuthorized }: { isAuthorized: boolean }) =>
					useOptimizedRealtime('users', fetchFromDb, 'users_cache', isAuthorized),
				{ initialProps: { isAuthorized: false } }
			);

			const firstData = result.current.data;
			const firstRefresh = result.current.refresh;

			rerender({ isAuthorized: false });

			expect(result.current.data).toBe(firstData);
			expect(result.current.refresh).toBe(firstRefresh);
		});

		it('does not gate non-users tables when isAuthorized is omitted', async () => {
			const fetchFromDb = jest.fn().mockResolvedValue([{ id: 1, name: 'Client' }]);

			const { result } = renderHook(() => useOptimizedRealtime('clients', fetchFromDb));

			await waitFor(() => {
				expect(result.current.data).toEqual([{ id: 1, name: 'Client' }]);
			});

			expect(fetchFromDb).toHaveBeenCalledTimes(1);
			expect(mockChannel).toHaveBeenCalledWith('clients-optimized-realtime');
		});
	});
});
