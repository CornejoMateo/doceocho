import { listSupplierPurchasesPage } from '@/lib/suppliers/purchases-suppliers';
import { getSupabaseClient } from '@/lib/supabase-client';

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: jest.fn(),
}));

describe('listSupplierPurchasesPage', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('maps snake_case numeric-string RPC rows to the camelCase purchase shape', async () => {
		const rpc = jest.fn().mockResolvedValue({
			data: [
				{
					id: '11',
					created_at: '2026-01-10T00:00:00.000Z',
					amount_ars: '1000',
					supplier_id: '3',
					notes: 'vidrios',
					total_paid_ars: '400',
					balance_ars: '600',
					total_count: '5',
				},
			],
			error: null,
		});
		(getSupabaseClient as jest.Mock).mockReturnValue({ rpc });

		const { data, error } = await listSupplierPurchasesPage({ supplierId: 3, status: 'pending' });

		expect(error).toBeNull();
		expect(data).toEqual({
			purchases: [
				{
					id: 11,
					created_at: '2026-01-10T00:00:00.000Z',
					amount_ars: 1000,
					supplier_id: 3,
					notes: 'vidrios',
					totalPaidArs: 400,
					balanceArs: 600,
				},
			],
			totalCount: 5,
		});
	});

	it('passes supplier id, status, date range, limit and offset to the RPC', async () => {
		const rpc = jest.fn().mockResolvedValue({ data: [], error: null });
		(getSupabaseClient as jest.Mock).mockReturnValue({ rpc });

		await listSupplierPurchasesPage({
			supplierId: 7,
			status: 'paid',
			from: '2026-01-01',
			to: '2026-01-31',
			limit: 20,
			offset: 40,
		});

		expect(rpc).toHaveBeenCalledWith('list_supplier_purchases', {
			p_supplier_id: 7,
			p_status: 'paid',
			p_from: '2026-01-01',
			p_to: '2026-01-31',
			p_limit: 20,
			p_offset: 40,
		});
	});

	it('defaults from, to, limit and offset when omitted', async () => {
		const rpc = jest.fn().mockResolvedValue({ data: [], error: null });
		(getSupabaseClient as jest.Mock).mockReturnValue({ rpc });

		await listSupplierPurchasesPage({ supplierId: 7, status: 'pending' });

		expect(rpc).toHaveBeenCalledWith('list_supplier_purchases', {
			p_supplier_id: 7,
			p_status: 'pending',
			p_from: null,
			p_to: null,
			p_limit: 20,
			p_offset: 0,
		});
	});

	it('returns a zero total count and empty purchases when the RPC returns no rows', async () => {
		const rpc = jest.fn().mockResolvedValue({ data: [], error: null });
		(getSupabaseClient as jest.Mock).mockReturnValue({ rpc });

		const { data, error } = await listSupplierPurchasesPage({ supplierId: 7, status: 'paid' });

		expect(error).toBeNull();
		expect(data).toEqual({ purchases: [], totalCount: 0 });
	});

	it('returns the RPC error untouched instead of mapping rows', async () => {
		const rpc = jest.fn().mockResolvedValue({
			data: null,
			error: { message: 'Estado inválido: bogus (debe ser pending o paid)' },
		});
		(getSupabaseClient as jest.Mock).mockReturnValue({ rpc });

		const { data, error } = await listSupplierPurchasesPage({
			supplierId: 7,
			status: 'pending',
		});

		expect(data).toBeNull();
		expect(error).toEqual({ message: 'Estado inválido: bogus (debe ser pending o paid)' });
	});
});
