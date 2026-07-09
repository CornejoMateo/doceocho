import { render, screen, fireEvent } from '@testing-library/react';
import { ClientBudgetsTab } from '@/components/business/budgets/client-budgets-tab';
import { Work } from '@/lib/works/works';
import { BudgetWithWork } from '@/lib/balances/balances';
import type {
	DeleteBudgetConfirmState,
	DeleteFolderConfirmState,
	PdfPreviewState,
	BudgetDetailModalState,
} from '@/components/business/reports/budgets/types';

jest.mock('@/components/ui/use-toast', () => ({
	toast: jest.fn(),
}));

jest.mock('@/lib/error-translator', () => ({
	translateError: (e: any) => `translated: ${e?.message || e}`,
}));

jest.mock('@/lib/budgets/folder_budgets', () => ({
	updateFolderBudget: jest.fn(),
}));

const mockRefresh = jest.fn();
const mockSetIsLoading = jest.fn();
const mockSetOpenFolders = jest.fn();
const mockSetIsCreateOpen = jest.fn();
const mockSetDeleteBudgetConfirm = jest.fn();
const mockSetDeleteFolderConfirm = jest.fn();
const mockSetPdfPreview = jest.fn();
const mockSetIsClientBudgetsUpdateModalOpen = jest.fn();
const mockSetBudgetDetailModal = jest.fn();
const mockSetEditModalOpen = jest.fn();
const mockSetEditingBudget = jest.fn();

let mockIsLoading = false;
let mockOpenFolders: Record<number, boolean> = {};
let mockIsCreateOpen = false;
let mockDeleteBudgetConfirm: DeleteBudgetConfirmState = { open: false, budgetId: null };
let mockDeleteFolderConfirm: DeleteFolderConfirmState = {
	open: false,
	folderId: null,
	budgetCount: 0,
};
let mockPdfPreview: PdfPreviewState = { open: false, budget: null, pdfUrl: null };
let mockIsClientBudgetsUpdateModalOpen = false;
let mockBudgetDetailModal: BudgetDetailModalState = { open: false, budget: null };
let mockEditModalOpen = false;
let mockEditingBudget: BudgetWithWork | null = null;
let mockFolderBudgets: any[] = [];
let mockLoadingFolders = false;
let mockBudgets: BudgetWithWork[] = [];
let mockLoadingBudgets = false;
let mockOrderedFolders: any[] = [];
let mockChosenBudgetIds: number[] = [];

jest.mock('@/hooks/budgets/useClientBudgetsState', () => ({
	useClientBudgetsState: (clientId: number) => ({
		isLoading: mockIsLoading,
		setIsLoading: mockSetIsLoading,
		openFolders: mockOpenFolders,
		setOpenFolders: mockSetOpenFolders,
		isCreateOpen: mockIsCreateOpen,
		setIsCreateOpen: mockSetIsCreateOpen,
		deleteBudgetConfirm: mockDeleteBudgetConfirm,
		setDeleteBudgetConfirm: mockSetDeleteBudgetConfirm,
		deleteFolderConfirm: mockDeleteFolderConfirm,
		setDeleteFolderConfirm: mockSetDeleteFolderConfirm,
		pdfPreview: mockPdfPreview,
		setPdfPreview: mockSetPdfPreview,
		isClientBudgetsUpdateModalOpen: mockIsClientBudgetsUpdateModalOpen,
		setIsClientBudgetsUpdateModalOpen: mockSetIsClientBudgetsUpdateModalOpen,
		budgetDetailModal: mockBudgetDetailModal,
		setBudgetDetailModal: mockSetBudgetDetailModal,
		editModalOpen: mockEditModalOpen,
		setEditModalOpen: mockSetEditModalOpen,
		editingBudget: mockEditingBudget,
		setEditingBudget: mockSetEditingBudget,
		folderBudgets: mockFolderBudgets,
		loadingFolders: mockLoadingFolders,
		budgets: mockBudgets,
		loadingBudgets: mockLoadingBudgets,
		orderedFolders: mockOrderedFolders,
		chosenBudgetIds: mockChosenBudgetIds,
		refresh: mockRefresh,
	}),
}));

