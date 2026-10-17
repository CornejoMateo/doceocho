import { StrictMode } from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useBalancesReport } from '@/hooks/balances/use-balances-report';
import { useOptimizedRealtime } from '@/hooks/use-optimized-realtime';
import { getTotalsByBalanceIds } from '@/lib/balances/balance_transactions';

jest.mock('@/hooks/use-optimized-realtime');
jest.mock('@/lib/balances/balances', () => ({ listBalancesForReport: jest.fn() }));
jest.mock('@/lib/balances/balance_transactions', () => ({
	getTotalsByBalanceIds: jest.fn(),
}));

const freezeFilteredRows = { enabled: false };
jest.mock('@/helpers/balances/filter-balances', () => {
	const actual = jest.requireActual('@/helpers/balances/filter-balances');
	return {
		...actual,
		applyBalanceFilters: (...args: any[]) => {
			const out = actual.applyBalanceFilters(...args);
			return freezeFilteredRows.enabled ? Object.freeze([...out]) : out;
		},
	};
});

const refresh = jest.fn();

const makeBalance = (over: any) => ({
	id: 1,
	balance_amount_ars: 1000,
	balance_amount_usd: 10,
	contract_date_usd: 100,
	is_settled: false,
	start_date: '2026-01-10',
	created_at: '2026-01-01',
	client: { name: 'Ana', last_name: 'Perez' },
	budget: { number: 'P-1', type: 'Aberturas', folder_budget: { work: { name: 'Casa Sur' } } },
	...over,
});

const balances = [
	makeBalance({ id: 1 }),
	makeBalance({
		id: 2,
		balance_amount_ars: 500,
		start_date: '2026-03-10',
		client: { name: 'Zoe', last_name: 'Alvarez' },
	}),
	makeBalance({
		id: 3,
		balance_amount_ars: 200,
		start_date: '2026-02-10',
		client: { name: 'Juan', last_name: 'Gomez' },
	}),
];

const setup = () => {
	(useOptimizedRealtime as jest.Mock).mockReturnValue({ data: balances, loading: false, refresh });
	(getTotalsByBalanceIds as jest.Mock).mockResolvedValue({
		data: {
			1: { totalAmount: 400, totalAmountUSD: 4 },
			2: { totalAmount: 800, totalAmountUSD: 8 },
			3: { totalAmount: 200, totalAmountUSD: 2 },
		},
	});
	return renderHook(() => useBalancesReport());
};

