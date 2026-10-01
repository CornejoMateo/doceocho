import { listFilesWithUrlsByPurchaseSupplierId } from '@/lib/suppliers/files-purchases-suppliers';
import { listFilesWithUrlsByPaymentSupplierId } from '@/lib/suppliers/files-payments-suppliers';
import { getSupabaseClient } from '@/lib/supabase-client';

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: jest.fn(),
}));

/** Supabase double where the row query resolves to `list` and each storage
 * download resolves per `downloads[path]` (falling back to a success blob). */
function createSupabaseMock(
	list: { data?: any; error?: any } = {},
	downloads: Record<string, { data?: any; error?: any }> = {}
) {
	const chain: Record<string, jest.Mock> = {
		select: jest.fn(() => chain),
		order: jest.fn(() => chain),
		eq: jest.fn(() => chain),
		insert: jest.fn(() => chain),
		update: jest.fn(() => chain),
		delete: jest.fn(() => chain),
		single: jest.fn(() => chain),
	};
	(chain as any).then = (resolve: (v: any) => any) => resolve({ data: null, error: null, ...list });

	const storage: Record<string, jest.Mock> = {
		from: jest.fn(() => storage),
		upload: jest.fn(),
		remove: jest.fn(),
		download: jest.fn((path: string) =>
			Promise.resolve(
				downloads[path] ?? { data: new Blob(['x'], { type: 'application/pdf' }), error: null }
			)
		),
	};

	const supabase = {
		from: jest.fn(() => chain),
		storage: { from: jest.fn(() => storage) },
	};

	return { supabase, chain, storage };
}

const PURCHASE_ROW = {
	id: 7,
	created_at: '2026-08-28T12:00:00.000Z',
	storage_path: 'purchases/11/uuid-1.jpg',
	purchase_supplier_id: 11,
	file_name: 'factura.jpg',
	description: 'Factura de agosto',
};

const PAYMENT_ROW = {
	id: 9,
	created_at: '2026-09-01T10:00:00.000Z',
	storage_path: 'payments/22/uuid-2.pdf',
	payment_supplier_id: 22,
	file_name: 'recibo.pdf',
	description: null,
};

