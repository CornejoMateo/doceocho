import {
	listModuleFiles,
	getModuleFileById,
	createModuleFile,
	updateModuleFile,
	uploadModuleFile,
	downloadModuleFile,
	deleteModuleFile,
} from '@/lib/modules/modules-files';
import { getSupabaseClient } from '@/lib/supabase-client';

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: jest.fn(),
}));

function createSupabaseMock() {
	const chain: Record<string, jest.Mock> = {
		select: jest.fn(() => chain),
		order: jest.fn(() => chain),
		eq: jest.fn(() => chain),
		insert: jest.fn(() => chain),
		update: jest.fn(() => chain),
		delete: jest.fn(() => chain),
		single: jest.fn(() => chain),
	};

	const storage: {
		from: jest.Mock;
		upload: jest.Mock;
		remove: jest.Mock;
		download: jest.Mock;
	} = {
		from: jest.fn(() => storage),
		upload: jest.fn(),
		remove: jest.fn(),
		download: jest.fn(),
	};

	const supabase = {
		from: jest.fn(() => chain),
		storage: { from: jest.fn(() => storage) },
	};

	return { supabase, chain, storage };
}

const FILE_RECORD = {
	id: 7,
	created_at: '2026-08-28T12:00:00.000Z',
	storage_path: '3/uuid-1234.jpg',
	module_id: 3,
	file_name: 'Foto',
	description: 'Primera foto',
};

