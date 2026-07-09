import { budgetHandlers } from '@/components/business/budgets/handlers';
import { BudgetWithWork } from '@/lib/balances/balances';

const mockToast = jest.fn();
jest.mock('@/components/ui/use-toast', () => ({
	toast: (...args: any[]) => mockToast(...args),
}));

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: jest.fn(),
}));

const mockUpdateBudget = jest.fn();
const mockDeleteBudget = jest.fn();
const mockEditBudget = jest.fn();
const mockCreateBudget = jest.fn();
jest.mock('@/lib/budgets/budgets', () => ({
	updateBudget: (...args: any[]) => mockUpdateBudget(...args),
	deleteBudget: (...args: any[]) => mockDeleteBudget(...args),
	editBudget: (...args: any[]) => mockEditBudget(...args),
	createBudget: (...args: any[]) => mockCreateBudget(...args),
}));

const mockCreateFolderBudget = jest.fn();
const mockDeleteFolderBudgetWithBudgets = jest.fn();
const mockDeleteFolderBudget = jest.fn();
jest.mock('@/lib/budgets/folder_budgets', () => ({
	createFolderBudget: (...args: any[]) => mockCreateFolderBudget(...args),
	deleteFolderBudgetWithBudgets: (...args: any[]) => mockDeleteFolderBudgetWithBudgets(...args),
	deleteFolderBudget: (...args: any[]) => mockDeleteFolderBudget(...args),
}));

jest.mock('@/lib/error-translator', () => ({
	translateError: (e: any) => `translated: ${e?.message || e}`,
}));

