import {
	getModulesMonthlySettlement,
	getModulesMonthlySettlementsByUser,
	getModulesMonthlySettlementsByMonth,
	createModulesMonthlySettlement,
	updateModulesMonthlySettlement,
	deleteModulesMonthlySettlement,
	upsertModulesMonthlySettlement,
	getApprovedModulesAmountsForMonth,
	type ModulesMonthlySettlementInput,
} from '@/lib/modules/modules-settlements';
import { getSupabaseClient } from '@/lib/supabase-client';

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: jest.fn(),
}));

function createSupabaseMock() {
	const chain: Record<string, jest.Mock> = {
		select: jest.fn(() => chain),
		order: jest.fn(() => chain),
		eq: jest.fn(() => chain),
		gte: jest.fn(() => chain),
		lte: jest.fn(() => chain),
		maybeSingle: jest.fn(() => chain),
		insert: jest.fn(() => chain),
		update: jest.fn(() => chain),
		delete: jest.fn(() => chain),
		upsert: jest.fn(() => chain),
		single: jest.fn(() => chain),
	};

	const supabase = {
		from: jest.fn(() => chain),
	};

	return { supabase, chain };
}

describe('modules settlements lib', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	const buildInput = (): ModulesMonthlySettlementInput => ({
		year: 2026,
		month: 7,
		user_id: 'user-1',
		amount: 100000,
		modules_count: 4,
	});

	describe('getModulesMonthlySettlement', () => {
		it('fetches a single settlement by user, year and month', async () => {
			const { supabase, chain } = createSupabaseMock();
			const settlement = { id: 1, user_id: 'user-1', year: 2026, month: 7 };
			chain.maybeSingle = jest.fn().mockResolvedValue({ data: settlement, error: null });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getModulesMonthlySettlement('user-1', 2026, 7);

			expect(supabase.from).toHaveBeenCalledWith('modules_monthly_settlements');
			expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-1');
			expect(chain.eq).toHaveBeenCalledWith('year', 2026);
			expect(chain.eq).toHaveBeenCalledWith('month', 7);
			expect(result.data).toEqual(settlement);
		});
	});

	describe('getModulesMonthlySettlementsByUser', () => {
		it('fetches all settlements of a user ordered by year and month', async () => {
			const { supabase, chain } = createSupabaseMock();
			const settlements = [
				{ id: 2, user_id: 'user-1', year: 2026, month: 7 },
				{ id: 1, user_id: 'user-1', year: 2026, month: 6 },
			];
			const secondOrder = jest.fn().mockResolvedValue({ data: settlements, error: null });
			chain.order = jest.fn(() => ({ order: secondOrder }));
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getModulesMonthlySettlementsByUser('user-1');

			expect(supabase.from).toHaveBeenCalledWith('modules_monthly_settlements');
			expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-1');
			expect(chain.order).toHaveBeenCalledWith('year', { ascending: false });
			expect(secondOrder).toHaveBeenCalledWith('month', { ascending: false });
			expect(result.data).toEqual(settlements);
		});
	});

	describe('getModulesMonthlySettlementsByMonth', () => {
		function mockResponse(chain: Record<string, jest.Mock>, response: { data: any; error: any }) {
			chain.order = jest.fn().mockResolvedValue(response);
		}

		it('fetches settlements filtered by year and month with user names', async () => {
			const { supabase, chain } = createSupabaseMock();
			mockResponse(chain, {
				data: [{ id: 1, user_id: 'user-1', users: { name: 'Juan', last_name: 'Pérez' } }],
				error: null,
			});
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getModulesMonthlySettlementsByMonth(2026, 7);

			expect(supabase.from).toHaveBeenCalledWith('modules_monthly_settlements');
			expect(chain.eq).toHaveBeenCalledWith('year', 2026);
			expect(chain.eq).toHaveBeenCalledWith('month', 7);
			expect(result.data?.[0].user_name).toBe('Juan Pérez');
		});

		it('uses Desconocido when no user info', async () => {
			const { supabase, chain } = createSupabaseMock();
			mockResponse(chain, { data: [{ id: 1, users: null }], error: null });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getModulesMonthlySettlementsByMonth(2026, 7);

			expect(result.data?.[0].user_name).toBe('Desconocido');
		});

		it('returns the error on failure', async () => {
			const { supabase, chain } = createSupabaseMock();
			const error = { message: 'Failed' };
			mockResponse(chain, { data: null, error });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getModulesMonthlySettlementsByMonth(2026, 7);

			expect(result.data).toBeNull();
			expect(result.error).toEqual(error);
		});
	});

	describe('createModulesMonthlySettlement', () => {
		it('inserts a settlement and returns it', async () => {
			const { supabase, chain } = createSupabaseMock();
			const input = buildInput();
			chain.single = jest.fn().mockResolvedValue({ data: { id: 1, ...input }, error: null });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await createModulesMonthlySettlement(input);

			expect(supabase.from).toHaveBeenCalledWith('modules_monthly_settlements');
			expect(chain.insert).toHaveBeenCalledWith(input);
			expect(result.data).toEqual({ id: 1, ...input });
		});
	});

	describe('updateModulesMonthlySettlement', () => {
		it('updates a settlement by id', async () => {
			const { supabase, chain } = createSupabaseMock();
			const changes = { amount: 120000 };
			chain.single = jest.fn().mockResolvedValue({ data: { id: 5, ...changes }, error: null });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await updateModulesMonthlySettlement(5, changes);

			expect(chain.update).toHaveBeenCalledWith(changes);
			expect(chain.eq).toHaveBeenCalledWith('id', 5);
			expect(result.data).toEqual({ id: 5, amount: 120000 });
		});
	});

	describe('deleteModulesMonthlySettlement', () => {
		it('deletes a settlement by id', async () => {
			const { supabase, chain } = createSupabaseMock();
			chain.single = jest.fn().mockResolvedValue({ data: { id: 10 }, error: null });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await deleteModulesMonthlySettlement(10);

			expect(chain.delete).toHaveBeenCalled();
			expect(chain.eq).toHaveBeenCalledWith('id', 10);
			expect(result.data).toEqual({ id: 10 });
		});
	});

	describe('upsertModulesMonthlySettlement', () => {
		it('upserts a batch of settlements on user, year and month conflict in a single call', async () => {
			const { supabase, chain } = createSupabaseMock();
			const inputs = [buildInput(), { ...buildInput(), user_id: 'user-2' }];
			chain.select = jest
				.fn()
				.mockResolvedValue({
					data: inputs.map((input, i) => ({ id: i + 1, ...input })),
					error: null,
				});
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await upsertModulesMonthlySettlement(inputs);

			expect(chain.upsert).toHaveBeenCalledWith(inputs, { onConflict: 'user_id,year,month' });
			expect(result.data).toEqual(inputs.map((input, i) => ({ id: i + 1, ...input })));
		});

		it('returns the error on failure without partial data', async () => {
			const { supabase, chain } = createSupabaseMock();
			const inputs = [buildInput(), { ...buildInput(), user_id: 'user-2' }];
			const error = { message: 'constraint violation' };
			chain.select = jest.fn().mockResolvedValue({ data: null, error });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await upsertModulesMonthlySettlement(inputs);

			expect(result.data).toBeNull();
			expect(result.error).toEqual(error);
		});
	});

	describe('getApprovedModulesAmountsForMonth', () => {
		it('aggregates approved modules per user with sum, count, name fallback, ignoring rows without user_id, within Argentina timezone month bounds', async () => {
			const { supabase, chain } = createSupabaseMock();
			chain.lte = jest.fn().mockResolvedValue({
				data: [
					{ user_id: 'user-1', amount: 1000, users: { name: 'Juan', last_name: 'Pérez' } },
					{ user_id: 'user-1', amount: 2000, users: { name: 'Juan', last_name: 'Pérez' } },
					{ user_id: 'user-2', amount: 500, users: { username: 'mgarcia' } },
					{ user_id: 'user-3', amount: null, users: null },
					{ user_id: null, amount: 999 },
				],
				error: null,
			});
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getApprovedModulesAmountsForMonth(2026, 7);

			expect(supabase.from).toHaveBeenCalledWith('modules');
			expect(chain.select).toHaveBeenCalledWith(expect.stringContaining('users'));
			expect(chain.eq).toHaveBeenCalledWith('status', 'approved');
			expect((chain.gte as jest.Mock).mock.calls[0]).toEqual([
				'created_at',
				'2026-08-01T03:00:00.000Z',
			]);
			expect((chain.lte as jest.Mock).mock.calls[0]).toEqual([
				'created_at',
				'2026-09-01T02:59:59.999Z',
			]);
			expect(Object.keys(result.data!)).toHaveLength(3);
			expect(result.data?.['user-1']).toEqual({ amount: 3000, count: 2, name: 'Juan Pérez' });
			expect(result.data?.['user-2']).toEqual({ amount: 500, count: 1, name: 'mgarcia' });
			expect(result.data?.['user-3']).toEqual({ amount: 0, count: 1, name: 'Desconocido' });
		});

		it('computes correct UTC bounds across a December-to-January month rollover', async () => {
			const { supabase, chain } = createSupabaseMock();
			chain.lte = jest.fn().mockResolvedValue({ data: [], error: null });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			await getApprovedModulesAmountsForMonth(2026, 11);

			expect((chain.gte as jest.Mock).mock.calls[0][1]).toBe('2026-12-01T03:00:00.000Z');
			expect((chain.lte as jest.Mock).mock.calls[0][1]).toBe('2027-01-01T02:59:59.999Z');
		});

		it('returns the error on failure', async () => {
			const { supabase, chain } = createSupabaseMock();
			const error = { message: 'Failed' };
			chain.lte = jest.fn().mockResolvedValue({ data: null, error });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getApprovedModulesAmountsForMonth(2026, 7);

			expect(result.data).toBeNull();
			expect(result.error).toEqual(error);
		});
	});
});
