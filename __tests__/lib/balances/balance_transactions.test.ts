import {
	listTransactions,
	getTransactionById,
	getTransactionsByBalanceId,
	createTransaction,
	updateTransaction,
	deleteTransaction,
	getTotalByBalanceId,
	getTotalsByBalanceIds,
	listBalanceTransactionsForYear,
} from '@/lib/balances/balance_transactions';
import { getSupabaseClient } from '@/lib/supabase-client';

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: jest.fn(),
}));

function createSupabaseMock() {
	const chain: Record<string, jest.Mock> = {
		select: jest.fn(() => chain),
		order: jest.fn(() => chain),
		eq: jest.fn(() => chain),
		insert: jest.fn(() => chain),
		update: jest.fn(() => chain),
		delete: jest.fn(() => chain),
		single: jest.fn(() => chain),
		in: jest.fn(() => chain),
		limit: jest.fn(() => chain),
	};
	const supabase = { from: jest.fn(() => chain) };
	return { supabase, chain };
}

describe('balance_transactions lib', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('listTransactions', () => {
		it('fetches all transactions ordered by created_at desc', async () => {
			const { supabase, chain } = createSupabaseMock();
			chain.order = jest.fn().mockResolvedValue({ data: [{ id: 1 }], error: null });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await listTransactions();

			expect(supabase.from).toHaveBeenCalledWith('balance_transactions');
			expect(chain.select).toHaveBeenCalledWith('*, bank_account:bank_accounts(*)');
			expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
			expect(result.data).toEqual([{ id: 1 }]);
		});
	});

	describe('getTransactionById', () => {
		it('fetches a single transaction by id', async () => {
			const { supabase, chain } = createSupabaseMock();
			chain.single = jest.fn().mockResolvedValue({ data: { id: 5 }, error: null });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getTransactionById(5);

			expect(chain.eq).toHaveBeenCalledWith('id', 5);
			expect(result.data).toEqual({ id: 5 });
		});
	});

	describe('getTransactionsByBalanceId', () => {
		it('fetches transactions for a balance ordered by date desc, flattening the payment method name', async () => {
			const { supabase, chain } = createSupabaseMock();
			chain.order = jest.fn().mockResolvedValue({
				data: [
					{ id: 1, amount: 100, payment_methods: { name: 'Transferencia' } },
					{ id: 2, amount: 200, payment_methods: null },
				],
				error: null,
			});
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getTransactionsByBalanceId(10);

			expect(chain.select).toHaveBeenCalledWith(
				'*, bank_account:bank_accounts(*), payment_methods(name)'
			);
			expect(chain.eq).toHaveBeenCalledWith('balance_id', 10);
			expect(chain.order).toHaveBeenCalledWith('date', { ascending: false });
			expect(result.data).toEqual([
				{ id: 1, amount: 100, payment_method_name: 'Transferencia' },
				{ id: 2, amount: 200, payment_method_name: null },
			]);
		});

		it('passes through errors without mapping', async () => {
			const { supabase, chain } = createSupabaseMock();
			const err = { message: 'boom' };
			chain.order = jest.fn().mockResolvedValue({ data: null, error: err });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getTransactionsByBalanceId(10);

			expect(result).toEqual({ data: null, error: err });
		});
	});

	describe('createTransaction', () => {
		it('inserts a transaction and returns it', async () => {
			const { supabase, chain } = createSupabaseMock();
			const tx = { balance_id: 1, amount: 500, payment_method: 'EFECTIVO' };
			chain.single = jest.fn().mockResolvedValue({ data: { id: 1, ...tx }, error: null });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await createTransaction(tx);

			expect(chain.insert).toHaveBeenCalledWith(tx);
			expect(result.data).toEqual({ id: 1, ...tx });
		});
	});

	describe('updateTransaction', () => {
		it('updates a transaction by id', async () => {
			const { supabase, chain } = createSupabaseMock();
			const changes = { amount: 999 };
			chain.single = jest.fn().mockResolvedValue({ data: { id: 5, ...changes }, error: null });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await updateTransaction(5, changes);

			expect(chain.update).toHaveBeenCalledWith(changes);
			expect(chain.eq).toHaveBeenCalledWith('id', 5);
			expect(result.data).toEqual({ id: 5, amount: 999 });
		});
	});

	describe('deleteTransaction', () => {
		it('deletes a transaction and its associated files', async () => {
			const supabase = {
				from: jest.fn(),
				storage: { from: jest.fn() },
			};

			const deleteChain = {
				eq: jest.fn().mockResolvedValue({ data: null, error: null }),
				in: jest.fn().mockResolvedValue({ data: null, error: null }),
			};

			const storageChain = {
				remove: jest.fn().mockResolvedValue({ error: null }),
			};

			supabase.storage.from.mockReturnValue(storageChain);

			supabase.from.mockImplementation((table: string) => {
				if (table === 'files_client') {
					return {
						select: jest.fn(() => ({
							eq: jest.fn().mockResolvedValue({
								data: [
									{ id: 1, path: 'client/1/file1.pdf' },
									{ id: 2, path: 'client/1/file2.pdf' },
								],
								error: null,
							}),
						})),
						delete: jest.fn(() => deleteChain),
					};
				}
				return {
					delete: jest.fn(() => ({
						eq: jest.fn().mockResolvedValue({ data: null, error: null }),
					})),
				};
			});

			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await deleteTransaction(5);

			expect(supabase.from).toHaveBeenCalledWith('files_client');
			expect(supabase.storage.from).toHaveBeenCalledWith('clients');
			expect(storageChain.remove).toHaveBeenCalledWith([
				'client/1/file1.pdf',
				'client/1/file2.pdf',
			]);
			expect(supabase.from).toHaveBeenCalledWith('balance_transactions');
			expect(result.data).toBeNull();
			expect(result.error).toBeNull();
		});

		it('handles deletion when there are no associated files', async () => {
			const supabase = {
				from: jest.fn(),
				storage: { from: jest.fn() },
			};

			supabase.from.mockImplementation((table: string) => {
				if (table === 'files_client') {
					return {
						select: jest.fn(() => ({
							eq: jest.fn().mockResolvedValue({ data: [], error: null }),
						})),
						delete: jest.fn(() => ({
							in: jest.fn().mockResolvedValue({ data: null, error: null }),
						})),
					};
				}
				return {
					delete: jest.fn(() => ({
						eq: jest.fn().mockResolvedValue({ data: null, error: null }),
					})),
				};
			});

			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await deleteTransaction(5);

			expect(supabase.storage.from).not.toHaveBeenCalled();
			expect(result.error).toBeNull();
		});

		it('returns error when fetching files fails', async () => {
			const fetchError = new Error('fetch failed');
			const supabase = {
				from: jest.fn(),
				storage: { from: jest.fn() },
			};

			supabase.from.mockImplementation((table: string) => {
				if (table === 'files_client') {
					return {
						select: jest.fn(() => ({
							eq: jest.fn().mockResolvedValue({ data: null, error: fetchError }),
						})),
					};
				}
				return {
					delete: jest.fn(() => ({
						eq: jest.fn().mockResolvedValue({ data: null, error: null }),
					})),
				};
			});

			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await deleteTransaction(5);

			expect(result.error).toBe(fetchError);
			expect(supabase.storage.from).not.toHaveBeenCalled();
		});

		it('returns error when storage remove fails', async () => {
			const storageError = new Error('storage failed');
			const supabase = {
				from: jest.fn(),
				storage: { from: jest.fn() },
			};

			supabase.storage.from.mockReturnValue({
				remove: jest.fn().mockResolvedValue({ error: storageError }),
			});

			supabase.from.mockImplementation((table: string) => {
				if (table === 'files_client') {
					return {
						select: jest.fn(() => ({
							eq: jest.fn().mockResolvedValue({
								data: [{ id: 1, path: 'client/1/file1.pdf' }],
								error: null,
							}),
						})),
					};
				}
				return {
					delete: jest.fn(() => ({
						eq: jest.fn().mockResolvedValue({ data: null, error: null }),
					})),
				};
			});

			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await deleteTransaction(5);

			expect(result.error).toBe(storageError);
		});

		it('returns error when files_client delete fails', async () => {
			const filesDeleteError = new Error('delete files_client failed');
			const supabase = {
				from: jest.fn(),
				storage: { from: jest.fn() },
			};

			supabase.storage.from.mockReturnValue({
				remove: jest.fn().mockResolvedValue({ error: null }),
			});

			supabase.from.mockImplementation((table: string) => {
				if (table === 'files_client') {
					return {
						select: jest.fn(() => ({
							eq: jest.fn().mockResolvedValue({
								data: [{ id: 1, path: 'client/1/file1.pdf' }],
								error: null,
							}),
						})),
						delete: jest.fn(() => ({
							in: jest.fn().mockResolvedValue({ data: null, error: filesDeleteError }),
						})),
					};
				}
				return {
					delete: jest.fn(() => ({
						eq: jest.fn().mockResolvedValue({ data: null, error: null }),
					})),
				};
			});

			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await deleteTransaction(5);

			expect(result.error).toBe(filesDeleteError);
		});
	});

	describe('getTotalByBalanceId', () => {
		it('computes totals for a balance', async () => {
			const { supabase, chain } = createSupabaseMock();
			chain.eq = jest.fn().mockResolvedValue({
				data: [
					{ amount: 100, usd_amount: 5 },
					{ amount: 200, usd_amount: 10 },
					{ amount: 50, usd_amount: null },
				],
				error: null,
			});
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getTotalByBalanceId(1);

			expect(chain.select).toHaveBeenCalledWith('amount, usd_amount');
			expect(result.data).toEqual({
				totalAmount: 350,
				totalAmountUSD: 15,
			});
		});

		it('returns zeros for empty transactions', async () => {
			const { supabase, chain } = createSupabaseMock();
			chain.eq = jest.fn().mockResolvedValue({ data: [], error: null });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getTotalByBalanceId(1);

			expect(result.data).toEqual({
				totalAmount: 0,
				totalAmountUSD: 0,
			});
		});
	});

	describe('listBalanceTransactionsForYear', () => {
		function setupOr(result: { data?: any; error?: any }) {
			const chain: Record<string, jest.Mock> = {
				select: jest.fn(() => chain),
				or: jest.fn(() => chain),
				order: jest.fn(() => chain),
				range: jest.fn(() => chain),
			};
			(chain as any).then = (resolve: (v: any) => any) =>
				resolve({ data: null, error: null, ...result });
			const from = jest.fn(() => chain);
			(getSupabaseClient as jest.Mock).mockReturnValue({ from });
			return { chain, from };
		}

		it('scopes the query by date (or null-date created_at) within the given Argentina year, flattening joined details', async () => {
			const rows = [
				{
					id: 1,
					created_at: '2026-05-10T12:00:00.000Z',
					date: '2026-05-10',
					amount: 1000,
					notes: 'Cuota 1',
					balances: { client_id: 3, clients: { name: 'Juan', last_name: 'Perez' } },
					works: { name: 'Obra Norte' },
					cash_flow_categories: { name: 'Cuota' },
					payment_methods: { name: 'Transferencia' },
					bank_accounts: { name: 'Cuenta principal', bank: 'Banco Nación' },
				},
			];
			const { chain, from } = setupOr({ data: rows });

			const res = await listBalanceTransactionsForYear(2026);

			expect(from).toHaveBeenCalledWith('balance_transactions');
			expect(chain.or).toHaveBeenCalledWith(
				'and(date.gte.2026-01-01,date.lt.2027-01-01),and(date.is.null,created_at.gte.2026-01-01T03:00:00.000Z,created_at.lt.2027-01-01T03:00:00.000Z)'
			);
			expect(res.data?.[0]).toEqual(
				expect.objectContaining({
					id: 1,
					date: '2026-05-10',
					amount: 1000,
					client_id: 3,
					client_name: 'Juan Perez',
					work_name: 'Obra Norte',
					category_name: 'Cuota',
					payment_method_name: 'Transferencia',
					bank_account_name: 'Banco Nación - Cuenta principal',
				})
			);
		});

		it('falls back to the Argentina date from created_at and amount 0 for legacy null rows', async () => {
			const rows = [
				{
					id: 2,
					created_at: '2026-03-10T15:30:00.000Z', // 2026-03-10 12:30 ART, well inside the 2026 window
					date: null,
					amount: null,
					notes: null,
					balances: null,
					works: null,
					cash_flow_categories: null,
					payment_methods: null,
					bank_accounts: null,
				},
			];
			setupOr({ data: rows });

			const res = await listBalanceTransactionsForYear(2026);

			expect(res.data?.[0]).toEqual(
				expect.objectContaining({
					date: '2026-03-10',
					amount: 0,
					client_id: null,
					client_name: null,
					work_name: null,
					category_name: null,
					payment_method_name: null,
					bank_account_name: null,
				})
			);
		});

		it('passes Supabase errors through', async () => {
			const err = { code: '42501', message: 'permission denied' };
			setupOr({ error: err });

			expect(await listBalanceTransactionsForYear(2026)).toEqual({ data: null, error: err });
		});

		it('builds the exact .or() filter string for a different year boundary', async () => {
			const { chain } = setupOr({ data: [] });

			await listBalanceTransactionsForYear(2030);

			expect(chain.or).toHaveBeenCalledWith(
				'and(date.gte.2030-01-01,date.lt.2031-01-01),and(date.is.null,created_at.gte.2030-01-01T03:00:00.000Z,created_at.lt.2031-01-01T03:00:00.000Z)'
			);
		});

		it('maps the ART year-boundary null-date rows to the correct side of the cutoff', async () => {
			const lastSecondOfPrevYear = {
				id: 10,
				created_at: '2026-01-01T02:59:59.000Z',
				date: null,
				amount: 500,
				notes: null,
				balances: null,
				works: null,
				cash_flow_categories: null,
				payment_methods: null,
				bank_accounts: null,
			};
			// 00:00:00 ART on Jan 1 belongs to the current year (the start bound itself).
			const firstSecondOfYear = {
				id: 11,
				created_at: '2026-01-01T03:00:00.000Z',
				date: null,
				amount: 700,
				notes: null,
				balances: null,
				works: null,
				cash_flow_categories: null,
				payment_methods: null,
				bank_accounts: null,
			};
			setupOr({ data: [lastSecondOfPrevYear, firstSecondOfYear] });

			const res = await listBalanceTransactionsForYear(2026);

			expect(res.data?.[0]).toEqual(expect.objectContaining({ date: '2025-12-31' }));
			expect(res.data?.[1]).toEqual(expect.objectContaining({ date: '2026-01-01' }));
		});

		it('fetches a second page beyond the PostgREST 1000-row limit and returns every row', async () => {
			const makeRow = (id: number) => ({
				id,
				date: '2026-05-10',
				amount: 10,
				balances: null,
				works: null,
				cash_flow_categories: null,
				payment_methods: null,
				bank_accounts: null,
			});
			const fullPage = Array.from({ length: 1000 }, (_, i) => makeRow(i + 1));
			const shortPage = [makeRow(1001), makeRow(1002)];
			let call = 0;
			const { chain } = setupOr({});
			(chain as any).then = (resolve: (v: any) => any) => {
				call += 1;
				return resolve(
					call === 1 ? { data: fullPage, error: null } : { data: shortPage, error: null }
				);
			};

			const res = await listBalanceTransactionsForYear(2026);

			expect(res.error).toBeNull();
			expect(res.data).toHaveLength(1002);
			expect(chain.range).toHaveBeenNthCalledWith(1, 0, 999);
			expect(chain.range).toHaveBeenNthCalledWith(2, 1000, 1999);
		});

		it('propagates an error raised on a non-first page', async () => {
			const fullPage = Array.from({ length: 1000 }, (_, i) => ({
				id: i + 1,
				date: '2026-05-10',
				amount: 10,
				balances: null,
				works: null,
				cash_flow_categories: null,
				payment_methods: null,
				bank_accounts: null,
			}));
			const err = { message: 'boom' };
			let call = 0;
			const { chain } = setupOr({});
			(chain as any).then = (resolve: (v: any) => any) => {
				call += 1;
				return resolve(call === 1 ? { data: fullPage, error: null } : { data: null, error: err });
			};

			const res = await listBalanceTransactionsForYear(2026);

			expect(res.data).toBeNull();
			expect(res.error).toEqual(err);
		});
	});

	describe('getTotalsByBalanceIds', () => {
		it('returns empty object for empty ids array', async () => {
			const result = await getTotalsByBalanceIds([]);
			expect(result.data).toEqual({});
		});

		it('computes totals grouped by balance id', async () => {
			const { supabase, chain } = createSupabaseMock();
			chain.in = jest.fn().mockResolvedValue({
				data: [
					{ balance_id: 1, amount: 100, usd_amount: 5 },
					{ balance_id: 1, amount: 50, usd_amount: 2 },
					{ balance_id: 2, amount: 300, usd_amount: 15 },
					{ balance_id: 3, amount: 0, usd_amount: 0 },
				],
				error: null,
			});
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getTotalsByBalanceIds([1, 2, 3]);

			expect(chain.select).toHaveBeenCalledWith('balance_id, amount, usd_amount');
			expect(chain.in).toHaveBeenCalledWith('balance_id', [1, 2, 3]);
			expect(result.data).toEqual({
				1: { totalAmount: 150, totalAmountUSD: 7 },
				2: { totalAmount: 300, totalAmountUSD: 15 },
				3: { totalAmount: 0, totalAmountUSD: 0 },
			});
		});
	});
});
