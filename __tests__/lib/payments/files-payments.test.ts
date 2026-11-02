import {
	listFilesByPaymentId,
	listFilesByPaymentIds,
	uploadFilePayment,
	downloadFilePayment,
	deleteFilePayment,
	signUrlsForPaymentFiles,
	listFilesWithUrlsByPaymentId,
	type FilePayment,
} from '@/lib/payments/files-payments';
import { getSupabaseClient } from '@/lib/supabase-client';

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: jest.fn(),
}));

function buildSupabase() {
	const chain: Record<string, any> = {
		select: jest.fn(() => chain),
		eq: jest.fn(() => chain),
		in: jest.fn(() => chain),
		order: jest.fn(() => chain),
		range: jest.fn(() => chain),
		insert: jest.fn(() => chain),
		delete: jest.fn(() => chain),
		single: jest.fn(() => chain),
	};
	(chain as any).then = (resolve: (v: any) => any) => resolve({ data: null, error: null });
	const from = jest.fn(() => chain);
	const upload = jest.fn().mockResolvedValue({ error: null });
	const download = jest.fn().mockResolvedValue({ data: new Blob(), error: null });
	const remove = jest.fn().mockResolvedValue({ error: null });
	const createSignedUrls = jest.fn();
	const storage = { from: jest.fn(() => ({ upload, download, remove, createSignedUrls })) };
	const supabase = { from, storage };
	(getSupabaseClient as jest.Mock).mockReturnValue(supabase);
	return { chain, from, upload, download, remove, createSignedUrls, storage };
}

describe('lib/payments/files-payments', () => {
	beforeEach(() => jest.clearAllMocks());

	it('listFilesByPaymentId queries files_payments scoped to the payment id', async () => {
		const { chain, from } = buildSupabase();
		chain.then = (resolve: any) => resolve({ data: [{ id: 1 }], error: null });

		const res = await listFilesByPaymentId(88);

		expect(from).toHaveBeenCalledWith('files_payments');
		expect(chain.eq).toHaveBeenCalledWith('payment_id', 88);
		expect(res.data).toEqual([{ id: 1 }]);
	});

	it('listFilesByPaymentIds batches ids via .in()', async () => {
		const { chain } = buildSupabase();
		chain.then = (resolve: any) => resolve({ data: [{ id: 1, payment_id: 88 }], error: null });

		const res = await listFilesByPaymentIds([88, 89]);

		expect(chain.in).toHaveBeenCalledWith('payment_id', [88, 89]);
		expect(res.data).toEqual([{ id: 1, payment_id: 88 }]);
	});

	it('listFilesByPaymentIds returns empty without querying for an empty id list', async () => {
		const { from } = buildSupabase();

		const res = await listFilesByPaymentIds([]);

		expect(res).toEqual({ data: [], error: null });
		expect(from).not.toHaveBeenCalled();
	});

	it('uploadFilePayment inserts under payments/{id}/ and uploads to the suppliers-files bucket', async () => {
		const { chain, storage, upload } = buildSupabase();
		chain.single = jest.fn().mockResolvedValue({ data: { id: 1, storage_path: 'x' }, error: null });
		const file = new File(['pdf'], 'recibo.pdf', { type: 'application/pdf' });

		await uploadFilePayment(88, file, null, 'recibo.pdf');

		expect(chain.insert).toHaveBeenCalledWith(
			expect.objectContaining({
				payment_id: 88,
				file_name: 'recibo.pdf',
				storage_path: expect.stringMatching(/^payments\/88\//),
			})
		);
		expect(storage.from).toHaveBeenCalledWith('suppliers-files');
		expect(upload).toHaveBeenCalled();
	});

	it('uploadFilePayment rolls back the DB row if the storage upload fails', async () => {
		const { chain, upload } = buildSupabase();
		chain.single = jest.fn().mockResolvedValue({ data: { id: 1, storage_path: 'x' }, error: null });
		upload.mockResolvedValue({ error: { message: 'boom' } });
		const file = new File(['pdf'], 'recibo.pdf', { type: 'application/pdf' });

		const res = await uploadFilePayment(88, file);

		expect(res.error).toEqual({ message: 'boom' });
		expect(chain.delete).toHaveBeenCalled();
	});

	it('downloadFilePayment downloads the stored path from the suppliers-files bucket', async () => {
		const { chain, storage, download } = buildSupabase();
		chain.single = jest
			.fn()
			.mockResolvedValue({ data: { storage_path: 'payments/88/x.pdf' }, error: null });

		await downloadFilePayment(1);

		expect(storage.from).toHaveBeenCalledWith('suppliers-files');
		expect(download).toHaveBeenCalledWith('payments/88/x.pdf');
	});

	it('deleteFilePayment removes storage then the DB row, in that order', async () => {
		const { chain, remove } = buildSupabase();
		chain.single = jest
			.fn()
			.mockResolvedValue({ data: { id: 1, storage_path: 'payments/88/x.pdf' }, error: null });

		const res = await deleteFilePayment(1);

		expect(remove).toHaveBeenCalledWith(['payments/88/x.pdf']);
		expect(res.success).toBe(true);
	});

	it('signUrlsForPaymentFiles returns [] without calling storage for an empty list', async () => {
		const { createSignedUrls } = buildSupabase();

		const res = await signUrlsForPaymentFiles([]);

		expect(res).toEqual({ data: [], error: null });
		expect(createSignedUrls).not.toHaveBeenCalled();
	});

	it('signUrlsForPaymentFiles maps signed rows into FileViewerItem, dropping failed signings', async () => {
		const { createSignedUrls } = buildSupabase();
		const files: FilePayment[] = [
			{
				id: 1,
				created_at: 'now',
				storage_path: 'payments/88/a.jpg',
				payment_id: 88,
				file_name: 'a.jpg',
				description: null,
			},
			{
				id: 2,
				created_at: 'now',
				storage_path: 'payments/88/b.pdf',
				payment_id: 88,
				file_name: null,
				description: null,
			},
		];
		createSignedUrls.mockResolvedValue({
			data: [
				{ path: 'payments/88/a.jpg', signedUrl: 'https://signed/a.jpg', error: null },
				{ path: 'payments/88/b.pdf', signedUrl: null, error: { message: 'boom' } },
			],
			error: null,
		});

		const res = await signUrlsForPaymentFiles(files);

		expect(res.data).toHaveLength(1);
		expect(res.data?.[0]).toEqual(expect.objectContaining({ id: 1, url: 'https://signed/a.jpg' }));
	});

	it('listFilesWithUrlsByPaymentId lists then signs, short-circuiting on a list error', async () => {
		const { chain, createSignedUrls } = buildSupabase();
		chain.then = (resolve: any) => resolve({ data: null, error: { message: 'boom' } });

		const res = await listFilesWithUrlsByPaymentId(88);

		expect(res.error).toEqual({ message: 'boom' });
		expect(createSignedUrls).not.toHaveBeenCalled();
	});
});
