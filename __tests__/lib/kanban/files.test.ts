import { getKanbanFileByCardId, uploadKanbanFile, deleteKanbanFile } from '@/lib/kanban/files';
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

describe('kanban files lib', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getKanbanFileByCardId', () => {
		it('returns files for a card', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const rawFiles = [
				{
					id: 1,
					uploaded_at: '2024-01-01',
					path: '1/file.pdf',
					kanban_card_id: 1,
					display_name: 'My File',
				},
				{
					id: 2,
					uploaded_at: '2024-01-02',
					path: '1/img.jpg',
					kanban_card_id: 1,
					display_name: null,
				},
			];

			const promise = Promise.resolve({ data: rawFiles, error: null });
			chain.select.mockReturnValue(chain);
			chain.eq.mockReturnValue(promise);

			const result = await getKanbanFileByCardId(1);

			expect(supabase.from).toHaveBeenCalledWith('kanban_files');
			expect(chain.select).toHaveBeenCalledWith('*');
			expect(chain.eq).toHaveBeenCalledWith('kanban_card_id', 1);
			expect(result.data).toEqual([
				{
					id: 1,
					uploaded_at: '2024-01-01',
					path: '1/file.pdf',
					kanban_card_id: 1,
					displayName: 'My File',
				},
				{
					id: 2,
					uploaded_at: '2024-01-02',
					path: '1/img.jpg',
					kanban_card_id: 1,
					displayName: null,
				},
			]);
			expect(result.error).toBeNull();
		});

		it('returns null data and error on supabase error', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const promise = Promise.resolve({ data: null, error: new Error('DB error') });
			chain.select.mockReturnValue(chain);
			chain.eq.mockReturnValue(promise);

			const result = await getKanbanFileByCardId(1);

			expect(result.data).toBeNull();
			expect(result.error).toEqual(new Error('DB error'));
		});

		it('returns empty array when no files exist', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const promise = Promise.resolve({ data: [], error: null });
			chain.select.mockReturnValue(chain);
			chain.eq.mockReturnValue(promise);

			const result = await getKanbanFileByCardId(1);

			expect(result.data).toEqual([]);
			expect(result.error).toBeNull();
		});

		it('returns error for invalid card id', async () => {
			const result = await getKanbanFileByCardId(0);

			expect(result.data).toEqual([]);
			expect(result.error).toBe('Error getting kanban card id');
		});
	});

	describe('uploadKanbanFile', () => {
		it('uploads file without displayName', async () => {
			const { supabase, chain, storage } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const file = new File(['test'], 'document.pdf', { type: 'application/pdf' });
			storage.upload.mockResolvedValue({ error: null });

			const dbRecord = {
				id: 1,
				uploaded_at: '2024-01-01',
				path: '1/uuid.pdf',
				kanban_card_id: 1,
				display_name: null,
			};
			const insertPromise = Promise.resolve({ data: dbRecord, error: null });
			chain.insert.mockReturnValue(chain);
			chain.select.mockReturnValue(chain);
			chain.single.mockReturnValue(insertPromise);

			const result = await uploadKanbanFile(1, file);

			expect(storage.upload).toHaveBeenCalledWith(expect.stringMatching(/^1\/.+\.pdf$/), file);
			expect(chain.insert).toHaveBeenCalledWith({
				path: expect.stringMatching(/^1\/.+\.pdf$/),
				kanban_card_id: 1,
				display_name: null,
			});
			expect(result.data).toEqual({
				id: 1,
				uploaded_at: '2024-01-01',
				path: expect.any(String),
				kanban_card_id: 1,
				displayName: null,
			});
			expect(result.error).toBeNull();
		});

		it('uploads file with displayName', async () => {
			const { supabase, chain, storage } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
			storage.upload.mockResolvedValue({ error: null });

			const dbRecord = {
				id: 2,
				uploaded_at: '2024-01-01',
				path: '1/uuid.jpg',
				kanban_card_id: 1,
				display_name: 'My Photo',
			};
			const insertPromise = Promise.resolve({ data: dbRecord, error: null });
			chain.insert.mockReturnValue(chain);
			chain.select.mockReturnValue(chain);
			chain.single.mockReturnValue(insertPromise);

			const result = await uploadKanbanFile(1, file, 'My Photo');

			expect(chain.insert).toHaveBeenCalledWith({
				path: expect.any(String),
				kanban_card_id: 1,
				display_name: 'My Photo',
			});
			expect(result.data?.displayName).toBe('My Photo');
		});

		it('returns error on storage upload failure', async () => {
			const { supabase, storage } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const file = new File(['test'], 'doc.pdf', { type: 'application/pdf' });
			storage.upload.mockResolvedValue({ error: new Error('Storage error') });

			const result = await uploadKanbanFile(1, file);

			expect(result.data).toBeNull();
			expect(result.error).toEqual(new Error('Storage error'));
		});

		it('returns error on db insert failure', async () => {
			const { supabase, chain, storage } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const file = new File(['test'], 'doc.pdf', { type: 'application/pdf' });
			storage.upload.mockResolvedValue({ error: null });

			const insertPromise = Promise.resolve({ data: null, error: new Error('DB insert error') });
			chain.insert.mockReturnValue(chain);
			chain.select.mockReturnValue(chain);
			chain.single.mockReturnValue(insertPromise);

			const result = await uploadKanbanFile(1, file);

			expect(result.data).toBeNull();
			expect(result.error).toEqual(new Error('DB insert error'));
		});
	});

	describe('deleteKanbanFile', () => {
		it('deletes file from storage and db', async () => {
			const { supabase, chain, storage } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const fetchPromise = Promise.resolve({ data: { path: '1/file.pdf' }, error: null });
			chain.select.mockReturnValue(chain);
			chain.eq.mockReturnValueOnce(chain);
			chain.single.mockReturnValue(fetchPromise);

			storage.remove.mockResolvedValue({ error: null });

			const deletePromise = Promise.resolve({ error: null });
			chain.delete.mockReturnValue(chain);
			chain.eq.mockResolvedValueOnce(deletePromise);

			const result = await deleteKanbanFile(1);

			expect(supabase.from).toHaveBeenCalledWith('kanban_files');
			expect(chain.select).toHaveBeenCalledWith('path');
			expect(chain.eq).toHaveBeenCalledWith('id', 1);
			expect(storage.remove).toHaveBeenCalledWith(['1/file.pdf']);
			expect(result.success).toBe(true);
			expect(result.error).toBeNull();
		});

		it('returns error when file record not found', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const fetchPromise = Promise.resolve({ data: null, error: null });
			chain.select.mockReturnValue(chain);
			chain.eq.mockReturnValue(chain);
			chain.single.mockResolvedValue(fetchPromise);

			const result = await deleteKanbanFile(999);

			expect(result.success).toBe(false);
			expect(result.error).toBe('File record not found or missing path');
		});

		it('returns error when file path is missing', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const fetchPromise = Promise.resolve({ data: { path: null }, error: null });
			chain.select.mockReturnValue(chain);
			chain.eq.mockReturnValue(chain);
			chain.single.mockResolvedValue(fetchPromise);

			const result = await deleteKanbanFile(1);

			expect(result.success).toBe(false);
			expect(result.error).toBe('File record not found or missing path');
		});

		it('returns error on fetch failure', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			chain.select.mockReturnValue(chain);
			chain.eq.mockReturnValue(chain);
			chain.single.mockResolvedValue(
				Promise.resolve({ data: null, error: new Error('Fetch error') })
			);

			const result = await deleteKanbanFile(1);

			expect(result.success).toBe(false);
			expect(result.error).toEqual(new Error('Fetch error'));
		});

		it('returns error on storage delete failure', async () => {
			const { supabase, chain, storage } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const fetchPromise = Promise.resolve({ data: { path: '1/file.pdf' }, error: null });
			chain.select.mockReturnValue(chain);
			chain.eq.mockReturnValue(chain);
			chain.single.mockResolvedValue(fetchPromise);

			storage.remove.mockResolvedValue({ error: new Error('Storage delete error') });

			const result = await deleteKanbanFile(1);

			expect(result.success).toBe(false);
			expect(result.error).toEqual(new Error('Storage delete error'));
		});

		it('returns error on db delete failure', async () => {
			const { supabase, chain, storage } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const fetchPromise = Promise.resolve({ data: { path: '1/file.pdf' }, error: null });
			chain.select.mockReturnValue(chain);
			chain.eq.mockReturnValueOnce(chain);
			chain.single.mockReturnValue(fetchPromise);

			storage.remove.mockResolvedValue({ error: null });

			chain.delete.mockReturnValue(chain);
			chain.eq.mockResolvedValueOnce(Promise.resolve({ error: new Error('DB delete error') }));

			const result = await deleteKanbanFile(1);

			expect(result.success).toBe(false);
			expect(result.error).toEqual(new Error('DB delete error'));
		});
	});
});
