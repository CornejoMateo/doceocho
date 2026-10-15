import {
	getSupplierAccountTotals,
	getSuppliersAccountsSummary,
} from '@/lib/suppliers/account-summary';
import { getSupabaseClient } from '@/lib/supabase-client';

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: jest.fn(),
}));

describe('getSuppliersAccountsSummary: snake_case RPC row mapping', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('maps snake_case numeric-string RPC rows to the camelCase SupplierAccountSummary shape', async () => {
		(getSupabaseClient as jest.Mock).mockReturnValue({
			rpc: jest.fn().mockResolvedValue({
				data: [
					{
						supplier_id: 7,
						supplier_name: 'Vidrios SA',
						total_purchases_ars: '1200.5',
						total_payments_ars: '600',
						balance_ars: '600.5',
					},
				],
				error: null,
			}),
		});

		const { data, error } = await getSuppliersAccountsSummary();

		expect(error).toBeNull();
		expect(data).toEqual([
			{
				supplier_id: 7,
				supplier_name: 'Vidrios SA',
				totalPurchasesArs: 1200.5,
				totalPaymentsArs: 600,
				balanceArs: 600.5,
			},
		]);
	});

	it('returns the RPC error untouched instead of mapping rows', async () => {
		(getSupabaseClient as jest.Mock).mockReturnValue({
			rpc: jest.fn().mockResolvedValue({ data: null, error: { message: 'boom' } }),
		});

		const { data, error } = await getSuppliersAccountsSummary();

		expect(data).toBeNull();
		expect(error).toEqual({ message: 'boom' });
	});
});

describe('getSupplierAccountTotals: snake_case RPC row mapping', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('maps a snake_case numeric-string RPC row to the camelCase totals shape', async () => {
		(getSupabaseClient as jest.Mock).mockReturnValue({
			rpc: jest.fn().mockResolvedValue({
				data: [
					{
						total_purchases_ars: '1200.5',
						total_payments_ars: '600',
						balance_ars: '600.5',
						pending_count: '3',
						paid_count: '2',
					},
				],
				error: null,
			}),
		});

		const { data, error } = await getSupplierAccountTotals(7);

		expect(error).toBeNull();
		expect(data).toEqual({
			totalPurchasesArs: 1200.5,
			totalPaymentsArs: 600,
			balanceArs: 600.5,
			pendingCount: 3,
			paidCount: 2,
		});
	});

	it('passes the supplier id to the RPC', async () => {
		const rpc = jest.fn().mockResolvedValue({
			data: [
				{
					total_purchases_ars: 0,
					total_payments_ars: 0,
					balance_ars: 0,
					pending_count: 0,
					paid_count: 0,
				},
			],
			error: null,
		});
		(getSupabaseClient as jest.Mock).mockReturnValue({ rpc });

		await getSupplierAccountTotals(42);

		expect(rpc).toHaveBeenCalledWith('get_supplier_account_totals', { p_supplier_id: 42 });
	});

	it('returns all-zero totals when the RPC returns no row', async () => {
		(getSupabaseClient as jest.Mock).mockReturnValue({
			rpc: jest.fn().mockResolvedValue({ data: [], error: null }),
		});

		const { data, error } = await getSupplierAccountTotals(7);

		expect(error).toBeNull();
		expect(data).toEqual({
			totalPurchasesArs: 0,
			totalPaymentsArs: 0,
			balanceArs: 0,
			pendingCount: 0,
			paidCount: 0,
		});
	});

	it('returns the RPC error untouched instead of mapping the row', async () => {
		(getSupabaseClient as jest.Mock).mockReturnValue({
			rpc: jest.fn().mockResolvedValue({ data: null, error: { message: 'boom' } }),
		});

		const { data, error } = await getSupplierAccountTotals(7);

		expect(data).toBeNull();
		expect(error).toEqual({ message: 'boom' });
	});
});
