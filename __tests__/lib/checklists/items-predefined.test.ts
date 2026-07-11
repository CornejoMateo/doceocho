import {
	listItemsPredefined,
	getItemsPredefinedByMaterialId,
	createItemsPredefined,
	updateItemsPredefined,
	deleteItemsPredefined,
} from '@/lib/checklists/items-predefined';
import { getSupabaseClient } from '@/lib/supabase-client';

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: jest.fn(),
}));

describe('items-predefined lib', () => {
	const mockSelect = jest.fn();
	const mockEq = jest.fn();
	const mockOrder = jest.fn();
	const mockSingle = jest.fn();
	const mockInsert = jest.fn();
	const mockUpdate = jest.fn();
	const mockDelete = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		jest.spyOn(console, 'error').mockImplementation(() => {});

		mockOrder.mockResolvedValue({ data: [], error: null });
		mockEq.mockReturnValue({ single: mockSingle, maybeSingle: mockSingle, order: mockOrder });
		mockSelect.mockReturnValue({ eq: mockEq, order: mockOrder });
		mockInsert.mockReturnValue({ select: jest.fn().mockReturnValue({ single: mockSingle }) });
		mockUpdate.mockReturnValue({
			eq: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ single: mockSingle }) }),
		});
		mockDelete.mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });

		(getSupabaseClient as jest.Mock).mockReturnValue({
			from: jest.fn().mockReturnValue({
				select: mockSelect,
				insert: mockInsert,
				update: mockUpdate,
				delete: mockDelete,
			}),
		});
	});

	describe('listItemsPredefined', () => {
		it('returns all predefined items ordered by material_id', async () => {
			const items = [
				{ id: 1, material_id: 1, items: ['Item A', 'Item B'] },
				{ id: 2, material_id: 2, items: ['Item C'] },
			];
			mockOrder.mockResolvedValue({ data: items, error: null });

			const { data } = await listItemsPredefined();
			expect(data).toHaveLength(2);
			expect(data![0].items).toEqual(['Item A', 'Item B']);
		});

		it('returns error when query fails', async () => {
			mockOrder.mockResolvedValue({ data: null, error: new Error('Query failed') });

			const { data, error } = await listItemsPredefined();
			expect(data).toBeNull();
			expect(error).toBeTruthy();
		});
	});

	describe('getItemsPredefinedByMaterialId', () => {
		it('returns items for a given material_id', async () => {
			const record = { id: 1, material_id: 1, items: ['Item A'] };
			mockSingle.mockResolvedValue({ data: record, error: null });

			const { data } = await getItemsPredefinedByMaterialId(1);
			expect(data?.material_id).toBe(1);
			expect(data?.items).toEqual(['Item A']);
		});

		it('returns null when no items exist for that material', async () => {
			mockSingle.mockResolvedValue({ data: null, error: null });

			const { data } = await getItemsPredefinedByMaterialId(999);
			expect(data).toBeNull();
		});
	});

	describe('createItemsPredefined', () => {
		it('creates a record and returns it', async () => {
			const newRecord = { material_id: 1, items: ['New Item'] };
			mockSingle.mockResolvedValue({ data: { id: 1, ...newRecord }, error: null });

			const { data } = await createItemsPredefined(newRecord);
			expect(data?.id).toBe(1);
			expect(data?.items).toEqual(['New Item']);
		});

		it('returns error on failure', async () => {
			mockSingle.mockResolvedValue({ data: null, error: new Error('Insert failed') });

			const { data, error } = await createItemsPredefined({ material_id: 1, items: [] });
			expect(data).toBeNull();
			expect(error).toBeTruthy();
		});
	});

	describe('updateItemsPredefined', () => {
		it('updates items by id', async () => {
			const changes = { items: ['Updated Item'] };
			mockSingle.mockResolvedValue({
				data: { id: 1, material_id: 1, items: ['Updated Item'] },
				error: null,
			});

			const { data } = await updateItemsPredefined(1, changes);
			expect(data?.items).toEqual(['Updated Item']);
		});
	});

	describe('deleteItemsPredefined', () => {
		it('deletes by id', async () => {
			const { error } = await deleteItemsPredefined(1);
			expect(error).toBeNull();
		});
	});
});
