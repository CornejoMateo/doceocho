import { deletePurchaseSupplier } from '@/lib/suppliers/purchases-suppliers';
import { listFilesByPaymentSupplierIds } from '@/lib/suppliers/files-payments-suppliers';
import { getSupabaseClient } from '@/lib/supabase-client';

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: jest.fn(),
}));

type RpcResult = { data?: any; error?: any };
type StorageResult = { error?: any };

function setup(rpcResult: RpcResult, storageResult: StorageResult = { error: null }) {
	const rpc = jest.fn(() => Promise.resolve({ data: null, error: null, ...rpcResult }));
	const remove = jest.fn((paths: string[]) =>
		Promise.resolve({ data: paths, error: null, ...storageResult })
	);
	const storage = { remove };

	(getSupabaseClient as jest.Mock).mockReturnValue({
		rpc,
		storage: { from: jest.fn(() => storage) },
	});

	return { rpc, storage };
}

describe('lib/suppliers: atomic purchase deletion', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		(console.error as jest.Mock).mockRestore();
	});

	describe('deletePurchaseSupplier', () => {
		it('calls the RPC with the purchase id and removes the returned storage paths', async () => {
			const { rpc, storage } = setup({
				data: ['purchases/11/uuid-1.jpg', 'payments/22/uuid-2.pdf'],
			});

			const result = await deletePurchaseSupplier(11);

			expect(rpc).toHaveBeenCalledWith('delete_purchase_supplier', { p_id: 11 });
			expect(storage.remove).toHaveBeenCalledWith([
				'purchases/11/uuid-1.jpg',
				'payments/22/uuid-2.pdf',
			]);
			expect(result).toEqual({ error: null });
		});

		it('never touches storage when the RPC errors', async () => {
			const { storage } = setup({
				data: null,
				error: { message: 'No se pudo eliminar la compra (no existe o no tenés permisos)' },
			});

			const result = await deletePurchaseSupplier(11);

			expect(result).toEqual({
				error: { message: 'No se pudo eliminar la compra (no existe o no tenés permisos)' },
			});
			expect(storage.remove).not.toHaveBeenCalled();
		});

		it('deletes the row without a storage call when the RPC returns no paths', async () => {
			const { storage } = setup({ data: [] });

			const result = await deletePurchaseSupplier(11);

			expect(result).toEqual({ error: null });
			expect(storage.remove).not.toHaveBeenCalled();
		});

		it('chunks storage removal into batches of 100 paths', async () => {
			const paths = Array.from({ length: 150 }, (_, i) => `purchases/11/file-${i}.jpg`);
			const { storage } = setup({ data: paths });

			await deletePurchaseSupplier(11);

			expect(storage.remove).toHaveBeenCalledTimes(2);
			expect(storage.remove).toHaveBeenNthCalledWith(1, paths.slice(0, 100));
			expect(storage.remove).toHaveBeenNthCalledWith(2, paths.slice(100));
		});

		it('succeeds with orphaned paths, never failing the delete, when storage removal errors', async () => {
			const { storage } = setup(
				{ data: ['purchases/11/uuid-1.jpg'] },
				{ error: { message: 'storage down' } }
			);

			const result = await deletePurchaseSupplier(11);

			expect(result).toEqual({ error: null, orphanedPaths: ['purchases/11/uuid-1.jpg'] });
			expect(storage.remove).toHaveBeenCalledTimes(1);
			expect(console.error).toHaveBeenCalled();
		});

		it('filters out empty storage paths before calling remove', async () => {
			const { storage } = setup({ data: ['purchases/11/uuid-1.jpg', '', null] });

			await deletePurchaseSupplier(11);

			expect(storage.remove).toHaveBeenCalledWith(['purchases/11/uuid-1.jpg']);
		});
	});

	describe('listFilesByPaymentSupplierIds', () => {
		it('returns an empty list without touching the query builder for no ids', async () => {
			const from = jest.fn();
			(getSupabaseClient as jest.Mock).mockReturnValue({ from });

			const result = await listFilesByPaymentSupplierIds([]);

			expect(result).toEqual({ data: [], error: null });
			expect(from).not.toHaveBeenCalled();
		});

		it('returns the rows of every requested payment', async () => {
			const PAYMENT_FILE = {
				id: 2,
				created_at: '2026-09-01T10:05:00.000Z',
				storage_path: 'payments/22/uuid-2.pdf',
				payment_supplier_id: 22,
				file_name: 'recibo.pdf',
				description: null,
			};
			const SECOND_PAYMENT_FILE = { ...PAYMENT_FILE, id: 3, payment_supplier_id: 33 };
			const chain: Record<string, jest.Mock> = {
				select: jest.fn(() => chain),
				in: jest.fn(() => chain),
				order: jest.fn(() => chain),
			};
			(chain as any).then = (resolve: (v: any) => any) =>
				resolve({ data: [PAYMENT_FILE, SECOND_PAYMENT_FILE], error: null });
			const from = jest.fn(() => chain);
			(getSupabaseClient as jest.Mock).mockReturnValue({ from });

			const { data, error } = await listFilesByPaymentSupplierIds([22, 33]);

			expect(error).toBeNull();
			expect(data).toEqual([PAYMENT_FILE, SECOND_PAYMENT_FILE]);
			expect(from).toHaveBeenCalledWith('files_payments_suppliers');
			expect(chain.in).toHaveBeenCalledWith('payment_supplier_id', [22, 33]);
			expect(chain.order).toHaveBeenCalledWith('id', { ascending: true });
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

			const { data, error } = await listFilesByPaymentSupplierIds([22]);

			expect(data).toBeNull();
			expect(error).toBe('list failed');
		});
	});
});
