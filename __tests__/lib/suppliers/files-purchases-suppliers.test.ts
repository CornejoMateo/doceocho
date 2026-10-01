import { listFilesByPurchaseSupplierIds } from '@/lib/suppliers/files-purchases-suppliers';
import { getSupabaseClient } from '@/lib/supabase-client';

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: jest.fn(),
}));

describe('listFilesByPurchaseSupplierIds', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('returns an empty list without touching the query builder for no ids', async () => {
		const from = jest.fn();
		(getSupabaseClient as jest.Mock).mockReturnValue({ from });

		const result = await listFilesByPurchaseSupplierIds([]);

		expect(result).toEqual({ data: [], error: null });
		expect(from).not.toHaveBeenCalled();
	});

	it('returns the rows of every requested purchase in one query', async () => {
		const PURCHASE_FILE = {
			id: 1,
			created_at: '2026-08-28T12:00:00.000Z',
			storage_path: 'purchases/11/uuid-1.jpg',
			purchase_supplier_id: 11,
			file_name: 'factura.jpg',
			description: null,
		};
		const SECOND_PURCHASE_FILE = { ...PURCHASE_FILE, id: 2, purchase_supplier_id: 33 };
		const chain: Record<string, jest.Mock> = {
			select: jest.fn(() => chain),
			in: jest.fn(() => chain),
			order: jest.fn(() => chain),
		};
		(chain as any).then = (resolve: (v: any) => any) =>
			resolve({ data: [PURCHASE_FILE, SECOND_PURCHASE_FILE], error: null });
		const from = jest.fn(() => chain);
		(getSupabaseClient as jest.Mock).mockReturnValue({ from });

		const { data, error } = await listFilesByPurchaseSupplierIds([11, 33]);

		expect(error).toBeNull();
		expect(data).toEqual([PURCHASE_FILE, SECOND_PURCHASE_FILE]);
		expect(from).toHaveBeenCalledWith('files_purchases_suppliers');
		expect(chain.in).toHaveBeenCalledWith('purchase_supplier_id', [11, 33]);
		expect(chain.order).toHaveBeenCalledWith('id', { ascending: true });
		expect(from).toHaveBeenCalledTimes(1);
	});

	it('groups multiple files under the same purchase', async () => {
		const FILE_A = {
			id: 1,
			created_at: '2026-08-28T12:00:00.000Z',
			storage_path: 'purchases/11/uuid-1.jpg',
			purchase_supplier_id: 11,
			file_name: 'a.jpg',
			description: null,
		};
		const FILE_B = {
			...FILE_A,
			id: 2,
			storage_path: 'purchases/11/uuid-2.jpg',
			file_name: 'b.jpg',
		};
		const chain: Record<string, jest.Mock> = {
			select: jest.fn(() => chain),
			in: jest.fn(() => chain),
			order: jest.fn(() => chain),
		};
		(chain as any).then = (resolve: (v: any) => any) =>
			resolve({ data: [FILE_A, FILE_B], error: null });
		(getSupabaseClient as jest.Mock).mockReturnValue({ from: jest.fn(() => chain) });

		const { data } = await listFilesByPurchaseSupplierIds([11]);

		expect(data).toHaveLength(2);
		expect(data!.every((f) => f.purchase_supplier_id === 11)).toBe(true);
	});

	it('passes the query error through', async () => {
		const chain: Record<string, jest.Mock> = {
			select: jest.fn(() => chain),
			in: jest.fn(() => chain),
			order: jest.fn(() => chain),
		};
		(chain as any).then = (resolve: (v: any) => any) =>
			resolve({ data: null, error: 'list failed' });
		(getSupabaseClient as jest.Mock).mockReturnValue({ from: jest.fn(() => chain) });

		const { data, error } = await listFilesByPurchaseSupplierIds([11]);

		expect(data).toBeNull();
		expect(error).toBe('list failed');
	});
});
