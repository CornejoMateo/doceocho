import { listSupplierPurchasesPage } from '@/lib/suppliers/supplier-expenses';
import { getSupabaseClient } from '@/lib/supabase-client';

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: jest.fn(),
}));

function setupRpc(result: { data?: any; error?: any }) {
	const rpc = jest.fn().mockResolvedValue({ data: null, error: null, ...result });
	(getSupabaseClient as jest.Mock).mockReturnValue({ rpc });
	return { rpc };
}

describe('lib/suppliers/supplier-expenses', () => {
	beforeEach(() => jest.clearAllMocks());

	describe('listSupplierPurchasesPage', () => {
		it('calls the RPC with the p_-prefixed params and maps rows, reading total_count from the first row', async () => {
			const { rpc } = setupRpc({
				data: [
					{
						id: '11',
						created_at: '2026-01-10T00:00:00Z',
						date: '2026-01-10',
						voucher_number: 'A-0001',
						voucher_type_id: '1',
						voucher_type_name: 'Factura A',
						work_id: '7',
						work_name: 'Obra Norte',
						category_id: '3',
						category_name: 'Materiales',
						payment_method_id: '2',
						payment_method_name: 'Transferencia',
						bank_account_id: null,
						bank_account_name: null,
						description: 'Compra de cemento',
						net_amount: '1000.00',
						iva_percent: '21',
						iva_amount: '210.00',
						total_amount: '1210.00',
						total_paid_ars: '0',
						balance_ars: '1210',
						total_count: '5',
					},
				],
			});

			const res = await listSupplierPurchasesPage({
				supplierId: 3,
				status: 'pending',
				from: '2026-01-01',
				to: '2026-01-31',
				limit: 20,
				offset: 0,
			});

			expect(rpc).toHaveBeenCalledWith('list_supplier_purchases', {
				p_supplier_id: 3,
				p_status: 'pending',
				p_from: '2026-01-01',
				p_to: '2026-01-31',
				p_limit: 20,
				p_offset: 0,
			});
			expect(res.data?.totalCount).toBe(5);
			expect(res.data?.purchases[0]).toEqual(
				expect.objectContaining({
					id: 11,
					date: '2026-01-10',
					voucher_number: 'A-0001',
					work_id: 7,
					category_id: 3,
					payment_method_id: 2,
					bank_account_id: null,
					net_amount: 1000,
					iva_percent: 21,
					iva_amount: 210,
					total_amount: 1210,
					totalPaidArs: 0,
					balanceArs: 1210,
				})
			);
		});

		it('returns totalCount 0 for an empty page', async () => {
			setupRpc({ data: [] });

			const res = await listSupplierPurchasesPage({ supplierId: 3, status: 'paid' });

			expect(res.data).toEqual({ purchases: [], totalCount: 0 });
		});

		it('defaults from/to to null and limit/offset to 20/0', async () => {
			const { rpc } = setupRpc({ data: [] });

			await listSupplierPurchasesPage({ supplierId: 3, status: 'pending' });

			expect(rpc).toHaveBeenCalledWith('list_supplier_purchases', {
				p_supplier_id: 3,
				p_status: 'pending',
				p_from: null,
				p_to: null,
				p_limit: 20,
				p_offset: 0,
			});
		});

		it('passes errors through without mapping', async () => {
			const err = { message: 'boom' };
			setupRpc({ error: err });

			expect(await listSupplierPurchasesPage({ supplierId: 3, status: 'pending' })).toEqual({
				data: null,
				error: err,
			});
		});
	});
});
