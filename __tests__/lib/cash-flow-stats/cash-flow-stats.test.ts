import { getMovementTotals } from '@/lib/cash-flow-stats/cash-flow-stats';
import { getSupabaseClient } from '@/lib/supabase-client';

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: jest.fn(),
}));

describe('getMovementTotals', () => {
	beforeEach(() => jest.clearAllMocks());

	it('calls the RPC with the group-by and date range params', async () => {
		const rpc = jest.fn().mockResolvedValue({ data: [], error: null });
		(getSupabaseClient as jest.Mock).mockReturnValue({ rpc });

		await getMovementTotals('bank_account', '2026-01-01', '2026-01-31');

		expect(rpc).toHaveBeenCalledWith('cash_flow_movement_totals', {
			p_group_by: 'bank_account',
			p_start: '2026-01-01',
			p_end: '2026-01-31',
		});
	});

	it('passes null start/end through for an all-time query', async () => {
		const rpc = jest.fn().mockResolvedValue({ data: [], error: null });
		(getSupabaseClient as jest.Mock).mockReturnValue({ rpc });

		await getMovementTotals('payment_method', null, null);

		expect(rpc).toHaveBeenCalledWith('cash_flow_movement_totals', {
			p_group_by: 'payment_method',
			p_start: null,
			p_end: null,
		});
	});

	it('maps snake_case numeric-string RPC rows to the camelCase MovementTotal shape', async () => {
		(getSupabaseClient as jest.Mock).mockReturnValue({
			rpc: jest.fn().mockResolvedValue({
				data: [
					{ group_id: '1', total_in: '1200.5', total_out: '600' },
					{ group_id: null, total_in: 0, total_out: '50' },
				],
				error: null,
			}),
		});

		const { data, error } = await getMovementTotals('bank_account', null, null);

		expect(error).toBeNull();
		expect(data).toEqual([
			{ groupId: 1, totalIn: 1200.5, totalOut: 600 },
			{ groupId: null, totalIn: 0, totalOut: 50 },
		]);
	});

	it('returns the RPC error untouched instead of mapping rows', async () => {
		(getSupabaseClient as jest.Mock).mockReturnValue({
			rpc: jest.fn().mockResolvedValue({ data: null, error: { message: 'boom' } }),
		});

		const { data, error } = await getMovementTotals('bank_account', null, null);

		expect(data).toBeNull();
		expect(error).toEqual({ message: 'boom' });
	});

	it('maps an empty/null data response to an empty array', async () => {
		(getSupabaseClient as jest.Mock).mockReturnValue({
			rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
		});

		const { data, error } = await getMovementTotals('bank_account', null, null);

		expect(error).toBeNull();
		expect(data).toEqual([]);
	});
});
