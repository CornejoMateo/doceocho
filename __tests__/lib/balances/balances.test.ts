import {
	listBalances,
	listBalancesForReport,
	getBalanceById,
	getBalancesByClientId,
	getBudgetsByClientId,
	createBalance,
	updateBalance,
	deleteBalance,
} from '@/lib/balances/balances';
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

describe('balances lib', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('listBalances', () => {
		it('fetches all balances with budget relation', async () => {
			const { supabase, chain } = createSupabaseMock();
			chain.order = jest.fn().mockResolvedValue({ data: [{ id: 1 }], error: null });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await listBalances();

			expect(supabase.from).toHaveBeenCalledWith('balances');
			expect(chain.select).toHaveBeenCalledWith(expect.stringContaining('budget:budgets'));
			expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
			expect(result.data).toEqual([{ id: 1 }]);
		});
	});

	describe('listBalancesForReport', () => {
		it('fetches balances with client and budget for report', async () => {
			const { supabase, chain } = createSupabaseMock();
			const mockData = [{ id: 1, client: { id: 5, name: 'Juan' } }];
			chain.order = jest.fn().mockResolvedValue({ data: mockData, error: null });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await listBalancesForReport();

			expect(supabase.from).toHaveBeenCalledWith('balances');
			expect(chain.select).toHaveBeenCalledWith(
				expect.stringContaining('client:clients(id, name, last_name)')
			);
			expect(result.data).toEqual(mockData);
		});
	});

	describe('getBalanceById', () => {
		it('fetches a single balance by id', async () => {
			const { supabase, chain } = createSupabaseMock();
			chain.single = jest.fn().mockResolvedValue({ data: { id: 3 }, error: null });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getBalanceById(3);

			expect(chain.eq).toHaveBeenCalledWith('id', 3);
			expect(result.data).toEqual({ id: 3 });
		});
	});

	describe('getBalancesByClientId', () => {
		it('fetches balances for a client', async () => {
			const { supabase, chain } = createSupabaseMock();
			chain.order = jest.fn().mockResolvedValue({ data: [{ id: 1 }], error: null });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getBalancesByClientId(10);

			expect(supabase.from).toHaveBeenCalledWith('balances');
			expect(chain.eq).toHaveBeenCalledWith('client_id', 10);
			expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
			expect(result.data).toEqual([{ id: 1 }]);
		});
	});

	describe('getBudgetsByClientId', () => {
		it('fetches accepted budgets for a client', async () => {
			const { supabase, chain } = createSupabaseMock();
			const budgetsData = [
				{
					id: 1,
					created_at: '2024-01-01',
					amount_ars: 100000,
					amount_usd: 5000,
					date_of_sale: null,
					usd_quote: null,
					folder_budget: {
						id: 10,
						work_id: 20,
						work: { address: 'Calle 123', locality: 'Springfield', client_id: 5 },
					},
				},
			];

			const secondEq = jest.fn().mockResolvedValue({ data: budgetsData, error: null });
			const firstEq = jest.fn(() => ({ ...chain, eq: secondEq }));
			chain.select = jest.fn(() => ({ ...chain, eq: firstEq }));
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getBudgetsByClientId(5);

			expect(supabase.from).toHaveBeenCalledWith('budgets');
			expect(firstEq).toHaveBeenCalledWith('folder_budgets.works.client_id', 5);
			expect(secondEq).toHaveBeenCalledWith('accepted', true);
			expect(result.data).toHaveLength(1);
			expect(result.data?.[0].folder_budget?.work).toEqual({
				address: 'Calle 123',
				locality: 'Springfield',
			});
		});

		it('returns empty array when no budgets found', async () => {
			const { supabase, chain } = createSupabaseMock();

			const secondEq = jest.fn().mockResolvedValue({ data: [], error: null });
			const firstEq = jest.fn(() => ({ ...chain, eq: secondEq }));
			chain.select = jest.fn(() => ({ ...chain, eq: firstEq }));
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getBudgetsByClientId(5);

			expect(result.data).toEqual([]);
		});

		it('filters out budgets without a folder_budget', async () => {
			const { supabase, chain } = createSupabaseMock();

			const secondEq = jest.fn().mockResolvedValue({
				data: [
					{
						id: 1,
						created_at: '2024-01-01',
						amount_ars: 100000,
						amount_usd: 5000,
						folder_budget: null,
					},
				],
				error: null,
			});
			const firstEq = jest.fn(() => ({ ...chain, eq: secondEq }));
			chain.select = jest.fn(() => ({ ...chain, eq: firstEq }));
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getBudgetsByClientId(5);

			expect(result.data).toEqual([]);
		});
	});

	describe('createBalance', () => {
		it('inserts a balance and returns it', async () => {
			const { supabase, chain } = createSupabaseMock();
			const balance = { client_id: 1, balance_amount_ars: 100000 };
			chain.single = jest.fn().mockResolvedValue({ data: { id: 1, ...balance }, error: null });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await createBalance(balance);

			expect(chain.insert).toHaveBeenCalledWith(balance);
			expect(result.data).toEqual({ id: 1, ...balance });
		});
	});

	describe('updateBalance', () => {
		it('updates a balance by id', async () => {
			const { supabase, chain } = createSupabaseMock();
			const changes = { notes: 'Updated notes' };
			chain.single = jest.fn().mockResolvedValue({ data: { id: 5, ...changes }, error: null });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await updateBalance(5, changes);

			expect(chain.update).toHaveBeenCalledWith(changes);
			expect(chain.eq).toHaveBeenCalledWith('id', 5);
			expect(result.data).toEqual({ id: 5, notes: 'Updated notes' });
		});
	});

	describe('deleteBalance', () => {
		it('deletes a balance by id', async () => {
			const { supabase, chain } = createSupabaseMock();
			chain.delete = jest.fn(() => ({
				eq: jest.fn().mockResolvedValue({ data: null, error: null }),
			}));
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await deleteBalance(10);

			expect(supabase.from).toHaveBeenCalledWith('balances');
			expect(result.data).toBeNull();
		});
	});
});
