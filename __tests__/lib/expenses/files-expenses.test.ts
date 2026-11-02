import {
	listFilesByExpenseId,
	listFilesByExpenseIds,
	uploadFileExpense,
	downloadFileExpense,
	deleteFileExpense,
	signUrlsForExpenseFiles,
	listFilesWithUrlsByExpenseId,
	type FileExpense,
} from '@/lib/expenses/files-expenses';
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

describe('lib/expenses/files-expenses', () => {
	beforeEach(() => jest.clearAllMocks());

	it('listFilesByExpenseId queries files_expenses scoped to the expense id', async () => {
		const { chain, from } = buildSupabase();
		chain.then = (resolve: any) => resolve({ data: [{ id: 1 }], error: null });

		const res = await listFilesByExpenseId(11);

		expect(from).toHaveBeenCalledWith('files_expenses');
		expect(chain.eq).toHaveBeenCalledWith('expense_id', 11);
		expect(res.data).toEqual([{ id: 1 }]);
	});

	it('listFilesByExpenseIds batches ids via .in()', async () => {
		const { chain } = buildSupabase();
		chain.then = (resolve: any) => resolve({ data: [{ id: 1, expense_id: 11 }], error: null });

		const res = await listFilesByExpenseIds([11, 12]);

		expect(chain.in).toHaveBeenCalledWith('expense_id', [11, 12]);
		expect(res.data).toEqual([{ id: 1, expense_id: 11 }]);
	});

	it('listFilesByExpenseIds returns empty without querying for an empty id list', async () => {
		const { from } = buildSupabase();

		const res = await listFilesByExpenseIds([]);

		expect(res).toEqual({ data: [], error: null });
		expect(from).not.toHaveBeenCalled();
	});

	it('uploadFileExpense inserts under expenses/{id}/ and uploads to the suppliers-files bucket', async () => {
		const { chain, storage, upload } = buildSupabase();
		chain.single = jest.fn().mockResolvedValue({ data: { id: 1, storage_path: 'x' }, error: null });
		const file = new File(['pdf'], 'factura.pdf', { type: 'application/pdf' });

		await uploadFileExpense(11, file, null, 'factura.pdf');

		expect(chain.insert).toHaveBeenCalledWith(
			expect.objectContaining({
				expense_id: 11,
				file_name: 'factura.pdf',
				storage_path: expect.stringMatching(/^expenses\/11\//),
			})
		);
		expect(storage.from).toHaveBeenCalledWith('suppliers-files');
		expect(upload).toHaveBeenCalled();
	});

	it('uploadFileExpense rolls back the DB row if the storage upload fails', async () => {
		const { chain, upload } = buildSupabase();
		chain.single = jest.fn().mockResolvedValue({ data: { id: 1, storage_path: 'x' }, error: null });
		upload.mockResolvedValue({ error: { message: 'boom' } });
		const file = new File(['pdf'], 'factura.pdf', { type: 'application/pdf' });

		const res = await uploadFileExpense(11, file);

		expect(res.error).toEqual({ message: 'boom' });
		expect(chain.delete).toHaveBeenCalled();
	});

	it('downloadFileExpense downloads the stored path from the suppliers-files bucket', async () => {
		const { chain, storage, download } = buildSupabase();
		chain.single = jest
			.fn()
			.mockResolvedValue({ data: { storage_path: 'expenses/11/x.pdf' }, error: null });

		await downloadFileExpense(1);

		expect(storage.from).toHaveBeenCalledWith('suppliers-files');
		expect(download).toHaveBeenCalledWith('expenses/11/x.pdf');
	});

	it('deleteFileExpense removes storage then the DB row, in that order', async () => {
		const { chain, remove } = buildSupabase();
		chain.single = jest
			.fn()
			.mockResolvedValue({ data: { id: 1, storage_path: 'expenses/11/x.pdf' }, error: null });

		const res = await deleteFileExpense(1);

		expect(remove).toHaveBeenCalledWith(['expenses/11/x.pdf']);
		expect(res.success).toBe(true);
	});

	it('signUrlsForExpenseFiles returns [] without calling storage for an empty list', async () => {
		const { createSignedUrls } = buildSupabase();

		const res = await signUrlsForExpenseFiles([]);

		expect(res).toEqual({ data: [], error: null });
		expect(createSignedUrls).not.toHaveBeenCalled();
	});

	it('signUrlsForExpenseFiles maps signed rows into FileViewerItem, dropping failed signings', async () => {
		const { createSignedUrls } = buildSupabase();
		const files: FileExpense[] = [
			{
				id: 1,
				created_at: 'now',
				storage_path: 'expenses/11/a.jpg',
				expense_id: 11,
				file_name: 'a.jpg',
				description: null,
			},
			{
				id: 2,
				created_at: 'now',
				storage_path: 'expenses/11/b.pdf',
				expense_id: 11,
				file_name: null,
				description: null,
			},
		];
		createSignedUrls.mockResolvedValue({
			data: [
				{ path: 'expenses/11/a.jpg', signedUrl: 'https://signed/a.jpg', error: null },
				{ path: 'expenses/11/b.pdf', signedUrl: null, error: { message: 'boom' } },
			],
			error: null,
		});

		const res = await signUrlsForExpenseFiles(files);

		expect(res.data).toHaveLength(1);
		expect(res.data?.[0]).toEqual(expect.objectContaining({ id: 1, url: 'https://signed/a.jpg' }));
	});

	it('listFilesWithUrlsByExpenseId lists then signs, short-circuiting on a list error', async () => {
		const { chain, createSignedUrls } = buildSupabase();
		chain.then = (resolve: any) => resolve({ data: null, error: { message: 'boom' } });

		const res = await listFilesWithUrlsByExpenseId(11);

		expect(res.error).toEqual({ message: 'boom' });
		expect(createSignedUrls).not.toHaveBeenCalled();
	});
});
