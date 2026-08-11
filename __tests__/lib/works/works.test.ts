import {
	listWorks,
	getWorkById,
	createWork,
	updateWork,
	deleteWork,
	getWorksByClientId,
	getWorksInProgressCount,
	updateWorkGeneralNote,
} from '@/lib/works/works';
import { getSupabaseClient } from '@/lib/supabase-client';

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: jest.fn(),
}));

jest.mock('@/lib/checklists/checklists', () => ({
	deleteChecklist: jest.fn().mockResolvedValue({ error: null }),
}));

jest.mock('@/lib/budgets/folder_budgets', () => ({
	deleteFolderBudgetWithBudgets: jest.fn().mockResolvedValue({ error: null }),
}));

describe('works lib', () => {
	const mockSelect = jest.fn();
	const mockEq = jest.fn();
	const mockOrder = jest.fn();
	const mockSingle = jest.fn();
	const mockInsert = jest.fn();
	const mockUpdate = jest.fn();
	const mockDelete = jest.fn();
	let countResult: { count: number | null; error: null };

	beforeEach(() => {
		jest.clearAllMocks();
		jest.spyOn(console, 'error').mockImplementation(() => {});
		jest.spyOn(console, 'log').mockImplementation(() => {});

		countResult = { count: 3, error: null };

		mockOrder.mockResolvedValue({ data: [], error: null });
		mockEq.mockImplementation((_field: string, _value: any) => {
			if (_field === 'status') return countResult;
			return { single: mockSingle, order: mockOrder };
		});
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

	describe('listWorks', () => {
		it('returns works with client names mapped', async () => {
			const rawData = [
				{
					id: 1,
					address: 'Calle 123',
					clients: { name: 'Juan', last_name: 'Pérez' },
				},
			];
			mockOrder.mockResolvedValue({ data: rawData, error: null });

			const { data } = await listWorks();
			expect(data).toHaveLength(1);
			expect(data![0].client_name).toBe('Juan');
			expect(data![0].client_last_name).toBe('Pérez');
		});

		it('handles null clients', async () => {
			const rawData = [{ id: 1, address: 'Calle 123', clients: null }];
			mockOrder.mockResolvedValue({ data: rawData, error: null });

			const { data } = await listWorks();
			expect(data![0].client_name).toBeNull();
		});

		it('returns error when query fails', async () => {
			mockOrder.mockResolvedValue({ data: null, error: new Error('Query failed') });

			const { data, error } = await listWorks();
			expect(data).toBeNull();
			expect(error).toBeTruthy();
		});
	});

	describe('getWorkById', () => {
		it('returns a work by id', async () => {
			const work = { id: 1, address: 'Test', clients: { name: 'Ana', last_name: 'López' } };
			mockSingle.mockResolvedValue({ data: work, error: null });

			const { data } = await getWorkById(1);
			expect(data?.id).toBe(1);
			expect(data?.client_name).toBe('Ana');
		});
	});

	describe('createWork', () => {
		it('creates a work', async () => {
			const newWork = { address: 'Nueva', locality: 'CABA', client_id: 3 };
			mockSingle.mockResolvedValue({ data: { id: 1, ...newWork }, error: null });

			const { data } = await createWork(newWork as any);
			expect(data?.id).toBe(1);
		});
	});

	describe('updateWork', () => {
		it('updates a work', async () => {
			mockSingle.mockResolvedValue({ data: { id: 1, address: 'Updated' }, error: null });

			const { data } = await updateWork(1, { address: 'Updated' });
			expect(data?.address).toBe('Updated');
		});
	});

	describe('deleteWork', () => {
		it('deletes a work', async () => {
			const mockFrom = jest.fn().mockImplementation((table: string) => {
				if (table === 'checklists') {
					return {
						select: jest.fn().mockReturnValue({
							eq: jest.fn().mockResolvedValue({ data: [], error: null }),
						}),
					};
				}
				if (table === 'folder_budgets' || table === 'files_client') {
					return {
						select: jest.fn().mockReturnValue({
							eq: jest.fn().mockResolvedValue({ data: [], error: null }),
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

			const { error } = await deleteWork(1);
			expect(error).toBeNull();
		});
	});

	describe('getWorksByClientId', () => {
		it('returns works for a client', async () => {
			const works = [{ id: 1, client_id: 3, address: 'Calle 456' }];
			mockOrder.mockResolvedValue({ data: works, error: null });

			const { data } = await getWorksByClientId(3);
			expect(data).toEqual(works);
		});

		it('handles query error', async () => {
			mockOrder.mockResolvedValue({ data: null, error: new Error('Error') });

			const { data, error } = await getWorksByClientId(3);
			expect(data).toBeNull();
			expect(error).toBeTruthy();
		});
	});

	describe('getWorksInProgressCount', () => {
		it('returns count of in-progress works', async () => {
			countResult = { count: 3, error: null };

			const { data } = await getWorksInProgressCount();
			expect(data).toBe(3);
		});

		it('returns 0 when count is null', async () => {
			countResult = { count: null, error: null };

			const { data } = await getWorksInProgressCount();
			expect(data).toBe(0);
		});
	});

	describe('updateWorkGeneralNote', () => {
		it('updates general note', async () => {
			const updatedWork = {
				id: 1,
				general_note: 'New note',
				clients: { name: 'Juan', last_name: 'Pérez' },
			};
			mockSingle.mockResolvedValue({ data: updatedWork, error: null });

			const { data } = await updateWorkGeneralNote(1, 'New note');
			expect(data?.general_note).toBe('New note');
			expect(data?.client_name).toBe('Juan');
		});
	});
});