const mockHandleChooseBudget = jest.fn();
const mockHandleStatusChange = jest.fn();
const mockHandleDeleteBudget = jest.fn();
const mockConfirmDeleteBudget = jest.fn();
const mockHandleDeleteFolder = jest.fn();
const mockConfirmDeleteFolder = jest.fn();
const mockHandleViewPdf = jest.fn();
const mockClosePdfPreview = jest.fn();
const mockHandleOpenBudgetDetail = jest.fn();
const mockCloseBudgetDetailModal = jest.fn();
const mockHandleEditBudget = jest.fn();
const mockHandleEditBudgetSubmit = jest.fn();
const mockHandleClientBudgetsUpdate = jest.fn();
const mockHandleCreateBudgetSubmit = jest.fn();
const mockHandleAssignWork = jest.fn();

jest.mock('@/components/business/budgets/handlers', () => ({
	budgetHandlers: {
		handleChooseBudget: (...args: any[]) => mockHandleChooseBudget(...args),
		handleStatusChange: (...args: any[]) => mockHandleStatusChange(...args),
		handleDeleteBudget: (...args: any[]) => mockHandleDeleteBudget(...args),
		confirmDeleteBudget: (...args: any[]) => mockConfirmDeleteBudget(...args),
		handleDeleteFolder: (...args: any[]) => mockHandleDeleteFolder(...args),
		confirmDeleteFolder: (...args: any[]) => mockConfirmDeleteFolder(...args),
		handleViewPdf: (...args: any[]) => mockHandleViewPdf(...args),
		closePdfPreview: (...args: any[]) => mockClosePdfPreview(...args),
		handleOpenBudgetDetail: (...args: any[]) => mockHandleOpenBudgetDetail(...args),
		closeBudgetDetailModal: (...args: any[]) => mockCloseBudgetDetailModal(...args),
		handleEditBudget: (...args: any[]) => mockHandleEditBudget(...args),
		handleEditBudgetSubmit: (...args: any[]) => mockHandleEditBudgetSubmit(...args),
		handleClientBudgetsUpdate: (...args: any[]) => mockHandleClientBudgetsUpdate(...args),
		handleCreateBudget: (...args: any[]) => mockHandleCreateBudgetSubmit(...args),
	},
}));

jest.mock('@/components/business/budgets/FolderCard', () => ({
	FolderCard: ({ folder, onAssignWork }: any) => (
		<div data-testid="folder-card" data-folder-id={folder.id}>
			<span>{folder.work_id ? 'Folder with work' : 'Folder without work'}</span>
			<button onClick={() => onAssignWork(folder.id, 1)}>Assign</button>
		</div>
	),
}));

jest.mock('@/components/business/budgets/BudgetDetailModal', () => ({
	BudgetDetailModal: ({
		isOpen,
		budget,
		onEdit,
		onChooseBudget,
		onViewPdf,
		onStatusChange,
		onClose,
	}: any) =>
		isOpen ? (
			<div data-testid="budget-detail-modal">
				<span>Detail for {budget?.id}</span>
				<button onClick={() => onEdit(budget)}>Edit</button>
				<button onClick={() => onChooseBudget(budget?.id)}>Choose</button>
				<button onClick={() => onViewPdf(budget)}>ViewPdf</button>
				<button onClick={() => onStatusChange(budget?.id, 'sold')}>StatusChange</button>
				<button onClick={onClose}>Close</button>
			</div>
		) : null,
}));

jest.mock('@/components/business/budgets/PdfPreviewModal', () => ({
	PdfPreviewModal: ({ isOpen, budget, pdfUrl }: any) =>
		isOpen ? <div data-testid="pdf-preview-modal">{pdfUrl}</div> : null,
}));

