import {
	listChannelFiles,
	uploadChannelFile,
	deleteChannelFile,
	getChannelFileSignedUrl,
	getChannelFileViewUrl,
} from '@/lib/chat/channel-files';
import { getSupabaseClient } from '@/lib/supabase-client';

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: jest.fn(),
}));

function createSupabaseMock(result: any = { data: null, error: null }) {
	const chain: Record<string, any> = {
		select: jest.fn(() => chain),
		eq: jest.fn(() => chain),
		order: jest.fn(() => chain),
		limit: jest.fn(() => chain),
		or: jest.fn(() => chain),
		insert: jest.fn(() => chain),
		delete: jest.fn(() => chain),
		single: jest.fn(() => Promise.resolve(result)),
	};
	chain.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);

	const storage: {
		from: jest.Mock;
		upload: jest.Mock;
		remove: jest.Mock;
		createSignedUrl: jest.Mock;
	} = {
		from: jest.fn(() => storage),
		upload: jest.fn().mockResolvedValue({ error: null }),
		remove: jest.fn().mockResolvedValue({ error: null }),
		createSignedUrl: jest
			.fn()
			.mockResolvedValue({ data: { signedUrl: 'https://signed.url' }, error: null }),
	};

	const supabase = {
		from: jest.fn(() => chain),
		storage: { from: jest.fn(() => storage) },
	};

	(getSupabaseClient as jest.Mock).mockReturnValue(supabase);
	return { supabase, chain, storage };
}

describe('lib/chat/channel-files', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('uploadChannelFile', () => {
		it('rejects a file over the size limit without touching storage', async () => {
			const { storage } = createSupabaseMock();
			const file = new File([new ArrayBuffer(11 * 1024 * 1024)], 'big.png', {
				type: 'image/png',
			});

			const result = await uploadChannelFile(1, file, 'uploader-1');

			expect(storage.upload).not.toHaveBeenCalled();
			expect(result.data).toBeNull();
			expect(result.error).toBeTruthy();
		});

		it('rejects a disallowed file type without touching storage', async () => {
			const { storage } = createSupabaseMock();
			const file = new File(['test'], 'script.exe', { type: 'application/x-msdownload' });

			const result = await uploadChannelFile(1, file, 'uploader-1');

			expect(storage.upload).not.toHaveBeenCalled();
			expect(result.data).toBeNull();
			expect(result.error).toBeTruthy();
		});

		it('builds the storage path from channel id, uploader id and sanitized file name', async () => {
			const record = { id: 1, file_name: 'My File.png' };
			const { chain, storage } = createSupabaseMock({ data: record, error: null });
			const file = new File(['test'], 'My File.png', { type: 'image/png' });

			await uploadChannelFile(7, file, 'uploader-1');

			const expectedPath = expect.stringMatching(/^7\/uploader-1\/[^/]+-My_File\.png$/);
			expect(storage.upload).toHaveBeenCalledWith(expectedPath, file);
			expect(chain.insert).toHaveBeenCalledWith(
				expect.objectContaining({ storage_path: expectedPath })
			);
		});

		it('rolls back the uploaded blob when the row insert fails', async () => {
			const { storage } = createSupabaseMock({ data: null, error: new Error('insert failed') });
			const file = new File(['test'], 'doc.pdf', { type: 'application/pdf' });

			const result = await uploadChannelFile(1, file, 'uploader-1');

			const uploadedPath = storage.upload.mock.calls[0][0];
			expect(storage.remove).toHaveBeenCalledWith([uploadedPath]);
			expect(result.data).toBeNull();
			expect(result.error).toEqual(new Error('insert failed'));
		});
	});

	describe('deleteChannelFile', () => {
		it('deletes the db row before removing the blob', async () => {
			const { chain, storage } = createSupabaseMock({ error: null });
			const callOrder: string[] = [];
			chain.delete.mockImplementation(() => {
				callOrder.push('delete');
				return chain;
			});
			storage.remove.mockImplementation(async () => {
				callOrder.push('remove');
				return { error: null };
			});

			const result = await deleteChannelFile({ id: 1, storage_path: 'path/file.png' });

			expect(callOrder).toEqual(['delete', 'remove']);
			expect(result.success).toBe(true);
		});

		it('succeeds even when blob removal fails', async () => {
			const { storage } = createSupabaseMock({ error: null });
			storage.remove.mockResolvedValue({ error: new Error('remove failed') });

			const result = await deleteChannelFile({ id: 1, storage_path: 'path/file.png' });

			expect(result.success).toBe(true);
			expect(result.error).toBeNull();
		});

		it('does not remove the blob when the db delete fails', async () => {
			const { storage } = createSupabaseMock({ error: new Error('delete failed') });

			const result = await deleteChannelFile({ id: 1, storage_path: 'path/file.png' });

			expect(storage.remove).not.toHaveBeenCalled();
			expect(result.success).toBe(false);
			expect(result.error).toEqual(new Error('delete failed'));
		});
	});

	describe('listChannelFiles', () => {
		it('queries the first page ordered by created_at and id without a cursor filter', async () => {
			const files = [
				{ id: 2, created_at: '2024-01-02' },
				{ id: 1, created_at: '2024-01-01' },
			];
			const { chain, supabase } = createSupabaseMock({ data: files, error: null });

			const result = await listChannelFiles(5);

			expect(supabase.from).toHaveBeenCalledWith('channel_files');
			expect(chain.eq).toHaveBeenCalledWith('channel_id', 5);
			expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
			expect(chain.order).toHaveBeenCalledWith('id', { ascending: false });
			expect(chain.or).not.toHaveBeenCalled();
			expect(result.data?.files).toEqual(files);
			expect(result.data?.hasMore).toBe(false);
			expect(result.data?.nextCursor).toEqual({ createdAt: '2024-01-01', id: 1 });
		});

		it('applies the keyset cursor filter and reports hasMore for a full page', async () => {
			const files = Array.from({ length: 20 }, (_, i) => ({
				id: 20 - i,
				created_at: '2024-01-01',
			}));
			const { chain } = createSupabaseMock({ data: files, error: null });

			const result = await listChannelFiles(5, { createdAt: '2024-02-01', id: 99 });

			expect(chain.or).toHaveBeenCalledWith(
				'created_at.lt.2024-02-01,and(created_at.eq.2024-02-01,id.lt.99)'
			);
			expect(result.data?.hasMore).toBe(true);
			expect(result.data?.nextCursor).toEqual({ createdAt: '2024-01-01', id: 1 });
		});
	});

	describe('signed urls', () => {
		it('getChannelFileSignedUrl requests a download-forcing signed url', async () => {
			const { storage } = createSupabaseMock();

			await getChannelFileSignedUrl('path/file.pdf', 'file.pdf');

			expect(storage.createSignedUrl).toHaveBeenCalledWith('path/file.pdf', 60, {
				download: 'file.pdf',
			});
		});

		it('getChannelFileViewUrl requests a signed url without a download option', async () => {
			const { storage } = createSupabaseMock();

			await getChannelFileViewUrl('path/file.png');

			expect(storage.createSignedUrl).toHaveBeenCalledWith('path/file.png', 300);
		});
	});
});
