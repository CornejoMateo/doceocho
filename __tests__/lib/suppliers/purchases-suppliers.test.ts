import { listPurchasesSuppliersWithBalance } from '@/lib/suppliers/purchases-suppliers';
import { getSupabaseClient } from '@/lib/supabase-client';

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: jest.fn(),
}));

function setup(result: { data?: any; error?: any }) {
	const chain: Record<string, any> = {};
	['select', 'eq', 'order'].forEach((m) => {
		chain[m] = jest.fn(() => chain);
	});
	chain.then = (resolve: (v: any) => any) => resolve({ data: null, error: null, ...result });
	const from = jest.fn(() => chain);
	(getSupabaseClient as jest.Mock).mockReturnValue({ from });
	return { chain, from };
}

describe('lib/suppliers/purchases-suppliers', () => {
	beforeEach(() => jest.clearAllMocks());

	describe('listPurchasesSuppliersWithBalance', () => {
		it('runs a single joined query (no per-purchase RPC) filtered by supplier_id', async () => {
			const { chain, from } = setup({ data: [] });

			await listPurchasesSuppliersWithBalance(3);

			expect(from).toHaveBeenCalledWith('purchases_suppliers');
			expect(chain.select).toHaveBeenCalledWith('*, payments_suppliers(amount_ars)');
			expect(chain.eq).toHaveBeenCalledWith('supplier_id', 3);
			expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
		});

		it('sums joined payments into totalPaidArs and derives balanceArs (amount - paid)', async () => {
			setup({
				data: [
					{
						id: 8,
						created_at: '2026-05-01T00:00:00Z',
						amount_ars: 1000,
						supplier_id: 3,
						notes: 'Compra madera',
						payments_suppliers: [{ amount_ars: 400 }, { amount_ars: 600 }],
					},
				],
			});

			const { data } = await listPurchasesSuppliersWithBalance(3);

			expect(data?.[0]).toEqual(
				expect.objectContaining({ id: 8, amount_ars: 1000, totalPaidArs: 1000, balanceArs: 0 })
			);
		});

		it('returns balanceArs equal to amount_ars when a purchase has no payments', async () => {
			setup({
				data: [
					{
						id: 8,
						created_at: '2026-05-01T00:00:00Z',
						amount_ars: 1000,
						supplier_id: 3,
						notes: null,
						payments_suppliers: [],
					},
				],
			});

			const { data } = await listPurchasesSuppliersWithBalance(3);

			expect(data?.[0]).toEqual(expect.objectContaining({ totalPaidArs: 0, balanceArs: 1000 }));
		});

		it('passes errors through', async () => {
			const err = { message: 'boom' };
			setup({ data: null, error: err });

			expect(await listPurchasesSuppliersWithBalance(3)).toEqual({ data: null, error: err });
		});
	});
});
