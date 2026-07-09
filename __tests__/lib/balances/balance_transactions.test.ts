import {
	listTransactions,
	getTransactionById,
	getTransactionsByBalanceId,
	createTransaction,
	updateTransaction,
	deleteTransaction,
	getTotalByBalanceId,
	getTotalsByBalanceIds,
	getLastTransactionUSD,
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
			expect(chain.select).toHaveBeenCalledWith('*');
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
		it('fetches transactions for a balance ordered by date desc', async () => {
			const { supabase, chain } = createSupabaseMock();
			chain.order = jest.fn().mockResolvedValue({ data: [{ id: 1, amount: 100 }], error: null });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getTransactionsByBalanceId(10);

			expect(chain.eq).toHaveBeenCalledWith('balance_id', 10);
			expect(chain.order).toHaveBeenCalledWith('date', { ascending: false });
			expect(result.data).toEqual([{ id: 1, amount: 100 }]);
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
	});

	describe('getTotalByBalanceId', () => {
		it('computes totals for a balance', async () => {
			const { supabase, chain } = createSupabaseMock();
			chain.eq = jest.fn().mockResolvedValue({
				data: [
					{ amount: 100, usd_amount: 5, is_extra_amount: false },
					{ amount: 200, usd_amount: 10, is_extra_amount: false },
					{ amount: 50, usd_amount: null, is_extra_amount: false },
				],
				error: null,
			});
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getTotalByBalanceId(1);

			expect(chain.select).toHaveBeenCalledWith('amount, usd_amount, is_extra_amount');
			expect(result.data).toEqual({
				totalAmount: 350,
				totalAmountUSD: 15,
				totalExtraAmount: 0,
				totalExtraAmountUSD: 0,
			});
		});

		it('separates extra amounts from regular totals', async () => {
			const { supabase, chain } = createSupabaseMock();
			chain.eq = jest.fn().mockResolvedValue({
				data: [
					{ amount: 100, usd_amount: 5, is_extra_amount: false },
					{ amount: 200, usd_amount: 10, is_extra_amount: false },
					{ amount: 50, usd_amount: 2, is_extra_amount: true },
					{ amount: 30, usd_amount: null, is_extra_amount: true },
				],
				error: null,
			});
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getTotalByBalanceId(1);

			expect(result.data).toEqual({
				totalAmount: 300,
				totalAmountUSD: 15,
				totalExtraAmount: 80,
				totalExtraAmountUSD: 2,
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
				totalExtraAmount: 0,
				totalExtraAmountUSD: 0,
			});
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
					{ balance_id: 1, amount: 100, usd_amount: 5, is_extra_amount: false },
					{ balance_id: 1, amount: 50, usd_amount: 2, is_extra_amount: false },
					{ balance_id: 2, amount: 300, usd_amount: 15, is_extra_amount: false },
					{ balance_id: 3, amount: 0, usd_amount: 0, is_extra_amount: false },
				],
				error: null,
			});
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getTotalsByBalanceIds([1, 2, 3]);

			expect(chain.select).toHaveBeenCalledWith('balance_id, amount, usd_amount, is_extra_amount');
			expect(chain.in).toHaveBeenCalledWith('balance_id', [1, 2, 3]);
			expect(result.data).toEqual({
				1: { totalAmount: 150, totalAmountUSD: 7, totalExtraAmount: 0, totalExtraAmountUSD: 0 },
				2: { totalAmount: 300, totalAmountUSD: 15, totalExtraAmount: 0, totalExtraAmountUSD: 0 },
				3: { totalAmount: 0, totalAmountUSD: 0, totalExtraAmount: 0, totalExtraAmountUSD: 0 },
			});
		});

		it('separates extra amounts from regular totals by balance id', async () => {
			const { supabase, chain } = createSupabaseMock();
			chain.in = jest.fn().mockResolvedValue({
				data: [
					{ balance_id: 1, amount: 100, usd_amount: 5, is_extra_amount: false },
					{ balance_id: 1, amount: 30, usd_amount: 2, is_extra_amount: true },
					{ balance_id: 2, amount: 300, usd_amount: 15, is_extra_amount: false },
					{ balance_id: 2, amount: 50, usd_amount: 3, is_extra_amount: true },
				],
				error: null,
			});
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getTotalsByBalanceIds([1, 2]);

			expect(result.data).toEqual({
				1: { totalAmount: 100, totalAmountUSD: 5, totalExtraAmount: 30, totalExtraAmountUSD: 2 },
				2: { totalAmount: 300, totalAmountUSD: 15, totalExtraAmount: 50, totalExtraAmountUSD: 3 },
			});
		});
	});

	describe('getLastTransactionUSD', () => {
		it('returns the latest quote_usd for a balance', async () => {
			const { supabase, chain } = createSupabaseMock();
			chain.single = jest.fn().mockResolvedValue({ data: { quote_usd: 980 }, error: null });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getLastTransactionUSD('5');

			expect(chain.eq).toHaveBeenCalledWith('balance_id', '5');
			expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
			expect(chain.limit).toHaveBeenCalledWith(1);
			expect(result.data).toBe(980);
		});

		it('returns null when no transaction found', async () => {
			const { supabase, chain } = createSupabaseMock();
			chain.single = jest.fn().mockResolvedValue({ data: null, error: null });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getLastTransactionUSD('5');

			expect(result.data).toBeNull();
		});
	});
});
