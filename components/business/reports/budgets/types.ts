import { Work } from '@/lib/works/works';
import { BudgetWithWork } from '@/lib/balances/balances';
import { FolderBudget } from '@/lib/budgets/folder_budgets';

export interface BudgetFolderVM extends FolderBudget {
	budgets: BudgetWithWork[];
}

export interface ClientBudgetsTabProps {
	clientId: number;
	works: Work[];
	loadWorks: () => void;
	onBudgetsChange: (budgets: BudgetWithWork[]) => void;
}

export interface DeleteBudgetConfirmState {
	open: boolean;
	budgetId: number | null;
}

export interface DeleteFolderConfirmState {
	open: boolean;
	folderId: number | null;
	budgetCount: number;
}

export interface PdfPreviewState {
	open: boolean;
	budget: BudgetWithWork | null;
	pdfUrl: string | null;
}

export interface BudgetDetailModalState {
	open: boolean;
	budget: BudgetWithWork | null;
}

export interface BudgetFormData {
	type: string;
	number: string;
	amount: string;
	amountUsd: string;
	usdRate: string;
	workId: string;
	pdf: File | null;
	created_at: string;
	usdQuote: string;
	date_of_sale: string;
}

export interface ClientBudgetsTabState {
	isLoading: boolean;
	openFolders: Record<number, boolean>;
	isCreateOpen: boolean;
	formData: BudgetFormData;
	deleteBudgetConfirm: DeleteBudgetConfirmState;
	deleteFolderConfirm: DeleteFolderConfirmState;
	pdfPreview: PdfPreviewState;
	isClientBudgetsUpdateModalOpen: boolean;
	budgetDetailModal: BudgetDetailModalState;
	editModalOpen: boolean;
	editingBudget: BudgetWithWork | null;
}

export interface BudgetReportRow {
	id: number;
	date: string;
	dateRaw: Date;
	client: string;
	number: string;
	type: string;
	work: string;
	amountArs: number;
	amountUsd: number;
	status: string;
}

export interface BudgetFilters {
	status: string;
	minAmountArs: string;
	maxAmountArs: string;
	minAmountUsd: string;
	maxAmountUsd: string;
}

export interface BudgetFilterDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	filters: BudgetFilters;
	onFiltersChange: (filters: BudgetFilters) => void;
	onReset: () => void;
}