jest.mock('@/helpers/budgets/helper-budget', () => ({
	parseAmount: jest.fn(),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch as any;

const baseBudget: BudgetWithWork = {
	id: 1,
	created_at: '2024-06-15',
	amount_ars: 150000,
	amount_usd: 150,
	accepted: false,
	sold: false,
	lost: false,
	pdf_url: null,
	pdf_path: 'some/path.pdf',
	number: '001',
	type: 'MDF',
	folder_budget: {
		id: 1,
		work_id: 5,
		work: { address: 'Calle 123', locality: 'Bs As' },
	},
};

describe('budgetHandlers', () => {
	const refresh = jest.fn();
	const setIsLoading = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('handleChooseBudget', () => {
		it('toggles accepted flag and calls refresh on success', async () => {
			mockUpdateBudget.mockResolvedValue({ error: null });

			await budgetHandlers.handleChooseBudget(1, [baseBudget], refresh, setIsLoading);

			expect(mockUpdateBudget).toHaveBeenCalledWith(1, { accepted: true });
			expect(refresh).toHaveBeenCalled();
			expect(setIsLoading).toHaveBeenCalledWith(true);
			expect(setIsLoading).toHaveBeenLastCalledWith(false);
		});

		it('shows error toast when update fails', async () => {
			mockUpdateBudget.mockResolvedValue({ error: new Error('DB Error') });

			await budgetHandlers.handleChooseBudget(1, [baseBudget], refresh, setIsLoading);

			expect(mockToast).toHaveBeenCalledWith(
				expect.objectContaining({ variant: 'destructive', title: 'No se pudo cambiar el estado' })
			);
			expect(refresh).not.toHaveBeenCalled();
		});

		it('does nothing when budget is not found', async () => {
			await budgetHandlers.handleChooseBudget(999, [baseBudget], refresh, setIsLoading);

			expect(mockUpdateBudget).not.toHaveBeenCalled();
		});
	});

	describe('handleStatusChange', () => {
		it('sets sold flag and date_of_sale for SOLD status', async () => {
			mockUpdateBudget.mockResolvedValue({ error: null });

			await budgetHandlers.handleStatusChange(1, 'sold', [baseBudget], refresh, setIsLoading);

			expect(mockUpdateBudget).toHaveBeenCalledWith(
				1,
				expect.objectContaining({ sold: true, lost: false, date_of_sale: expect.any(String) })
			);
			expect(refresh).toHaveBeenCalled();
		});

		it('sets lost flag and clears date_of_sale for LOST status', async () => {
			mockUpdateBudget.mockResolvedValue({ error: null });

			await budgetHandlers.handleStatusChange(1, 'lost', [baseBudget], refresh, setIsLoading);

			expect(mockUpdateBudget).toHaveBeenCalledWith(1, {
				sold: false,
				lost: true,
				date_of_sale: null,
			});
			expect(refresh).toHaveBeenCalled();
		});

		it('clears both flags and date_of_sale for IN_PROGRESS status', async () => {
			mockUpdateBudget.mockResolvedValue({ error: null });

			await budgetHandlers.handleStatusChange(
				1,
				'in_progress',
				[baseBudget],
				refresh,
				setIsLoading
			);

			expect(mockUpdateBudget).toHaveBeenCalledWith(1, {
				sold: false,
				lost: false,
				date_of_sale: null,
			});
			expect(refresh).toHaveBeenCalled();
		});

		it('shows error toast on failure', async () => {
			mockUpdateBudget.mockResolvedValue({ error: new Error('Fail') });

			await budgetHandlers.handleStatusChange(1, 'sold', [baseBudget], refresh, setIsLoading);

			expect(mockToast).toHaveBeenCalledWith(
				expect.objectContaining({
					variant: 'destructive',
					title: 'No se pudo cambiar el estado del presupuesto',
				})
			);
		});
	});

	describe('handleDeleteBudget / confirmDeleteBudget', () => {
		it('sets delete confirmation state', () => {
			const setState = jest.fn();
			budgetHandlers.handleDeleteBudget(5, setState);
			expect(setState).toHaveBeenCalledWith({ open: true, budgetId: 5 });
		});

		it('deletes budget and refreshes on confirm', async () => {
			mockDeleteBudget.mockResolvedValue({ error: null });
			const setState = jest.fn();

			await budgetHandlers.confirmDeleteBudget({ budgetId: 1 }, refresh, setIsLoading, setState);

			expect(mockDeleteBudget).toHaveBeenCalledWith(1);
			expect(refresh).toHaveBeenCalled();
			expect(setState).toHaveBeenCalledWith({ open: false, budgetId: null });
		});

		it('shows error toast when delete fails', async () => {
			mockDeleteBudget.mockResolvedValue({ error: new Error('Fail') });
			const setState = jest.fn();

			await budgetHandlers.confirmDeleteBudget({ budgetId: 1 }, refresh, setIsLoading, setState);

			expect(mockToast).toHaveBeenCalledWith(
				expect.objectContaining({
					variant: 'destructive',
					title: 'No se pudo eliminar el presupuesto',
				})
			);
			expect(refresh).not.toHaveBeenCalled();
		});
	});

	describe('handleDeleteFolder / confirmDeleteFolder', () => {
		it('sets delete folder confirmation with budget count', () => {
			const setState = jest.fn();
			const budgetsByFolderId = new Map<number, BudgetWithWork[]>();
			budgetsByFolderId.set(1, [baseBudget, baseBudget]);

			budgetHandlers.handleDeleteFolder(1, budgetsByFolderId, setState);

			expect(setState).toHaveBeenCalledWith({
				open: true,
				folderId: 1,
				budgetCount: 2,
			});
		});

		it('deletes folder and refreshes on confirm', async () => {
			mockDeleteFolderBudgetWithBudgets.mockResolvedValue({ error: null });
			const setState = jest.fn();

			await budgetHandlers.confirmDeleteFolder({ folderId: 1 }, refresh, setIsLoading, setState);

			expect(mockDeleteFolderBudgetWithBudgets).toHaveBeenCalledWith(1);
			expect(refresh).toHaveBeenCalled();
			expect(setState).toHaveBeenCalledWith({ open: false, folderId: null, budgetCount: 0 });
		});
	});

	describe('handleViewPdf', () => {
		it('returns early when budget has no pdf_path', async () => {
			const budgetNoPdf = { ...baseBudget, pdf_path: null };
			const setIsLoading = jest.fn();
			window.open = jest.fn();

			await budgetHandlers.handleViewPdf(budgetNoPdf, setIsLoading);

			expect(window.open).not.toHaveBeenCalled();
		});

		it('opens PDF in new window using signed URL', async () => {
			const { getSupabaseClient } = require('@/lib/supabase-client');
			(getSupabaseClient as jest.Mock).mockReturnValue({
				storage: {
					from: jest.fn().mockReturnValue({
						createSignedUrl: jest
							.fn()
							.mockResolvedValue({ data: { signedUrl: 'https://signed.url' }, error: null }),
					}),
				},
			});

			window.open = jest.fn();
			const setIsLoading = jest.fn();

			await budgetHandlers.handleViewPdf(baseBudget, setIsLoading);

			expect(window.open).toHaveBeenCalledWith('https://signed.url', '_blank');
		});
	});

	describe('handleOpenBudgetDetail / closeBudgetDetailModal', () => {
		it('opens budget detail modal', () => {
			const setState = jest.fn();
			budgetHandlers.handleOpenBudgetDetail(baseBudget, setState);
			expect(setState).toHaveBeenCalledWith({ open: true, budget: baseBudget });
		});

		it('closes budget detail modal', () => {
			const setState = jest.fn();
			budgetHandlers.closeBudgetDetailModal(setState);
			expect(setState).toHaveBeenCalledWith({ open: false, budget: null });
		});
	});

	describe('handleEditBudget', () => {
		it('sets editing budget, closes detail modal, and opens edit modal', () => {
			const setEditingBudget = jest.fn();
			const closeDetail = jest.fn();
			const setEditModalOpen = jest.fn();

			budgetHandlers.handleEditBudget(baseBudget, setEditingBudget, closeDetail, setEditModalOpen);

			expect(setEditingBudget).toHaveBeenCalledWith(baseBudget);
			expect(closeDetail).toHaveBeenCalled();
			expect(setEditModalOpen).toHaveBeenCalledWith(true);
		});
	});

	describe('handleEditBudgetSubmit', () => {
		it('returns early when no editingBudget', async () => {
			await budgetHandlers.handleEditBudgetSubmit(
				{},
				null,
				1,
				setIsLoading,
				jest.fn(),
				jest.fn(),
				refresh
			);
			expect(mockEditBudget).not.toHaveBeenCalled();
		});

		it('edits budget and refreshes on success', async () => {
			const parseAmount = require('@/helpers/budgets/helper-budget').parseAmount;
			parseAmount.mockReturnValue(150000);
			mockEditBudget.mockResolvedValue({ error: null });
			const setEditModalOpen = jest.fn();
			const setEditingBudget = jest.fn();

			await budgetHandlers.handleEditBudgetSubmit(
				{
					type: 'MDF',
					number: '001',
					amount: '150000',
					amountUsd: '150',
					created_at: '2024-06-15',
				},
				baseBudget,
				1,
				setIsLoading,
				setEditModalOpen,
				setEditingBudget,
				refresh
			);

			expect(mockEditBudget).toHaveBeenCalled();
			expect(setEditModalOpen).toHaveBeenCalledWith(false);
			expect(setEditingBudget).toHaveBeenCalledWith(null);
			expect(refresh).toHaveBeenCalled();
		});
	});

	describe('handleClientBudgetsUpdate', () => {
		it('calls API and refreshes on success', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: jest.fn().mockResolvedValue({ success: true, data: { updatedCount: 5 } }),
			});

			await budgetHandlers.handleClientBudgetsUpdate(800, 1, refresh);

			expect(mockFetch).toHaveBeenCalledWith(
				'/api/budget-dollar-rate',
				expect.objectContaining({
					method: 'POST',
					body: JSON.stringify({ clientId: 1, newUsdRate: 800 }),
				})
			);
			expect(refresh).toHaveBeenCalled();
			expect(mockToast).toHaveBeenCalledWith(
				expect.objectContaining({ title: 'Presupuestos actualizados' })
			);
		});

		it('throws on API error', async () => {
			mockFetch.mockResolvedValue({
				ok: false,
				json: jest.fn().mockResolvedValue({ success: false, error: 'API Error' }),
			});

			await expect(budgetHandlers.handleClientBudgetsUpdate(800, 1, refresh)).rejects.toThrow(
				'API Error'
			);
		});
	});

	describe('handleCreateBudget', () => {
		it('creates budget and refreshes', async () => {
			const parseAmount = require('@/helpers/budgets/helper-budget').parseAmount;
			parseAmount.mockReturnValue(150000);
			mockCreateFolderBudget.mockResolvedValue({ data: { id: 10 }, error: null });
			mockCreateBudget.mockResolvedValue({ error: null });
			const setIsCreateOpen = jest.fn();

			await budgetHandlers.handleCreateBudget(
				{
					type: 'MDF',
					number: '001',
					amount: '150000',
					amountUsd: '150',
					workId: '5',
					created_at: '2024-06-15',
				},
				[],
				1,
				setIsCreateOpen,
				refresh,
				setIsLoading
			);

			expect(mockCreateFolderBudget).toHaveBeenCalledWith({ client_id: 1, work_id: 5 });
			expect(mockCreateBudget).toHaveBeenCalled();
			expect(setIsCreateOpen).toHaveBeenCalledWith(false);
			expect(refresh).toHaveBeenCalled();
		});

		it('reuses existing folder when work_id matches', async () => {
			const existingFolders = [{ id: 20, work_id: 5, client_id: 1 }];
			mockCreateBudget.mockResolvedValue({ error: null });
			const setIsCreateOpen = jest.fn();

			await budgetHandlers.handleCreateBudget(
				{
					type: 'MDF',
					number: '001',
					amount: '150000',
					amountUsd: '150',
					workId: '5',
					created_at: '2024-06-15',
				},
				existingFolders,
				1,
				setIsCreateOpen,
				refresh,
				setIsLoading
			);

			expect(mockCreateFolderBudget).not.toHaveBeenCalled();
			expect(mockCreateBudget).toHaveBeenCalled();
			expect(setIsCreateOpen).toHaveBeenCalledWith(false);
		});

		it('cleans up folder on budget creation failure', async () => {
			const parseAmount = require('@/helpers/budgets/helper-budget').parseAmount;
			parseAmount.mockReturnValue(150000);
			mockCreateFolderBudget.mockResolvedValue({ data: { id: 10 }, error: null });
			mockCreateBudget.mockResolvedValue({ error: new Error('Create failed') });
			const setIsCreateOpen = jest.fn();

			await budgetHandlers.handleCreateBudget(
				{
					type: 'MDF',
					number: '001',
					amount: '150000',
					amountUsd: '150',
					workId: '5',
					created_at: '2024-06-15',
				},
				[],
				1,
				setIsCreateOpen,
				refresh,
				setIsLoading
			);

			expect(mockDeleteFolderBudget).toHaveBeenCalledWith(10);
			expect(setIsCreateOpen).not.toHaveBeenCalled();
		});
	});
});
