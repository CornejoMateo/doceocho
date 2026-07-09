import {
	getBudgetsByFolderBudgetIds,
	getBudgetsCount,
	getBudgetById,
	getBudgetsByFolderBudgetId,
	listBudgets,
	createBudget,
	updateBudget,
	editBudget,
	deleteBudget,
} from '@/lib/budgets/budgets';
import { getSupabaseClient } from '@/lib/supabase-client';

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: jest.fn(),
}));

jest.mock('@/lib/balances/balances', () => ({
	deleteBalance: jest.fn().mockResolvedValue({ error: null }),
}));

describe('budgets lib', () => {
	const mockSelect = jest.fn();
	const mockEq = jest.fn();
	const mockIn = jest.fn();
	const mockOrder = jest.fn();
	const mockSingle = jest.fn();
	const mockInsert = jest.fn();
	const mockUpdate = jest.fn();
	const mockDelete = jest.fn();
	const mockStorage = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		jest.spyOn(console, 'error').mockImplementation(() => {});

		mockOrder.mockReturnValue({ data: [], error: null });
		mockSingle.mockReturnValue({ data: null, error: null });
		mockIn.mockReturnValue({ order: mockOrder });
		mockEq.mockReturnValue({ single: mockSingle, order: mockOrder, in: mockIn });
		mockSelect.mockReturnValue({ eq: mockEq, in: mockIn, order: mockOrder });
		mockInsert.mockReturnValue({ select: jest.fn().mockReturnValue({ single: mockSingle }) });
		mockUpdate.mockReturnValue({
			eq: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ single: mockSingle }) }),
		});
		mockDelete.mockReturnValue({ eq: jest.fn().mockReturnValue({}) });

		(getSupabaseClient as jest.Mock).mockReturnValue({
			from: jest.fn().mockImplementation((table: string) => {
				if (table === 'budgets') {
					return {
						select: mockSelect,
						insert: mockInsert,
						update: mockUpdate,
						delete: mockDelete,
					};
				}
				return { select: mockSelect, insert: mockInsert, update: mockUpdate, delete: mockDelete };
			}),
			storage: {
				from: jest.fn().mockReturnValue({
					upload: jest.fn().mockResolvedValue({ error: null }),
					getPublicUrl: jest
						.fn()
						.mockReturnValue({ data: { publicUrl: 'https://example.com/test.pdf' } }),
				}),
			},
		});
	});

	describe('getBudgetsCount', () => {
		it('returns the count', async () => {
			mockSelect.mockReturnValue({ count: 5, error: null });

			const { data, error } = await getBudgetsCount();
			expect(data).toBe(5);
			expect(error).toBeNull();
		});

		it('returns 0 when count is null', async () => {
			mockSelect.mockReturnValue({ count: null, error: null });

			const { data } = await getBudgetsCount();
			expect(data).toBe(0);
		});
	});

	describe('listBudgets', () => {
		it('returns all budgets ordered by created_at', async () => {
			mockOrder.mockResolvedValue({ data: [{ id: 1, number: '001' }], error: null });

			const { data } = await listBudgets();
			expect(data).toEqual([{ id: 1, number: '001' }]);
		});
	});

	describe('getBudgetById', () => {
		it('returns a single budget by id', async () => {
			mockSingle.mockResolvedValue({ data: { id: 1 }, error: null });

			const { data } = await getBudgetById(1);
			expect(data).toEqual({ id: 1 });
		});
	});

	describe('getBudgetsByFolderBudgetId', () => {
		it('returns budgets for a folder', async () => {
			mockOrder.mockResolvedValue({ data: [{ id: 1, folder_budget_id: 5 }], error: null });

			const { data } = await getBudgetsByFolderBudgetId(5);
			expect(data).toEqual([{ id: 1, folder_budget_id: 5 }]);
		});
	});

	describe('getBudgetsByFolderBudgetIds', () => {
		it('returns empty array for empty ids', async () => {
			const { data } = await getBudgetsByFolderBudgetIds([]);
			expect(data).toEqual([]);
		});

		it('maps raw data with folder_budget join correctly', async () => {
			const rawData = [
				{
					id: 1,
					created_at: '2024-01-01',
					amount_ars: 1000,
					amount_usd: 10,
					accepted: false,
					sold: false,
					lost: false,
					pdf_url: null,
					pdf_path: null,
					number: '001',
					type: 'MDF',
					folder_budget: [
						{
							id: 10,
							work_id: 5,
							work: [{ address: 'Calle 123', locality: 'Bs As' }],
						},
					],
				},
			];
			mockOrder.mockResolvedValue({ data: rawData, error: null });

			const { data } = await getBudgetsByFolderBudgetIds([1]);
			expect(data).toHaveLength(1);
			expect(data![0].folder_budget.work?.address).toBe('Calle 123');
			expect(data![0].folder_budget.work?.locality).toBe('Bs As');
		});

		it('handles null work (no work assigned)', async () => {
			const rawData = [
				{
					id: 2,
					created_at: '2024-01-02',
					amount_ars: 2000,
					amount_usd: 20,
					accepted: false,
					sold: false,
					lost: false,
					pdf_url: null,
					pdf_path: null,
					number: '002',
					type: 'Herrería',
					folder_budget: [
						{
							id: 11,
							work_id: null,
							work: null,
						},
					],
				},
			];
			mockOrder.mockResolvedValue({ data: rawData, error: null });

			const { data } = await getBudgetsByFolderBudgetIds([2]);
			expect(data).toHaveLength(1);
			expect(data![0].folder_budget.work_id).toBeNull();
			expect(data![0].folder_budget.work).toBeNull();
		});

		it('returns null data on error', async () => {
			mockOrder.mockResolvedValue({ data: null, error: new Error('DB Error') });

			const { data, error } = await getBudgetsByFolderBudgetIds([1]);
			expect(data).toBeNull();
			expect(error).toBeTruthy();
		});
	});

	describe('createBudget', () => {
		it('creates a budget without PDF', async () => {
			const budgetData = {
				folder_budget_id: 1,
				number: '001',
				type: 'MDF',
				amount_ars: 1000,
				amount_usd: 10,
			};
			mockSingle.mockResolvedValue({ data: { id: 1, ...budgetData }, error: null });

			const { data } = await createBudget(budgetData as any, null, 1);
			expect(data).toBeTruthy();
		});

		it('uploads PDF and creates budget', async () => {
			const pdfFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
			mockSingle.mockResolvedValue({
				data: { id: 1, pdf_url: 'https://example.com/test.pdf' },
				error: null,
			});

			const { data } = await createBudget({} as any, pdfFile, 1);
			expect(data?.pdf_url).toBe('https://example.com/test.pdf');
		});
	});

	describe('updateBudget', () => {
		it('updates a budget', async () => {
			mockSingle.mockResolvedValue({ data: { id: 1, number: '002' }, error: null });

			const { data } = await updateBudget(1, { number: '002' });
			expect(data?.number).toBe('002');
		});
	});

	describe('editBudget', () => {
		it('edits a budget without PDF change', async () => {
			mockSingle.mockResolvedValue({ data: { id: 1, number: '003' }, error: null });

			const { data } = await editBudget(1, { number: '003' }, null, 1);
			expect(data?.number).toBe('003');
		});
	});

	describe('deleteBudget', () => {
		it('deletes a budget', async () => {
			const mockEqResult = jest.fn().mockResolvedValue({ data: null, error: null });
			const mockSingleResult = jest
				.fn()
				.mockResolvedValue({ data: { pdf_path: null }, error: null });
			const mockDeleteResult = jest.fn().mockResolvedValue({ error: null });

			const mockFrom = jest.fn().mockImplementation((table: string) => {
				if (table === 'balances') {
					return {
						select: jest.fn().mockReturnValue({
							eq: jest.fn().mockResolvedValue({ data: [], error: null }),
						}),
					};
				}
				return {
					select: jest.fn().mockReturnValue({
						eq: jest.fn().mockReturnValue({ single: mockSingleResult }),
					}),
					delete: jest.fn().mockReturnValue({ eq: mockDeleteResult }),
				};
			});

			const mockStorageRemove = jest.fn().mockResolvedValue({ error: null });
			(getSupabaseClient as jest.Mock).mockReturnValue({
				from: mockFrom,
				storage: { from: jest.fn().mockReturnValue({ remove: mockStorageRemove }) },
			});

			const { error } = await deleteBudget(1);
			expect(error).toBeNull();
		});
	});
});
