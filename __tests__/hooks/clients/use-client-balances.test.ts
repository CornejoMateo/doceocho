import { renderHook, act } from '@testing-library/react';
import { useClientBalances } from '@/hooks/clients/use-client-balances';
import { useOptimizedRealtime } from '@/hooks/use-optimized-realtime';
import { getBalancesByClientId } from '@/lib/balances/balances';

jest.mock('@/hooks/use-optimized-realtime', () => ({
	useOptimizedRealtime: jest.fn(),
}));

jest.mock('@/lib/balances/balances', () => ({
	getBalancesByClientId: jest.fn(),
}));

const mockRealtime = useOptimizedRealtime as jest.Mock;

describe('useClientBalances', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('does not fetch when clientId is undefined', () => {
		mockRealtime.mockReturnValue({
			data: [],
			loading: false,
			refresh: jest.fn(),
			invalidateCache: jest.fn(),
		});

		const { result } = renderHook(() => useClientBalances());

		expect(result.current.balances).toEqual([]);
		expect(result.current.isLoading).toBe(false);
		expect(getBalancesByClientId).not.toHaveBeenCalled();
	});

	it('fetches balances for the client and exposes them', () => {
		const balances = [
			{ id: 1, budget: { folder_budget: { work_id: 1 } } },
			{ id: 2, budget: { folder_budget: { work_id: 1 } } },
		];
		mockRealtime.mockImplementation((_table, fetchFromDb) => ({
			data: balances,
			loading: false,
			refresh: jest.fn(),
			invalidateCache: jest.fn(),
			fetch: fetchFromDb,
		}));

		const { result } = renderHook(() => useClientBalances(5));

		expect(result.current.balances).toEqual(balances);
		expect(result.current.isLoading).toBe(false);
	});

	it('exposes the refresh function from useOptimizedRealtime', () => {
		const refresh = jest.fn();
		mockRealtime.mockReturnValue({
			data: [],
			loading: false,
			refresh,
			invalidateCache: jest.fn(),
		});

		const { result } = renderHook(() => useClientBalances(5));

		expect(result.current.refresh).toBe(refresh);
	});

	it('invalidates cache when the clientId changes', () => {
		const invalidateCache = jest.fn();
		mockRealtime.mockReturnValue({
			data: [],
			loading: false,
			refresh: jest.fn(),
			invalidateCache,
		});

		const { rerender } = renderHook(({ clientId }) => useClientBalances(clientId), {
			initialProps: { clientId: 1 },
		});

		rerender({ clientId: 2 });

		expect(invalidateCache).toHaveBeenCalled();
	});

	it('does not invalidate cache when the clientId stays the same', () => {
		const invalidateCache = jest.fn();
		mockRealtime.mockReturnValue({
			data: [],
			loading: false,
			refresh: jest.fn(),
			invalidateCache,
		});

		const { rerender } = renderHook(({ clientId }) => useClientBalances(clientId), {
			initialProps: { clientId: 1 },
		});

		rerender({ clientId: 1 });

		expect(invalidateCache).not.toHaveBeenCalled();
	});
});