describe('modules files lib', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('listModuleFiles', () => {
		it('returns files for a module ordered by id', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const promise = Promise.resolve({ data: [FILE_RECORD], error: null });
			chain.order.mockReturnValue(promise);

			const result = await listModuleFiles(3);

			expect(supabase.from).toHaveBeenCalledWith('modules_files');
			expect(chain.select).toHaveBeenCalledWith('*');
			expect(chain.eq).toHaveBeenCalledWith('module_id', 3);
			expect(chain.order).toHaveBeenCalledWith('id', { ascending: true });
			expect(result.data).toEqual([FILE_RECORD]);
			expect(result.error).toBeNull();
		});

		it('returns error on supabase error', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			chain.order.mockReturnValue(Promise.resolve({ data: null, error: new Error('DB error') }));

			const result = await listModuleFiles(3);

			expect(result.data).toBeNull();
			expect(result.error).toEqual(new Error('DB error'));
		});

		it('returns empty array when module has no files', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			chain.order.mockReturnValue(Promise.resolve({ data: [], error: null }));

			const result = await listModuleFiles(3);

			expect(result.data).toEqual([]);
			expect(result.error).toBeNull();
		});
	});

	describe('getModuleFileById', () => {
		it('returns a single file record', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			chain.single.mockReturnValue(Promise.resolve({ data: FILE_RECORD, error: null }));

			const result = await getModuleFileById(7);

			expect(chain.select).toHaveBeenCalledWith('*');
			expect(chain.eq).toHaveBeenCalledWith('id', 7);
			expect(result.data).toEqual(FILE_RECORD);
			expect(result.error).toBeNull();
		});

		it('returns error when the file does not exist', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			chain.single.mockReturnValue(Promise.resolve({ data: null, error: new Error('Not found') }));

			const result = await getModuleFileById(999);

			expect(result.data).toBeNull();
			expect(result.error).toEqual(new Error('Not found'));
		});
	});

	describe('createModuleFile', () => {
		it('inserts a file record', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const insertPromise = Promise.resolve({ data: FILE_RECORD, error: null });
			chain.insert.mockReturnValue(chain);
			chain.select.mockReturnValue(chain);
			chain.single.mockReturnValue(insertPromise);

			const payload = {
				storage_path: '3/uuid-1234.jpg',
				module_id: 3,
				file_name: 'Foto',
				description: 'Primera foto',
			};

			const result = await createModuleFile(payload);

			expect(chain.insert).toHaveBeenCalledWith(payload);
			expect(chain.select).toHaveBeenCalled();
			expect(result.data).toEqual(FILE_RECORD);
			expect(result.error).toBeNull();
		});

		it('uses the provided supabase client when given', async () => {
			const provided = createSupabaseMock();
			const insertPromise = Promise.resolve({ data: FILE_RECORD, error: null });
			provided.chain.insert.mockReturnValue(provided.chain);
			provided.chain.select.mockReturnValue(provided.chain);
			provided.chain.single.mockReturnValue(insertPromise);

			const result = await createModuleFile(
				{
					storage_path: '3/uuid-1234.jpg',
					module_id: 3,
					file_name: null,
					description: null,
				},
				provided.supabase as never
			);

			expect(provided.supabase.from).toHaveBeenCalledWith('modules_files');
			expect(result.error).toBeNull();
		});

		it('returns error on insert failure', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			chain.insert.mockReturnValue(chain);
			chain.select.mockReturnValue(chain);
			chain.single.mockReturnValue(
				Promise.resolve({ data: null, error: new Error('Insert failed') })
			);

			const result = await createModuleFile({
				storage_path: '3/a.jpg',
				module_id: 3,
				file_name: null,
				description: null,
			});

			expect(result.data).toBeNull();
			expect(result.error).toEqual(new Error('Insert failed'));
		});
	});

	describe('updateModuleFile', () => {
		it('updates file metadata', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const updated = { ...FILE_RECORD, file_name: 'Nuevo nombre' };
			chain.update.mockReturnValue(chain);
			chain.eq.mockReturnValue(chain);
			chain.select.mockReturnValue(chain);
			chain.single.mockReturnValue(Promise.resolve({ data: updated, error: null }));

			const result = await updateModuleFile(7, { file_name: 'Nuevo nombre' });

			expect(chain.update).toHaveBeenCalledWith({ file_name: 'Nuevo nombre' });
			expect(chain.eq).toHaveBeenCalledWith('id', 7);
			expect(result.data?.file_name).toBe('Nuevo nombre');
			expect(result.error).toBeNull();
		});

		it('returns error on update failure', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			chain.update.mockReturnValue(chain);
			chain.eq.mockReturnValue(chain);
			chain.select.mockReturnValue(chain);
			chain.single.mockReturnValue(
				Promise.resolve({ data: null, error: new Error('Update failed') })
			);

			const result = await updateModuleFile(7, { description: 'x' });

			expect(result.data).toBeNull();
			expect(result.error).toEqual(new Error('Update failed'));
		});
	});

	describe('uploadModuleFile', () => {
		const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });

		it('uploads file and creates the db record', async () => {
			const { supabase, chain, storage } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			storage.upload.mockResolvedValue({ error: null });

			const insertPromise = Promise.resolve({ data: FILE_RECORD, error: null });
			chain.insert.mockReturnValue(chain);
			chain.select.mockReturnValue(chain);
			chain.single.mockReturnValue(insertPromise);

			const result = await uploadModuleFile(3, file, 'Primera foto', 'Mi Foto');

			expect(storage.upload).toHaveBeenCalledWith(
				expect.stringMatching(/^3\/[0-9a-f-]{36}\.jpg$/),
				file
			);
			expect(chain.insert).toHaveBeenCalledWith({
				storage_path: expect.stringMatching(/^3\/[0-9a-f-]{36}\.jpg$/),
				module_id: 3,
				file_name: 'Mi Foto',
				description: 'Primera foto',
			});
			expect(result.data).toEqual(FILE_RECORD);
			expect(result.error).toBeNull();
		});

		it('falls back to the original file name when no displayName is provided', async () => {
			const { supabase, chain, storage } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			storage.upload.mockResolvedValue({ error: null });

			chain.insert.mockReturnValue(chain);
			chain.select.mockReturnValue(chain);
			chain.single.mockReturnValue(Promise.resolve({ data: FILE_RECORD, error: null }));

			await uploadModuleFile(3, file, null, undefined);

			expect(chain.insert).toHaveBeenCalledWith(
				expect.objectContaining({ file_name: 'photo.jpg' })
			);
		});

		it('ignores a whitespace-only displayName', async () => {
			const { supabase, chain, storage } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			storage.upload.mockResolvedValue({ error: null });

			chain.insert.mockReturnValue(chain);
			chain.select.mockReturnValue(chain);
			chain.single.mockReturnValue(Promise.resolve({ data: FILE_RECORD, error: null }));

			await uploadModuleFile(3, file, null, '   ');

			expect(chain.insert).toHaveBeenCalledWith(
				expect.objectContaining({ file_name: 'photo.jpg' })
			);
		});

		it('uploads video files with the correct extension', async () => {
			const { supabase, chain, storage } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const videoFile = new File(['video'], 'clip.mp4', { type: 'video/mp4' });
			storage.upload.mockResolvedValue({ error: null });

			chain.insert.mockReturnValue(chain);
			chain.select.mockReturnValue(chain);
			chain.single.mockReturnValue(Promise.resolve({ data: FILE_RECORD, error: null }));

			await uploadModuleFile(3, videoFile);

			expect(storage.upload).toHaveBeenCalledWith(
				expect.stringMatching(/^3\/[0-9a-f-]{36}\.mp4$/),
				videoFile
			);
		});

		it('returns error and does not insert when storage upload fails', async () => {
			const { supabase, chain, storage } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			storage.upload.mockResolvedValue({ error: new Error('Storage error') });

			const result = await uploadModuleFile(3, file);

			expect(result.data).toBeNull();
			expect(result.error).toEqual(new Error('Storage error'));
			expect(chain.insert).not.toHaveBeenCalled();
		});

		it('removes the uploaded blob when the db insert fails (rollback)', async () => {
			const { supabase, chain, storage } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			storage.upload.mockResolvedValue({ error: null });

			chain.insert.mockReturnValue(chain);
			chain.select.mockReturnValue(chain);
			chain.single.mockReturnValue(
				Promise.resolve({ data: null, error: new Error('Insert failed') })
			);

			const result = await uploadModuleFile(3, file);

			expect(result.data).toBeNull();
			expect(result.error).toEqual(new Error('Insert failed'));
			expect(storage.remove).toHaveBeenCalledWith([expect.stringMatching(/^3\/.+\.jpg$/)]);
		});
	});

	describe('downloadModuleFile', () => {
		it('downloads the blob for a file', async () => {
			const { supabase, chain, storage } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			chain.single.mockReturnValue(
				Promise.resolve({ data: { storage_path: '3/file.pdf' }, error: null })
			);
			const blob = new Blob(['content']);
			storage.download.mockResolvedValue({ data: blob, error: null });

			const result = await downloadModuleFile(7);

			expect(chain.select).toHaveBeenCalledWith('storage_path');
			expect(chain.eq).toHaveBeenCalledWith('id', 7);
			expect(storage.download).toHaveBeenCalledWith('3/file.pdf');
			expect(result.data).toEqual(blob);
			expect(result.error).toBeNull();
		});

		it('returns error when fetching the record fails', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			chain.single.mockReturnValue(
				Promise.resolve({ data: null, error: new Error('Fetch error') })
			);

			const result = await downloadModuleFile(7);

			expect(result.data).toBeNull();
			expect(result.error).toEqual(new Error('Fetch error'));
		});

		it('returns error when the record or its path is missing', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			chain.single.mockReturnValue(Promise.resolve({ data: null, error: null }));

			const result = await downloadModuleFile(7);

			expect(result.data).toBeNull();
			expect(result.error).toBe('File record not found or missing storage path');
		});

		it('returns error when the storage download fails', async () => {
			const { supabase, chain, storage } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			chain.single.mockReturnValue(
				Promise.resolve({ data: { storage_path: '3/file.pdf' }, error: null })
			);
			storage.download.mockResolvedValue({ data: null, error: new Error('Download error') });

			const result = await downloadModuleFile(7);

			expect(result.data).toBeNull();
			expect(result.error).toEqual(new Error('Download error'));
		});
	});

	describe('deleteModuleFile', () => {
		it('deletes the db row first and the storage object after, without downloading the blob', async () => {
			const { supabase, chain, storage } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			chain.select.mockReturnValue(chain);
			chain.eq.mockReturnValueOnce(chain);
			chain.single.mockReturnValue(Promise.resolve({ data: FILE_RECORD, error: null }));

			chain.delete.mockReturnValue(chain);
			chain.eq.mockResolvedValueOnce({ error: null });

			storage.remove.mockResolvedValue({ error: null });

			const result = await deleteModuleFile(7);

			expect(supabase.from).toHaveBeenCalledWith('modules_files');
			expect(chain.select).toHaveBeenCalledWith('*');
			expect(storage.remove).toHaveBeenCalledWith(['3/uuid-1234.jpg']);
			expect(result.success).toBe(true);
			expect(result.error).toBeNull();
			expect(storage.download).not.toHaveBeenCalled();
		});

		it('returns error when the file record is not found', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			chain.single.mockReturnValue(Promise.resolve({ data: null, error: null }));

			const result = await deleteModuleFile(999);

			expect(result.success).toBe(false);
			expect(result.error).toBe('File record not found or missing storage path');
			expect(chain.delete).not.toHaveBeenCalled();
		});

		it('returns error when the record has no storage path', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			chain.single.mockReturnValue(
				Promise.resolve({ data: { ...FILE_RECORD, storage_path: null }, error: null })
			);

			const result = await deleteModuleFile(7);

			expect(result.success).toBe(false);
			expect(result.error).toBe('File record not found or missing storage path');
		});

		it('returns error when fetching the record fails', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			chain.single.mockReturnValue(
				Promise.resolve({ data: null, error: new Error('Fetch error') })
			);

			const result = await deleteModuleFile(7);

			expect(result.success).toBe(false);
			expect(result.error).toEqual(new Error('Fetch error'));
		});

		it('returns error and does not touch storage when the db delete fails', async () => {
			const { supabase, chain, storage } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			chain.select.mockReturnValue(chain);
			chain.eq.mockReturnValueOnce(chain);
			chain.single.mockReturnValue(Promise.resolve({ data: FILE_RECORD, error: null }));

			chain.delete.mockReturnValue(chain);
			chain.eq.mockResolvedValueOnce({ error: new Error('DB delete error') });

			const result = await deleteModuleFile(7);

			expect(result.success).toBe(false);
			expect(result.error).toEqual(new Error('DB delete error'));
			expect(storage.remove).not.toHaveBeenCalled();
		});

		it('reinserts the db row when the storage delete fails', async () => {
			const { supabase, chain, storage } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			chain.select.mockReturnValue(chain);
			chain.eq.mockReturnValueOnce(chain);
			chain.single.mockReturnValueOnce(Promise.resolve({ data: FILE_RECORD, error: null }));

			chain.delete.mockReturnValue(chain);
			chain.eq.mockResolvedValueOnce({ error: null });

			storage.remove.mockResolvedValue({ error: new Error('Storage delete error') });

			chain.insert.mockReturnValue(chain);
			chain.select.mockReturnValue(chain);
			chain.single.mockReturnValueOnce(
				Promise.resolve({ data: { ...FILE_RECORD, id: 8 }, error: null })
			);

			const result = await deleteModuleFile(7);

			expect(result.success).toBe(false);
			expect(result.error).toEqual(new Error('Storage delete error'));
			expect(chain.insert).toHaveBeenCalledWith({
				storage_path: '3/uuid-1234.jpg',
				module_id: 3,
				file_name: 'Foto',
				description: 'Primera foto',
			});
		});

		it('reports both errors when the reinsert also fails', async () => {
			const { supabase, chain, storage } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			chain.select.mockReturnValue(chain);
			chain.eq.mockReturnValueOnce(chain);
			chain.single.mockReturnValueOnce(Promise.resolve({ data: FILE_RECORD, error: null }));

			chain.delete.mockReturnValue(chain);
			chain.eq.mockResolvedValueOnce({ error: null });

			storage.remove.mockResolvedValue({ error: new Error('Storage delete error') });

			chain.insert.mockReturnValue(chain);
			chain.select.mockReturnValue(chain);
			chain.single.mockReturnValueOnce(
				Promise.resolve({ data: null, error: new Error('Reinsert failed') })
			);

			const result = await deleteModuleFile(7);

			expect(result.success).toBe(false);
			expect(result.error).toEqual({
				deleteStorageError: new Error('Storage delete error'),
				reinsertError: new Error('Reinsert failed'),
			});
		});
	});
});