describe('supplier files libs: list with object urls', () => {
	let createObjectURL: jest.Mock;
	let revokeObjectURL: jest.Mock;

	beforeEach(() => {
		jest.clearAllMocks();
		createObjectURL = jest.fn((blob: Blob) => `blob:${blob.size}`);
		revokeObjectURL = jest.fn();
		URL.createObjectURL = createObjectURL as any;
		URL.revokeObjectURL = revokeObjectURL as any;
	});

	describe('listFilesWithUrlsByPurchaseSupplierId', () => {
		it('lists once and downloads every file straight from storage, without a per-file row lookup', async () => {
			const { supabase, chain, storage } = createSupabaseMock({
				data: [PURCHASE_ROW, { ...PURCHASE_ROW, id: 8, storage_path: 'purchases/11/uuid-3.jpg' }],
			});
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await listFilesWithUrlsByPurchaseSupplierId(11);

			expect(supabase.from).toHaveBeenCalledTimes(1);
			expect(chain.eq).toHaveBeenCalledWith('purchase_supplier_id', 11);
			expect(chain.select).toHaveBeenCalledTimes(1);
			expect(supabase.storage.from).toHaveBeenCalledWith('suppliers-files');
			expect(storage.download).toHaveBeenCalledTimes(2);
			expect(storage.download).toHaveBeenCalledWith('purchases/11/uuid-1.jpg');
			expect(storage.download).toHaveBeenCalledWith('purchases/11/uuid-3.jpg');
			expect(result.error).toBeNull();
		});

		it('maps each row to a FileViewerItem built from the row and the blob', async () => {
			const { supabase } = createSupabaseMock({ data: [PURCHASE_ROW] });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const { data, error } = await listFilesWithUrlsByPurchaseSupplierId(11);

			expect(error).toBeNull();
			expect(data).toHaveLength(1);
			expect(data![0]).toEqual({
				id: 7,
				url: expect.any(String),
				name: 'factura.jpg',
				displayName: 'factura.jpg',
				description: 'Factura de agosto',
				mimetype: 'application/pdf',
				size: 1,
				uploadedAt: '2026-08-28T12:00:00.000Z',
			});
		});

		it('falls back to the storage path basename when the row has no file name', async () => {
			const { supabase } = createSupabaseMock({
				data: [{ ...PURCHASE_ROW, file_name: null, description: null }],
			});
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const { data } = await listFilesWithUrlsByPurchaseSupplierId(11);

			expect(data![0].name).toBe('uuid-1.jpg');
			expect(data![0].displayName).toBe('uuid-1.jpg');
			expect(data![0].description).toBeNull();
		});

		it('skips a failed download and keeps the rest of the batch', async () => {
			const { supabase, storage } = createSupabaseMock(
				{ data: [PURCHASE_ROW, PAYMENT_ROW] },
				{ 'payments/22/uuid-2.pdf': { data: null, error: 'boom' } }
			);
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);
			jest.spyOn(console, 'error').mockImplementation(() => {});

			const { data, error } = await listFilesWithUrlsByPurchaseSupplierId(11);

			expect(error).toBeNull();
			expect(storage.download).toHaveBeenCalledTimes(2);
			expect(data).toHaveLength(1);
			expect(data![0].id).toBe(PURCHASE_ROW.id);
		});

		it('returns the list error without touching storage', async () => {
			const { supabase, storage } = createSupabaseMock({ data: null, error: 'list failed' });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const { data, error } = await listFilesWithUrlsByPurchaseSupplierId(11);

			expect(data).toBeNull();
			expect(error).toBe('list failed');
			expect(storage.download).not.toHaveBeenCalled();
		});

		it('returns an empty array without downloading when the purchase has no files', async () => {
			const { supabase, storage } = createSupabaseMock({ data: [] });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const { data, error } = await listFilesWithUrlsByPurchaseSupplierId(11);

			expect(data).toEqual([]);
			expect(error).toBeNull();
			expect(storage.download).not.toHaveBeenCalled();
		});
	});

	describe('listFilesWithUrlsByPaymentSupplierId', () => {
		it('lists once and downloads every file straight from storage, without a per-file row lookup', async () => {
			const { supabase, chain, storage } = createSupabaseMock({ data: [PAYMENT_ROW] });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await listFilesWithUrlsByPaymentSupplierId(22);

			expect(supabase.from).toHaveBeenCalledTimes(1);
			expect(chain.eq).toHaveBeenCalledWith('payment_supplier_id', 22);
			expect(storage.download).toHaveBeenCalledTimes(1);
			expect(storage.download).toHaveBeenCalledWith('payments/22/uuid-2.pdf');
			expect(result.error).toBeNull();
		});

		it('maps each row to a FileViewerItem built from the row and the blob', async () => {
			const { supabase } = createSupabaseMock({ data: [PAYMENT_ROW] });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const { data, error } = await listFilesWithUrlsByPaymentSupplierId(22);

			expect(error).toBeNull();
			expect(data).toHaveLength(1);
			expect(data![0]).toEqual({
				id: 9,
				url: expect.any(String),
				name: 'recibo.pdf',
				displayName: 'recibo.pdf',
				description: null,
				mimetype: 'application/pdf',
				size: 1,
				uploadedAt: '2026-09-01T10:00:00.000Z',
			});
		});

		it('skips a failed download and keeps the rest of the batch', async () => {
			const { supabase, storage } = createSupabaseMock(
				{ data: [PAYMENT_ROW, { ...PAYMENT_ROW, id: 10, storage_path: 'payments/22/uuid-3.pdf' }] },
				{ 'payments/22/uuid-2.pdf': { data: null, error: 'boom' } }
			);
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);
			jest.spyOn(console, 'error').mockImplementation(() => {});

			const { data, error } = await listFilesWithUrlsByPaymentSupplierId(22);

			expect(error).toBeNull();
			expect(storage.download).toHaveBeenCalledTimes(2);
			expect(data!.map((f) => f.id)).toEqual([10]);
		});

		it('returns the list error without touching storage', async () => {
			const { supabase, storage } = createSupabaseMock({ data: null, error: 'list failed' });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const { data, error } = await listFilesWithUrlsByPaymentSupplierId(22);

			expect(data).toBeNull();
			expect(error).toBe('list failed');
			expect(storage.download).not.toHaveBeenCalled();
		});
	});
});