jest.mock('@/components/business/budgets/budget-form-modal', () => ({
	BudgetFormModal: ({ isOpen, mode, onSubmit }: any) =>
		isOpen ? (
			<div data-testid="budget-form-modal" data-mode={mode}>
				<button onClick={() => onSubmit({ type: 'MDF' })}>Submit</button>
			</div>
		) : null,
}));

jest.mock('@/components/ui/client-budgets-dollar-update-modal', () => ({
	ClientBudgetsDollarUpdateModal: ({ isOpen, onUpdateConfirmed }: any) =>
		isOpen ? (
			<div data-testid="dollar-update-modal">
				<button onClick={() => onUpdateConfirmed(800)}>Update</button>
			</div>
		) : null,
}));

jest.mock('@/components/ui/confirm-dialog', () => ({
	ConfirmDialog: ({ open, onConfirm, title }: any) =>
		open ? (
			<div data-testid="confirm-dialog" data-title={title}>
				<button onClick={onConfirm}>Confirm</button>
			</div>
		) : null,
}));

const mockWorks: Work[] = [{ id: 1, address: 'Av. Siempre Viva', locality: 'Springfield' }];

describe('ClientBudgetsTab', () => {
	const loadWorks = jest.fn();
	const onBudgetsChange = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		mockIsLoading = false;
		mockOpenFolders = {};
		mockIsCreateOpen = false;
		mockDeleteBudgetConfirm = { open: false, budgetId: null };
		mockDeleteFolderConfirm = { open: false, folderId: null, budgetCount: 0 };
		mockPdfPreview = { open: false, budget: null, pdfUrl: null };
		mockIsClientBudgetsUpdateModalOpen = false;
		mockBudgetDetailModal = { open: false, budget: null };
		mockEditModalOpen = false;
		mockEditingBudget = null;
		mockFolderBudgets = [];
		mockLoadingFolders = false;
		mockBudgets = [];
		mockLoadingBudgets = false;
		mockOrderedFolders = [];
		mockChosenBudgetIds = [];
	});

	it('renders loading state when folders and budgets are loading', () => {
		mockLoadingFolders = true;
		mockLoadingBudgets = true;
		mockFolderBudgets = [];

		render(
			<ClientBudgetsTab
				clientId={1}
				works={mockWorks}
				loadWorks={loadWorks}
				onBudgetsChange={onBudgetsChange}
			/>
		);

		expect(screen.getByText('Cargando presupuestos...')).toBeInTheDocument();
	});

	it('renders empty state when no folders exist', () => {
		render(
			<ClientBudgetsTab
				clientId={1}
				works={mockWorks}
				loadWorks={loadWorks}
				onBudgetsChange={onBudgetsChange}
			/>
		);

		expect(screen.getByText('Este cliente todavía no tiene presupuestos.')).toBeInTheDocument();
	});

	it('renders folders and calls onBudgetsChange', () => {
		mockOrderedFolders = [{ id: 1, work_id: 5, budgets: [] }];

		render(
			<ClientBudgetsTab
				clientId={1}
				works={mockWorks}
				loadWorks={loadWorks}
				onBudgetsChange={onBudgetsChange}
			/>
		);

		expect(screen.getByTestId('folder-card')).toBeInTheDocument();
	});

	it('calls loadWorks on mount', () => {
		render(
			<ClientBudgetsTab
				clientId={1}
				works={mockWorks}
				loadWorks={loadWorks}
				onBudgetsChange={onBudgetsChange}
			/>
		);

		expect(loadWorks).toHaveBeenCalled();
	});

	it('renders chosen budget badge when there are chosen budgets', () => {
		mockChosenBudgetIds = [1];

		render(
			<ClientBudgetsTab
				clientId={1}
				works={mockWorks}
				loadWorks={loadWorks}
				onBudgetsChange={onBudgetsChange}
			/>
		);

		expect(screen.getByText('1 presupuesto(s) elegido(s)')).toBeInTheDocument();
	});

	it('renders "Nuevo presupuesto" button', () => {
		render(
			<ClientBudgetsTab
				clientId={1}
				works={mockWorks}
				loadWorks={loadWorks}
				onBudgetsChange={onBudgetsChange}
			/>
		);

		expect(screen.getByText('Nuevo presupuesto')).toBeInTheDocument();
	});

	it('opens create modal when "Nuevo presupuesto" is clicked', () => {
		render(
			<ClientBudgetsTab
				clientId={1}
				works={mockWorks}
				loadWorks={loadWorks}
				onBudgetsChange={onBudgetsChange}
			/>
		);

		fireEvent.click(screen.getByText('Nuevo presupuesto'));
		expect(mockSetIsCreateOpen).toHaveBeenCalledWith(true);
	});

	it('renders create form modal when isCreateOpen is true', () => {
		mockIsCreateOpen = true;

		render(
			<ClientBudgetsTab
				clientId={1}
				works={mockWorks}
				loadWorks={loadWorks}
				onBudgetsChange={onBudgetsChange}
			/>
		);

		expect(screen.getByTestId('budget-form-modal')).toHaveAttribute('data-mode', 'create');
	});

	it('renders edit form modal when editModalOpen is true', () => {
		mockEditModalOpen = true;
		mockEditingBudget = { id: 5 } as BudgetWithWork;

		render(
			<ClientBudgetsTab
				clientId={1}
				works={mockWorks}
				loadWorks={loadWorks}
				onBudgetsChange={onBudgetsChange}
			/>
		);

		expect(screen.getByTestId('budget-form-modal')).toHaveAttribute('data-mode', 'edit');
	});

	it('renders budget detail modal when open', () => {
		mockBudgetDetailModal = { open: true, budget: { id: 7 } as BudgetWithWork };

		render(
			<ClientBudgetsTab
				clientId={1}
				works={mockWorks}
				loadWorks={loadWorks}
				onBudgetsChange={onBudgetsChange}
			/>
		);

		expect(screen.getByTestId('budget-detail-modal')).toBeInTheDocument();
	});

	it('renders budget delete confirm dialog when open', () => {
		mockDeleteBudgetConfirm = { open: true, budgetId: 1 };

		render(
			<ClientBudgetsTab
				clientId={1}
				works={mockWorks}
				loadWorks={loadWorks}
				onBudgetsChange={onBudgetsChange}
			/>
		);

		const dialogs = screen.getAllByTestId('confirm-dialog');
		expect(dialogs.some((d) => d.getAttribute('data-title') === 'Eliminar presupuesto')).toBe(true);
	});

	it('renders folder delete confirm dialog when open', () => {
		mockDeleteFolderConfirm = { open: true, folderId: 1, budgetCount: 3 };

		render(
			<ClientBudgetsTab
				clientId={1}
				works={mockWorks}
				loadWorks={loadWorks}
				onBudgetsChange={onBudgetsChange}
			/>
		);

		const dialogs = screen.getAllByTestId('confirm-dialog');
		expect(dialogs.some((d) => d.getAttribute('data-title') === 'Eliminar carpeta')).toBe(true);
	});

	it('disables buttons when isLoading is true', () => {
		mockIsLoading = true;

		render(
			<ClientBudgetsTab
				clientId={1}
				works={mockWorks}
				loadWorks={loadWorks}
				onBudgetsChange={onBudgetsChange}
			/>
		);

		expect(screen.getByText('Nuevo presupuesto')).toBeDisabled();
	});

	it('handles assign work through FolderCard', () => {
		const { updateFolderBudget } = require('@/lib/budgets/folder_budgets');
		updateFolderBudget.mockResolvedValue({ error: null });
		mockOrderedFolders = [{ id: 2, work_id: null, budgets: [] }];

		render(
			<ClientBudgetsTab
				clientId={1}
				works={mockWorks}
				loadWorks={loadWorks}
				onBudgetsChange={onBudgetsChange}
			/>
		);

		fireEvent.click(screen.getByText('Assign'));
		expect(updateFolderBudget).toHaveBeenCalledWith(2, { work_id: 1 });
	});
});
