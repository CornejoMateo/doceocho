import {
	getMonthlySettlement,
	getMonthlySettlementsByUser,
	getAllMonthlySettlements,
	getMonthlySettlementsByMonth,
	createMonthlySettlement,
	updateMonthlySettlement,
	deleteMonthlySettlement,
	upsertMonthlySettlement,
	type MonthlySettlementInput,
} from '@/lib/attendance/settlements';
import { getSupabaseClient } from '@/lib/supabase-client';

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: jest.fn(),
}));

function createSupabaseMock() {
	const chain: Record<string, jest.Mock> = {
		select: jest.fn(() => chain),
		order: jest.fn(() => chain),
		eq: jest.fn(() => chain),
		or: jest.fn(() => chain),
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

describe('settlements lib', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getMonthlySettlement', () => {
		it('fetches a single settlement by user, year and month', async () => {
			const { supabase, chain } = createSupabaseMock();
			const settlement = { id: 1, user_id: 'user-1', year: 2026, month: 7 };
			chain.maybeSingle = jest.fn().mockResolvedValue({ data: settlement, error: null });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getMonthlySettlement('user-1', 2026, 7);

			expect(supabase.from).toHaveBeenCalledWith('monthly_settlements');
			expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-1');
			expect(chain.eq).toHaveBeenCalledWith('year', 2026);
			expect(chain.eq).toHaveBeenCalledWith('month', 7);
			expect(result.data).toEqual(settlement);
		});

		it('returns null when no settlement found', async () => {
			const { supabase, chain } = createSupabaseMock();
			chain.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getMonthlySettlement('user-1', 2026, 7);

			expect(result.data).toBeNull();
		});

		it('returns the error on failure', async () => {
			const { supabase, chain } = createSupabaseMock();
			const error = { message: 'Failed' };
			chain.maybeSingle = jest.fn().mockResolvedValue({ data: null, error });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getMonthlySettlement('user-1', 2026, 7);

			expect(result.error).toEqual(error);
		});
	});

	describe('getMonthlySettlementsByUser', () => {
		it('fetches all settlements of a user ordered by year and month', async () => {
			const { supabase, chain } = createSupabaseMock();
			const settlements = [
				{ id: 2, user_id: 'user-1', year: 2026, month: 7 },
				{ id: 1, user_id: 'user-1', year: 2026, month: 6 },
			];
			const secondOrder = jest.fn().mockResolvedValue({ data: settlements, error: null });
			chain.order = jest.fn(() => ({ order: secondOrder }));
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getMonthlySettlementsByUser('user-1');

			expect(supabase.from).toHaveBeenCalledWith('monthly_settlements');
			expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-1');
			expect(chain.order).toHaveBeenCalledWith('year', { ascending: false });
			expect(secondOrder).toHaveBeenCalledWith('month', { ascending: false });
			expect(result.data).toEqual(settlements);
		});

		it('returns the error on failure', async () => {
			const { supabase, chain } = createSupabaseMock();
			const error = { message: 'Failed' };
			chain.order = jest.fn(() => ({
				order: jest.fn().mockResolvedValue({ data: null, error }),
			}));
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getMonthlySettlementsByUser('user-1');

			expect(result.data).toBeNull();
			expect(result.error).toEqual(error);
		});
	});

	describe('getAllMonthlySettlements', () => {
		beforeEach(() => {
			jest.useFakeTimers();
			jest.setSystemTime(new Date('2026-08-15T12:00:00Z'));
		});

		afterEach(() => {
			jest.useRealTimers();
		});

		function mockSettlementResponse(
			chain: Record<string, jest.Mock>,
			response: { data: any; error: any }
		) {
			chain.order = jest.fn(() => ({
				order: jest.fn().mockResolvedValue(response),
			}));
		}

		it('filters settlements to the current and previous month', async () => {
			jest.useFakeTimers();
			jest.setSystemTime(new Date(2026, 7, 11)); // August 11, 2026

			const { supabase, chain } = createSupabaseMock();
			const mockData = [
				{
					id: 1,
					users: {
						name: 'Juan',
						last_name: 'Pérez',
					},
				},
			];

			mockSettlementResponse(chain, {
				data: mockData,
				error: null,
			});

			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getAllMonthlySettlements();

			expect(supabase.from).toHaveBeenCalledWith('monthly_settlements');

			expect(chain.select).toHaveBeenCalledWith(expect.stringContaining('users'));

			expect(chain.or).toHaveBeenCalledWith(
				'and(year.eq.2026,month.eq.8),and(year.eq.2026,month.eq.7)'
			);

			expect(result.data?.[0].id).toBe(1);
			expect(result.data?.[0].user_name).toBe('Juan Pérez');

			jest.useRealTimers();
		});

		it('builds user_name from username when name and last_name are missing', async () => {
			const { supabase, chain } = createSupabaseMock();
			mockSettlementResponse(chain, {
				data: [{ id: 1, users: { username: 'jperez' } }],
				error: null,
			});
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getAllMonthlySettlements();

			expect(result.data?.[0].user_name).toBe('jperez');
		});

		it('uses Desconocido when no user info', async () => {
			const { supabase, chain } = createSupabaseMock();
			mockSettlementResponse(chain, { data: [{ id: 1, users: null }], error: null });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getAllMonthlySettlements();

			expect(result.data?.[0].user_name).toBe('Desconocido');
		});

		it('returns null when no data', async () => {
			const { supabase, chain } = createSupabaseMock();
			mockSettlementResponse(chain, { data: null, error: null });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getAllMonthlySettlements();

			expect(result.data).toBeNull();
		});

		it('returns the error on failure', async () => {
			const { supabase, chain } = createSupabaseMock();
			const error = { message: 'Failed' };
			mockSettlementResponse(chain, { data: null, error });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getAllMonthlySettlements();

			expect(result.data).toBeNull();
			expect(result.error).toEqual(error);
		});
	});

	describe('getMonthlySettlementsByMonth', () => {
		function mockSettlementResponse(
			chain: Record<string, jest.Mock>,
			response: { data: any; error: any }
		) {
			chain.order = jest.fn().mockResolvedValue(response);
		}

		it('fetches settlements filtered by year and month with user names', async () => {
			const { supabase, chain } = createSupabaseMock();
			const mockData = [
				{
					id: 1,
					user_id: 'user-1',
					users: {
						name: 'Juan',
						last_name: 'Pérez',
					},
				},
			];

			mockSettlementResponse(chain, { data: mockData, error: null });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getMonthlySettlementsByMonth(2026, 7);

			expect(supabase.from).toHaveBeenCalledWith('monthly_settlements');
			expect(chain.select).toHaveBeenCalledWith(expect.stringContaining('users'));
			expect(chain.eq).toHaveBeenCalledWith('year', 2026);
			expect(chain.eq).toHaveBeenCalledWith('month', 7);
			expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
			expect(result.data?.[0].id).toBe(1);
			expect(result.data?.[0].user_name).toBe('Juan Pérez');
		});

		it('builds user_name from username when name and last_name are missing', async () => {
			const { supabase, chain } = createSupabaseMock();
			mockSettlementResponse(chain, {
				data: [{ id: 1, users: { username: 'jperez' } }],
				error: null,
			});
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getMonthlySettlementsByMonth(2026, 7);

			expect(result.data?.[0].user_name).toBe('jperez');
		});

		it('uses Desconocido when no user info', async () => {
			const { supabase, chain } = createSupabaseMock();
			mockSettlementResponse(chain, { data: [{ id: 1, users: null }], error: null });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getMonthlySettlementsByMonth(2026, 7);

			expect(result.data?.[0].user_name).toBe('Desconocido');
		});

		it('returns null when no data', async () => {
			const { supabase, chain } = createSupabaseMock();
			mockSettlementResponse(chain, { data: null, error: null });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getMonthlySettlementsByMonth(2026, 7);

			expect(result.data).toBeNull();
		});

		it('returns the error on failure', async () => {
			const { supabase, chain } = createSupabaseMock();
			const error = { message: 'Failed' };
			mockSettlementResponse(chain, { data: null, error });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getMonthlySettlementsByMonth(2026, 7);

			expect(result.data).toBeNull();
			expect(result.error).toEqual(error);
		});
	});

	describe('createMonthlySettlement', () => {
		it('inserts a settlement and returns it', async () => {
			const { supabase, chain } = createSupabaseMock();
			const input: MonthlySettlementInput = {
				year: 2026,
				month: 7,
				user_id: 'user-1',
				amount: 100000,
				number_hours: 160,
				number_overtime_hours: 10,
				price_hour: 500,
				price_overtime_hour: 750,
			};
			chain.single = jest.fn().mockResolvedValue({ data: { id: 1, ...input }, error: null });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await createMonthlySettlement(input);

			expect(supabase.from).toHaveBeenCalledWith('monthly_settlements');
			expect(chain.insert).toHaveBeenCalledWith(input);
			expect(result.data).toEqual({ id: 1, ...input });
		});

		it('returns the error on failure', async () => {
			const { supabase, chain } = createSupabaseMock();
			const input: MonthlySettlementInput = {
				year: 2026,
				month: 7,
				user_id: 'user-1',
				amount: 100000,
				number_hours: 160,
				number_overtime_hours: 10,
				price_hour: 500,
				price_overtime_hour: 750,
			};
			const error = { message: 'Failed' };
			chain.single = jest.fn().mockResolvedValue({ data: null, error });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await createMonthlySettlement(input);

			expect(result.error).toEqual(error);
		});
	});

	describe('updateMonthlySettlement', () => {
		it('updates a settlement by id', async () => {
			const { supabase, chain } = createSupabaseMock();
			const changes = { amount: 120000 };
			chain.single = jest.fn().mockResolvedValue({ data: { id: 5, ...changes }, error: null });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await updateMonthlySettlement(5, changes);

			expect(supabase.from).toHaveBeenCalledWith('monthly_settlements');
			expect(chain.update).toHaveBeenCalledWith(changes);
			expect(chain.eq).toHaveBeenCalledWith('id', 5);
			expect(result.data).toEqual({ id: 5, amount: 120000 });
		});

		it('returns the error on failure', async () => {
			const { supabase, chain } = createSupabaseMock();
			const error = { message: 'Failed' };
			chain.single = jest.fn().mockResolvedValue({ data: null, error });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await updateMonthlySettlement(5, { amount: 120000 });

			expect(result.error).toEqual(error);
		});
	});

	describe('deleteMonthlySettlement', () => {
		it('deletes a settlement by id', async () => {
			const { supabase, chain } = createSupabaseMock();
			chain.single = jest.fn().mockResolvedValue({ data: { id: 10 }, error: null });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await deleteMonthlySettlement(10);

			expect(supabase.from).toHaveBeenCalledWith('monthly_settlements');
			expect(chain.delete).toHaveBeenCalled();
			expect(chain.eq).toHaveBeenCalledWith('id', 10);
			expect(result.data).toEqual({ id: 10 });
		});

		it('returns the error on failure', async () => {
			const { supabase, chain } = createSupabaseMock();
			const error = { message: 'Failed' };
			chain.single = jest.fn().mockResolvedValue({ data: null, error });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await deleteMonthlySettlement(10);

			expect(result.error).toEqual(error);
		});
	});

	describe('upsertMonthlySettlement', () => {
		it('upserts a settlement on user, year and month conflict and returns it', async () => {
			const { supabase, chain } = createSupabaseMock();
			const input: MonthlySettlementInput = {
				year: 2026,
				month: 7,
				user_id: 'user-1',
				amount: 100000,
				number_hours: 160,
				number_overtime_hours: 10,
				price_hour: 500,
				price_overtime_hour: 750,
			};
			chain.single = jest.fn().mockResolvedValue({ data: { id: 1, ...input }, error: null });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await upsertMonthlySettlement(input);

			expect(supabase.from).toHaveBeenCalledWith('monthly_settlements');
			expect(chain.upsert).toHaveBeenCalledWith(input, {
				onConflict: 'user_id,year,month',
			});
			expect(result.data).toEqual({ id: 1, ...input });
		});

		it('returns the error on failure', async () => {
			const { supabase, chain } = createSupabaseMock();
			const input: MonthlySettlementInput = {
				year: 2026,
				month: 7,
				user_id: 'user-1',
				amount: 100000,
				number_hours: 160,
				number_overtime_hours: 10,
				price_hour: 500,
				price_overtime_hour: 750,
			};
			const error = { message: 'Failed' };
			chain.single = jest.fn().mockResolvedValue({ data: null, error });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await upsertMonthlySettlement(input);

			expect(result.error).toEqual(error);
		});
	});
});
