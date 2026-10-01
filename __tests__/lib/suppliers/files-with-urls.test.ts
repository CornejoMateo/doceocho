import { listFilesWithUrlsByPurchaseSupplierId } from '@/lib/suppliers/files-purchases-suppliers';
import { listFilesWithUrlsByPaymentSupplierId } from '@/lib/suppliers/files-payments-suppliers';
import { getSupabaseClient } from '@/lib/supabase-client';

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: jest.fn(),
}));

/** Supabase double where the row query resolves to `list` and `createSignedUrls`
 * resolves to `signed` (falling back to one successful entry per requested path). */
function createSupabaseMock(
	list: { data?: any; error?: any } = {},
	signed: { data?: any; error?: any } = {}
) {
	const chain: Record<string, jest.Mock> = {
		select: jest.fn(() => chain),
		order: jest.fn(() => chain),
		eq: jest.fn(() => chain),
		in: jest.fn(() => chain),
	};
	(chain as any).then = (resolve: (v: any) => any) => resolve({ data: null, error: null, ...list });

	const createSignedUrls = jest.fn((paths: string[]) =>
		Promise.resolve({
			data: paths.map((path) => ({ path, signedUrl: `https://signed/${path}`, error: null })),
			error: null,
			...signed,
		})
	);
	const storage: Record<string, jest.Mock> = {
		from: jest.fn(() => storage),
		createSignedUrls,
	};

	const supabase = {
		from: jest.fn(() => chain),
		storage: { from: jest.fn(() => storage) },
	};

	return { supabase, chain, storage, createSignedUrls };
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

describe('supplier files libs: list with signed urls', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		(console.error as jest.Mock).mockRestore();
	});

	describe('listFilesWithUrlsByPurchaseSupplierId', () => {
		it('lists once and signs every path in a single batched createSignedUrls call', async () => {
			const { supabase, chain, createSignedUrls } = createSupabaseMock({
				data: [PURCHASE_ROW, { ...PURCHASE_ROW, id: 8, storage_path: 'purchases/11/uuid-3.jpg' }],
			});
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await listFilesWithUrlsByPurchaseSupplierId(11);

			expect(supabase.from).toHaveBeenCalledTimes(1);
			expect(chain.eq).toHaveBeenCalledWith('purchase_supplier_id', 11);
			expect(chain.select).toHaveBeenCalledTimes(1);
			expect(supabase.storage.from).toHaveBeenCalledWith('suppliers-files');
			expect(createSignedUrls).toHaveBeenCalledTimes(1);
			expect(createSignedUrls).toHaveBeenCalledWith(
				['purchases/11/uuid-1.jpg', 'purchases/11/uuid-3.jpg'],
				3600
			);
			expect(result.error).toBeNull();
		});

		it('maps each row to a FileViewerItem built from the row and its signed url', async () => {
			const { supabase } = createSupabaseMock({ data: [PURCHASE_ROW] });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const { data, error } = await listFilesWithUrlsByPurchaseSupplierId(11);

			expect(error).toBeNull();
			expect(data).toHaveLength(1);
			expect(data![0]).toEqual({
				id: 7,
				url: 'https://signed/purchases/11/uuid-1.jpg',
				name: 'factura.jpg',
				displayName: 'factura.jpg',
				description: 'Factura de agosto',
				mimetype: null,
				size: null,
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

		it('skips a file whose signed url entry failed and keeps the rest of the batch', async () => {
			const { supabase, createSignedUrls } = createSupabaseMock({
				data: [PURCHASE_ROW, PAYMENT_ROW],
			});
			createSignedUrls.mockResolvedValue({
				data: [
					{
						path: PURCHASE_ROW.storage_path,
						signedUrl: `https://signed/${PURCHASE_ROW.storage_path}`,
						error: null,
					},
					{ path: PAYMENT_ROW.storage_path, signedUrl: null, error: 'boom' },
				],
				error: null,
			});
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const { data, error } = await listFilesWithUrlsByPurchaseSupplierId(11);

			expect(error).toBeNull();
			expect(createSignedUrls).toHaveBeenCalledTimes(1);
			expect(data).toHaveLength(1);
			expect(data![0].id).toBe(PURCHASE_ROW.id);
		});

		it('returns the list error without touching storage', async () => {
			const { supabase, createSignedUrls } = createSupabaseMock({
				data: null,
				error: 'list failed',
			});
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const { data, error } = await listFilesWithUrlsByPurchaseSupplierId(11);

			expect(data).toBeNull();
			expect(error).toBe('list failed');
			expect(createSignedUrls).not.toHaveBeenCalled();
		});

		it('returns an empty array without signing when the purchase has no files', async () => {
			const { supabase, createSignedUrls } = createSupabaseMock({ data: [] });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const { data, error } = await listFilesWithUrlsByPurchaseSupplierId(11);

			expect(data).toEqual([]);
			expect(error).toBeNull();
			expect(createSignedUrls).not.toHaveBeenCalled();
		});

		it('returns an error when the signing call itself fails', async () => {
			const { supabase, createSignedUrls } = createSupabaseMock({ data: [PURCHASE_ROW] });
			createSignedUrls.mockResolvedValue({ data: null, error: { message: 'signing failed' } });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const { data, error } = await listFilesWithUrlsByPurchaseSupplierId(11);

			expect(data).toBeNull();
			expect(error).toEqual({ message: 'signing failed' });
		});
	});

	describe('listFilesWithUrlsByPaymentSupplierId', () => {
		it('lists once and signs every path in a single batched createSignedUrls call', async () => {
			const { supabase, chain, createSignedUrls } = createSupabaseMock({ data: [PAYMENT_ROW] });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await listFilesWithUrlsByPaymentSupplierId(22);

			expect(supabase.from).toHaveBeenCalledTimes(1);
			expect(chain.eq).toHaveBeenCalledWith('payment_supplier_id', 22);
			expect(createSignedUrls).toHaveBeenCalledTimes(1);
			expect(createSignedUrls).toHaveBeenCalledWith(['payments/22/uuid-2.pdf'], 3600);
			expect(result.error).toBeNull();
		});

		it('maps each row to a FileViewerItem built from the row and its signed url', async () => {
			const { supabase } = createSupabaseMock({ data: [PAYMENT_ROW] });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const { data, error } = await listFilesWithUrlsByPaymentSupplierId(22);

			expect(error).toBeNull();
			expect(data).toHaveLength(1);
			expect(data![0]).toEqual({
				id: 9,
				url: 'https://signed/payments/22/uuid-2.pdf',
				name: 'recibo.pdf',
				displayName: 'recibo.pdf',
				description: null,
				mimetype: null,
				size: null,
				uploadedAt: '2026-09-01T10:00:00.000Z',
			});
		});

		it('skips a file whose signed url entry failed and keeps the rest of the batch', async () => {
			const otherPath = 'payments/22/uuid-3.pdf';
			const { supabase, createSignedUrls } = createSupabaseMock({
				data: [PAYMENT_ROW, { ...PAYMENT_ROW, id: 10, storage_path: otherPath }],
			});
			createSignedUrls.mockResolvedValue({
				data: [
					{ path: PAYMENT_ROW.storage_path, signedUrl: null, error: 'boom' },
					{ path: otherPath, signedUrl: `https://signed/${otherPath}`, error: null },
				],
				error: null,
			});
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const { data, error } = await listFilesWithUrlsByPaymentSupplierId(22);

			expect(error).toBeNull();
			expect(createSignedUrls).toHaveBeenCalledTimes(1);
			expect(data!.map((f) => f.id)).toEqual([10]);
		});

		it('returns the list error without touching storage', async () => {
			const { supabase, createSignedUrls } = createSupabaseMock({
				data: null,
				error: 'list failed',
			});
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const { data, error } = await listFilesWithUrlsByPaymentSupplierId(22);

			expect(data).toBeNull();
			expect(error).toBe('list failed');
			expect(createSignedUrls).not.toHaveBeenCalled();
		});
	});
});
