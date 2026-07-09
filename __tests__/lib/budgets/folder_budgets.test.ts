import {
	listFolderBudgets,
	getFolderBudgetById,
	getFolderBudgetsByWorkId,
	getFolderBudgetsByClientId,
	getFolderBudgetsByClientIds,
	createFolderBudget,
	updateFolderBudget,
	deleteFolderBudget,
	deleteFolderBudgetWithBudgets,
} from '@/lib/budgets/folder_budgets';
import { getSupabaseClient } from '@/lib/supabase-client';

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: jest.fn(),
}));

jest.mock('@/lib/budgets/budgets', () => ({
	deleteBudget: jest.fn().mockResolvedValue({ error: null }),
}));

describe('folder_budgets lib', () => {
	const mockSelect = jest.fn();
	const mockEq = jest.fn();
	const mockIn = jest.fn();
	const mockOrder = jest.fn();
	const mockSingle = jest.fn();
	const mockInsert = jest.fn();
	const mockUpdate = jest.fn();
	const mockDelete = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();

		mockOrder.mockResolvedValue({ data: [], error: null });
		mockSingle.mockResolvedValue({ data: null, error: null });
		mockIn.mockImplementation(() => ({ order: mockOrder }));
		mockEq.mockImplementation((_field: string, _value: any) => ({
			single: mockSingle,
			order: mockOrder,
			in: mockIn,
			select: mockSelect,
		}));
		mockSelect.mockReturnValue({ eq: mockEq, in: mockIn, order: mockOrder });
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

	describe('listFolderBudgets', () => {
		it('returns all folder budgets with works join', async () => {
			const folders = [
				{ id: 1, work_id: 5, works: { address: 'Calle 123', locality: 'Bs As', status: 'active' } },
			];
			mockOrder.mockResolvedValue({ data: folders, error: null });

			const { data } = await listFolderBudgets();
			expect(data).toEqual(folders);
		});
	});

	describe('getFolderBudgetById', () => {
		it('returns a folder budget by id', async () => {
			const folder = { id: 1, work_id: 5 };
			mockSingle.mockResolvedValue({ data: folder, error: null });

			const { data } = await getFolderBudgetById(1);
			expect(data).toEqual(folder);
		});
	});

	describe('getFolderBudgetsByWorkId', () => {
		it('returns folder budgets for a work', async () => {
			const folders = [{ id: 1, work_id: 5 }];
			mockOrder.mockResolvedValue({ data: folders, error: null });

			const { data } = await getFolderBudgetsByWorkId(5);
			expect(data).toEqual(folders);
		});
	});

	describe('getFolderBudgetsByClientId', () => {
		it('returns folder budgets for a client', async () => {
			const folders = [
				{
					id: 1,
					client_id: 3,
					work_id: 5,
					works: { address: 'Av. Test', locality: 'CABA', status: 'active' },
				},
			];
			mockOrder.mockResolvedValue({ data: folders, error: null });

			const { data } = await getFolderBudgetsByClientId(3);
			expect(data).toEqual(folders);
		});
	});

	describe('getFolderBudgetsByClientIds', () => {
		it('returns empty array for empty client ids', async () => {
			const { data } = await getFolderBudgetsByClientIds([]);
			expect(data).toEqual([]);
		});

		it('returns folder budgets for multiple client ids', async () => {
			const folders = [
				{ id: 1, client_id: 3 },
				{ id: 2, client_id: 4 },
			];
			mockOrder.mockResolvedValue({ data: folders, error: null });

			const { data } = await getFolderBudgetsByClientIds([3, 4]);
			expect(data).toHaveLength(2);
		});
	});

	describe('createFolderBudget', () => {
		it('creates a folder budget', async () => {
			const newFolder = { client_id: 3, work_id: null };
			mockSingle.mockResolvedValue({
				data: { id: 1, ...newFolder, created_at: '2024-01-01' },
				error: null,
			});

			const { data } = await createFolderBudget(newFolder);
			expect(data?.id).toBe(1);
			expect(data?.client_id).toBe(3);
		});
	});

	describe('updateFolderBudget', () => {
		it('updates a folder budget', async () => {
			mockSingle.mockResolvedValue({ data: { id: 1, work_id: 10 }, error: null });

			const { data } = await updateFolderBudget(1, { work_id: 10 });
			expect(data?.work_id).toBe(10);
		});
	});

	describe('deleteFolderBudget', () => {
		it('deletes a folder budget', async () => {
			mockDelete.mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });

			const { error } = await deleteFolderBudget(1);
			expect(error).toBeNull();
		});
	});

	describe('deleteFolderBudgetWithBudgets', () => {
		it('deletes folder and its budgets', async () => {
			const mockFrom = jest.fn().mockImplementation((table: string) => {
				if (table === 'budgets') {
					return {
						select: jest.fn().mockReturnValue({
							eq: jest.fn().mockResolvedValue({ data: [{ id: 1 }, { id: 2 }], error: null }),
						}),
					};
				}
				return {
					delete: jest.fn().mockReturnValue({
						eq: jest.fn().mockResolvedValue({ error: null }),
					}),
				};
			});

			(getSupabaseClient as jest.Mock).mockReturnValue({ from: mockFrom });

			const { error } = await deleteFolderBudgetWithBudgets(1);
			expect(error).toBeNull();
		});

		it('returns error if deleting budgets fails', async () => {
			const { deleteBudget } = require('@/lib/budgets/budgets');
			(deleteBudget as jest.Mock).mockResolvedValue({ error: new Error('Budget delete error') });

			const mockFrom = jest.fn().mockImplementation((table: string) => {
				if (table === 'budgets') {
					return {
						select: jest.fn().mockReturnValue({
							eq: jest.fn().mockResolvedValue({ data: [{ id: 1 }], error: null }),
						}),
					};
				}
				return {
					delete: jest.fn().mockReturnValue({
						eq: jest.fn().mockResolvedValue({ error: null }),
					}),
				};
			});

			(getSupabaseClient as jest.Mock).mockReturnValue({ from: mockFrom });

			const { error } = await deleteFolderBudgetWithBudgets(1);
			expect(error?.message).toBe('Budget delete error');
		});
	});
});