describe('useBalancesReport', () => {
	beforeEach(() => jest.clearAllMocks());

	it('returns empty rows when there are no balances', async () => {
		(useOptimizedRealtime as jest.Mock).mockReturnValue({ data: [], loading: false, refresh });
		const { result } = renderHook(() => useBalancesReport());
		expect(result.current.filteredRows).toEqual([]);
		expect(getTotalsByBalanceIds).not.toHaveBeenCalled();
	});

	it('exposes the loading flag and refresh from the realtime hook', () => {
		(useOptimizedRealtime as jest.Mock).mockReturnValue({ data: [], loading: true, refresh });
		const { result } = renderHook(() => useBalancesReport());
		expect(result.current.loading).toBe(true);
		result.current.refresh();
		expect(refresh).toHaveBeenCalled();
	});

	it('merges totals into the rows', async () => {
		const { result } = setup();
		await waitFor(() => expect(result.current.filteredRows).toHaveLength(3));

		expect(getTotalsByBalanceIds).toHaveBeenCalledWith([1, 2, 3]);
		const byId = Object.fromEntries(result.current.filteredRows.map((r) => [r.id, r]));

		expect(byId[1]).toMatchObject({
			client: 'Perez Ana',
			work: 'Casa Sur',
			concept: 'P-1 - Aberturas',
			purchaseArs: 1000,
			deliveriesArs: 400,
			balanceType: 'DEUDOR',
			balanceAmountArs: 600,
			balanceInUseUsd: 6,
			usdContractRef: 100,
		});
		expect(byId[2]).toMatchObject({ balanceType: 'ACREEDOR', balanceAmountArs: -300 });
		expect(byId[3]).toMatchObject({ balanceType: 'SALDADO', balanceAmountArs: 0 });
	});

	it('computes stats from the rows', async () => {
		const { result } = setup();
		await waitFor(() => expect(result.current.filteredRows).toHaveLength(3));
		expect(result.current.stats).toMatchObject({
			totalDebtors: 600,
			totalCreditors: 300,
			debtorsCount: 1,
			creditorsCount: 1,
		});
	});

	it('sorts by contract date descending by default and toggles direction', async () => {
		const { result } = setup();
		await waitFor(() => expect(result.current.filteredRows).toHaveLength(3));
		expect(result.current.filteredRows.map((r) => r.id)).toEqual([2, 3, 1]);

		act(() => result.current.handleSort('contractDate'));
		expect(result.current.sortDirection).toBe('asc');
		expect(result.current.filteredRows.map((r) => r.id)).toEqual([1, 3, 2]);
	});

	it('sorts by a new field ascending', async () => {
		const { result } = setup();
		await waitFor(() => expect(result.current.filteredRows).toHaveLength(3));
		act(() => result.current.handleSort('client'));
		expect(result.current.sortField).toBe('client');
		expect(result.current.sortDirection).toBe('asc');
		expect(result.current.filteredRows.map((r) => r.client)).toEqual([
			'Alvarez Zoe',
			'Gomez Juan',
			'Perez Ana',
		]);
	});

	it('filters by search term', async () => {
		const { result } = setup();
		await waitFor(() => expect(result.current.filteredRows).toHaveLength(3));
		act(() => result.current.setSearchTerm('  gomez '));
		expect(result.current.filteredRows.map((r) => r.id)).toEqual([3]);
		act(() => result.current.setSearchTerm('acreedor'));
		expect(result.current.filteredRows.map((r) => r.id)).toEqual([2]);
	});

	it('applies advanced filters and resets them', async () => {
		const { result } = setup();
		await waitFor(() => expect(result.current.filteredRows).toHaveLength(3));
		act(() => result.current.updateFilters({ ...result.current.filters, balanceType: 'DEUDOR' }));
		expect(result.current.filteredRows.map((r) => r.id)).toEqual([1]);
		act(() => result.current.resetFilters());
		expect(result.current.filteredRows).toHaveLength(3);
	});

	describe('loading and build lifecycle', () => {
		const deferred = <T>() => {
			let resolve!: (v: T) => void;
			const promise = new Promise<T>((r) => (resolve = r));
			return { promise, resolve };
		};

		it('keeps loading true until rows are built, with no loaded-and-empty window', async () => {
			const d = deferred<any>();
			(useOptimizedRealtime as jest.Mock).mockReturnValue({
				data: balances,
				loading: false,
				refresh,
			});
			(getTotalsByBalanceIds as jest.Mock).mockReturnValue(d.promise);
			const seen: { loading: boolean; count: number }[] = [];
			const { result } = renderHook(() => {
				const r = useBalancesReport();
				seen.push({ loading: r.loading, count: r.filteredRows.length });
				return r;
			});

			expect(result.current.loading).toBe(true);
			expect(result.current.filteredRows).toEqual([]);

			await act(async () => {
				d.resolve({ data: { 1: { totalAmount: 0, totalAmountUSD: 0 } }, error: null });
			});

			expect(result.current.loading).toBe(false);
			expect(result.current.filteredRows).toHaveLength(3);
			expect(seen.some((s) => !s.loading && s.count === 0)).toBe(false);
		});

		it('is not loading when there are no balances and realtime is done', async () => {
			(useOptimizedRealtime as jest.Mock).mockReturnValue({ data: [], loading: false, refresh });
			const { result } = renderHook(() => useBalancesReport());
			await waitFor(() => expect(result.current.loading).toBe(false));
		});

		it('stays loading while realtime is still loading', async () => {
			(useOptimizedRealtime as jest.Mock).mockReturnValue({ data: [], loading: true, refresh });
			const { result } = renderHook(() => useBalancesReport());
			await act(async () => {});
			expect(result.current.loading).toBe(true);
		});

		it('ignores an older slower build that resolves after a newer one', async () => {
			const older = deferred<any>();
			const newer = deferred<any>();
			const first = [makeBalance({ id: 1 })];
			const second = [makeBalance({ id: 2, client: { name: 'Zoe', last_name: 'Alvarez' } })];
			let current = first;
			(useOptimizedRealtime as jest.Mock).mockImplementation(() => ({
				data: current,
				loading: false,
				refresh,
			}));
			(getTotalsByBalanceIds as jest.Mock)
				.mockReturnValueOnce(older.promise)
				.mockReturnValueOnce(newer.promise);

			const { result, rerender } = renderHook(() => useBalancesReport());
			current = second;
			rerender();

			await act(async () => {
				newer.resolve({ data: {}, error: null });
			});
			expect(result.current.filteredRows.map((r) => r.id)).toEqual([2]);
			expect(result.current.loading).toBe(false);

			await act(async () => {
				older.resolve({ data: {}, error: null });
			});
			expect(result.current.filteredRows.map((r) => r.id)).toEqual([2]);
			expect(result.current.loading).toBe(false);
		});

		describe('when fetching totals fails', () => {
			let errorSpy: jest.SpyInstance;
			beforeEach(() => {
				errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
				(useOptimizedRealtime as jest.Mock).mockReturnValue({
					data: balances,
					loading: false,
					refresh,
				});
			});
			afterEach(() => errorSpy.mockRestore());

			it.each([
				['returns an error', () => Promise.resolve({ data: null, error: new Error('boom') })],
				['throws', () => Promise.reject(new Error('boom'))],
				['returns null data without an error', () => Promise.resolve({ data: null, error: null })],
			])('stops loading, logs, exposes the error and no rows when it %s', async (_n, impl) => {
				(getTotalsByBalanceIds as jest.Mock).mockImplementation(impl);
				const { result } = renderHook(() => useBalancesReport());

				await waitFor(() => expect(result.current.loading).toBe(false));
				expect(result.current.filteredRows).toEqual([]);
				expect(result.current.hasRows).toBe(false);
				expect(result.current.error).toEqual(expect.any(String));
				expect(result.current.error).not.toBe('');
				expect(errorSpy).toHaveBeenCalledWith('Error building balances report:', expect.anything());
			});

			it('exposes the totals error message', async () => {
				(getTotalsByBalanceIds as jest.Mock).mockResolvedValue({
					data: null,
					error: new Error('boom'),
				});
				const { result } = renderHook(() => useBalancesReport());
				await waitFor(() => expect(result.current.error).toBe('boom'));
			});

			it('exposes the realtime error', async () => {
				(useOptimizedRealtime as jest.Mock).mockReturnValue({
					data: [],
					loading: false,
					error: 'realtime down',
					refresh,
				});
				const { result } = renderHook(() => useBalancesReport());
				await waitFor(() => expect(result.current.loading).toBe(false));
				expect(result.current.error).toBe('realtime down');
				expect(result.current.hasRows).toBe(false);
			});

			it('retries via refresh after a failure and clears the error on success', async () => {
				let current: any[] = balances;
				(useOptimizedRealtime as jest.Mock).mockImplementation(() => ({
					data: current,
					loading: false,
					refresh,
				}));
				(getTotalsByBalanceIds as jest.Mock).mockResolvedValueOnce({
					data: null,
					error: new Error('boom'),
				});
				const { result, rerender } = renderHook(() => useBalancesReport());
				await waitFor(() => expect(result.current.error).toBe('boom'));

				// refresh delegates to the realtime hook, which emits a fresh array
				(getTotalsByBalanceIds as jest.Mock).mockResolvedValue({ data: {}, error: null });
				result.current.refresh();
				expect(refresh).toHaveBeenCalledTimes(1);
				current = [...balances];
				rerender();

				await waitFor(() => expect(result.current.error).toBeNull());
				expect(getTotalsByBalanceIds).toHaveBeenCalledTimes(2);
				expect(result.current.filteredRows).toHaveLength(3);
			});

			it('keeps the previous rows and exposes the error when a later build fails', async () => {
				let current: any[] = balances;
				(useOptimizedRealtime as jest.Mock).mockImplementation(() => ({
					data: current,
					loading: false,
					refresh,
				}));
				(getTotalsByBalanceIds as jest.Mock).mockResolvedValueOnce({ data: {}, error: null });
				const { result, rerender } = renderHook(() => useBalancesReport());
				await waitFor(() => expect(result.current.filteredRows).toHaveLength(3));
				expect(result.current.error).toBeNull();

				(getTotalsByBalanceIds as jest.Mock).mockRejectedValueOnce(new Error('later'));
				current = [...balances];
				rerender();

				await waitFor(() => expect(result.current.error).toBe('later'));
				expect(result.current.filteredRows).toHaveLength(3);
				expect(result.current.hasRows).toBe(true);
			});
		});

		describe('initialLoading', () => {
			it('is true only until the first build completes, not on later refreshes', async () => {
				const first = deferred<any>();
				const second = deferred<any>();
				let current: any[] = balances;
				let realtimeLoading = false;
				(useOptimizedRealtime as jest.Mock).mockImplementation(() => ({
					data: current,
					loading: realtimeLoading,
					refresh,
				}));
				(getTotalsByBalanceIds as jest.Mock)
					.mockReturnValueOnce(first.promise)
					.mockReturnValueOnce(second.promise);

				const { result, rerender } = renderHook(() => useBalancesReport());
				expect(result.current.initialLoading).toBe(true);
				expect(result.current.loading).toBe(true);

				await act(async () => {
					first.resolve({ data: {}, error: null });
				});
				expect(result.current.initialLoading).toBe(false);
				expect(result.current.loading).toBe(false);

				// realtime tick: new identity + realtime loading
				current = [...balances];
				realtimeLoading = true;
				rerender();
				expect(result.current.loading).toBe(true);
				expect(result.current.initialLoading).toBe(false);
				expect(result.current.filteredRows).toHaveLength(3);

				await act(async () => {
					second.resolve({ data: {}, error: null });
				});
				realtimeLoading = false;
				rerender();
				expect(result.current.loading).toBe(false);
				expect(result.current.initialLoading).toBe(false);
			});

			it('stays true while realtime is still loading with no data yet', async () => {
				(useOptimizedRealtime as jest.Mock).mockReturnValue({ data: [], loading: true, refresh });
				const { result } = renderHook(() => useBalancesReport());
				await act(async () => {});
				expect(result.current.initialLoading).toBe(true);
			});

			it('ends loaded once with the correct rows under StrictMode', async () => {
				(useOptimizedRealtime as jest.Mock).mockReturnValue({
					data: balances,
					loading: false,
					refresh,
				});
				(getTotalsByBalanceIds as jest.Mock).mockResolvedValue({ data: {}, error: null });
				const { result } = renderHook(() => useBalancesReport(), { wrapper: StrictMode });
				await waitFor(() => expect(result.current.initialLoading).toBe(false));
				expect(result.current.loading).toBe(false);
				expect(result.current.error).toBeNull();
				expect(result.current.filteredRows.map((r) => r.id)).toEqual([2, 3, 1]);
			});
		});
	});

	it('marks is_settled balances as SALDADO even with a non-zero remaining amount', async () => {
		const settled = [makeBalance({ id: 9, is_settled: true, balance_amount_ars: 1000 })];
		(useOptimizedRealtime as jest.Mock).mockReturnValue({
			data: settled,
			loading: false,
			refresh,
		});
		(getTotalsByBalanceIds as jest.Mock).mockResolvedValue({
			data: { 9: { totalAmount: 100, totalAmountUSD: 1 } },
			error: null,
		});
		const { result } = renderHook(() => useBalancesReport());
		await waitFor(() => expect(result.current.filteredRows).toHaveLength(1));
		expect(result.current.filteredRows[0]).toMatchObject({
			balanceType: 'SALDADO',
			balanceAmountArs: 900,
		});
	});

	it('sorts a copy: works even when the filtered rows array is frozen', async () => {
		const { result } = setup();
		await waitFor(() => expect(result.current.filteredRows).toHaveLength(3));
		freezeFilteredRows.enabled = true;
		try {
			// A mutating in-place sort would throw a TypeError on the frozen array
			act(() => result.current.handleSort('client'));
			expect(result.current.filteredRows.map((r) => r.client)).toEqual([
				'Alvarez Zoe',
				'Gomez Juan',
				'Perez Ana',
			]);
			act(() => result.current.handleSort('client'));
			expect(result.current.filteredRows.map((r) => r.id)).toEqual([1, 3, 2]);
		} finally {
			freezeFilteredRows.enabled = false;
		}
	});
});
