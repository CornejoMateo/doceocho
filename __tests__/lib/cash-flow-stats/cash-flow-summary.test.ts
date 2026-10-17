import { getSummaryMonthly, getFixedCostsMonthly } from '@/lib/cash-flow-stats/cash-flow-summary';
import { getSupabaseClient } from '@/lib/supabase-client';

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: jest.fn(),
}));

describe('getSummaryMonthly', () => {
	beforeEach(() => jest.clearAllMocks());

	it('calls the RPC with the selected year', async () => {
		const rpc = jest.fn().mockResolvedValue({ data: [], error: null });
		(getSupabaseClient as jest.Mock).mockReturnValue({ rpc });

		await getSummaryMonthly(2026);

		expect(rpc).toHaveBeenCalledWith('cash_flow_summary_monthly', { p_year: 2026 });
	});

	it('maps snake_case numeric-string RPC rows to the camelCase shape', async () => {
		(getSupabaseClient as jest.Mock).mockReturnValue({
			rpc: jest.fn().mockResolvedValue({
				data: [
					{
						month: '1',
						work_id: '5',
						income_net: '1000.5',
						income_iva: '210.1',
						expense_net: '400',
						expense_iva: '84',
						collection_amount: '0',
						payment_amount: '0',
					},
					{
						month: 3,
						work_id: null,
						income_net: 0,
						income_iva: 0,
						expense_net: 0,
						expense_iva: 0,
						collection_amount: 300,
						payment_amount: 150,
					},
				],
				error: null,
			}),
		});

		const { data, error } = await getSummaryMonthly(2026);

		expect(error).toBeNull();
		expect(data).toEqual([
			{
				month: 1,
				workId: 5,
				incomeNet: 1000.5,
				incomeIva: 210.1,
				expenseNet: 400,
				expenseIva: 84,
				collectionAmount: 0,
				paymentAmount: 0,
			},
			{
				month: 3,
				workId: null,
				incomeNet: 0,
				incomeIva: 0,
				expenseNet: 0,
				expenseIva: 0,
				collectionAmount: 300,
				paymentAmount: 150,
			},
		]);
	});

	it('returns the RPC error untouched instead of mapping rows', async () => {
		(getSupabaseClient as jest.Mock).mockReturnValue({
			rpc: jest.fn().mockResolvedValue({ data: null, error: { message: 'boom' } }),
		});

		const { data, error } = await getSummaryMonthly(2026);

		expect(data).toBeNull();
		expect(error).toEqual({ message: 'boom' });
	});

	it('defaults to an empty array when the RPC returns null data', async () => {
		(getSupabaseClient as jest.Mock).mockReturnValue({
			rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
		});

		const { data } = await getSummaryMonthly(2026);
		expect(data).toEqual([]);
	});
});

describe('getFixedCostsMonthly', () => {
	beforeEach(() => jest.clearAllMocks());

	it('calls the RPC with the selected year', async () => {
		const rpc = jest.fn().mockResolvedValue({ data: [], error: null });
		(getSupabaseClient as jest.Mock).mockReturnValue({ rpc });

		await getFixedCostsMonthly(2026);

		expect(rpc).toHaveBeenCalledWith('cash_flow_fixed_costs_monthly', { p_year: 2026 });
	});

	it('maps snake_case numeric-string RPC rows to the camelCase shape', async () => {
		(getSupabaseClient as jest.Mock).mockReturnValue({
			rpc: jest.fn().mockResolvedValue({
				data: [{ month: '1', net: '1000', iva: '210', total: '1210' }],
				error: null,
			}),
		});

		const { data, error } = await getFixedCostsMonthly(2026);

		expect(error).toBeNull();
		expect(data).toEqual([{ month: 1, net: 1000, iva: 210, total: 1210 }]);
	});

	it('returns the RPC error untouched instead of mapping rows', async () => {
		(getSupabaseClient as jest.Mock).mockReturnValue({
			rpc: jest.fn().mockResolvedValue({ data: null, error: { message: 'boom' } }),
		});

		const { data, error } = await getFixedCostsMonthly(2026);

		expect(data).toBeNull();
		expect(error).toEqual({ message: 'boom' });
	});
});
