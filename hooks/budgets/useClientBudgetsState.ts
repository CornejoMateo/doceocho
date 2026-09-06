import { useState, useEffect, useMemo } from 'react';
import { useOptimizedRealtime } from '@/hooks/use-optimized-realtime';
import { BudgetWithWork } from '@/lib/balances/balances';
import { FolderBudget } from '@/lib/budgets/folder_budgets';
import { getBudgetsByFolderBudgetIds } from '@/lib/budgets/budgets';
import { getFolderBudgetsByClientId } from '@/lib/budgets/folder_budgets';
import {
	BudgetFolderVM,
	BudgetFormData,
	DeleteBudgetConfirmState,
	DeleteFolderConfirmState,
	BudgetDetailModalState,
} from '@/components/business/reports/budgets/types';
import { FORM_DEFAULTS } from '../../constants/budgets/constants';
import { workLabel } from '@/helpers/budgets/helper-budget';

export function useClientBudgetsState(clientId: number) {
	const [isLoading, setIsLoading] = useState(false);
	const [openFolders, setOpenFolders] = useState<Record<number, boolean>>({});
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [formData, setFormData] = useState<BudgetFormData>({
		type: FORM_DEFAULTS.type,
		number: FORM_DEFAULTS.number,
		amount: FORM_DEFAULTS.amount,
		amountUsd: FORM_DEFAULTS.amountUsd,
		workId: FORM_DEFAULTS.workId,
		pdf: null,
		created_at: FORM_DEFAULTS.created_at,
		usdRate: FORM_DEFAULTS.usdRate,
		usdQuote: FORM_DEFAULTS.usdQuote,
		date_of_sale: FORM_DEFAULTS.date_of_sale,
	});
	const [deleteBudgetConfirm, setDeleteBudgetConfirm] = useState<DeleteBudgetConfirmState>({
		open: false,
		budgetId: null,
	});
	const [deleteFolderConfirm, setDeleteFolderConfirm] = useState<DeleteFolderConfirmState>({
		open: false,
		folderId: null,
		budgetCount: 0,
	});

	const [isClientBudgetsUpdateModalOpen, setIsClientBudgetsUpdateModalOpen] = useState(false);
	const [budgetDetailModal, setBudgetDetailModal] = useState<BudgetDetailModalState>({
		open: false,
		budget: null,
	});
	const [editModalOpen, setEditModalOpen] = useState(false);
	const [editingBudget, setEditingBudget] = useState<BudgetWithWork | null>(null);

	const {
		data: folderBudgets,
		loading: loadingFolders,
		refresh: refreshFolders,
	} = useOptimizedRealtime<FolderBudget>(
		'folder_budgets',
		async () => {
			const { data } = await getFolderBudgetsByClientId(clientId);
			return data ?? [];
		},
		`folder_budgets_${clientId}`
	);

	const folderBudgetIds = useMemo(() => folderBudgets.map((f) => f.id), [folderBudgets]);

	const {
		data: budgets,
		loading: loadingBudgets,
		refresh: refreshBudgets,
	} = useOptimizedRealtime<BudgetWithWork>(
		'budgets',
		async () => {
			if (folderBudgetIds.length === 0) return [];
			const { data } = await getBudgetsByFolderBudgetIds(folderBudgetIds);
			return data ?? [];
		},
		`budgets_${clientId}`
	);

	const budgetsByFolderId = useMemo(() => {
		const map = new Map<number, BudgetWithWork[]>();

		for (const budget of budgets) {
			if (!budget || !budget.folder_budget || !budget.folder_budget.id) {
				console.warn('Budget sin folder_budget válido:', budget);
				continue;
			}

			const folderId = budget.folder_budget.id;

			if (!map.has(folderId)) {
				map.set(folderId, []);
			}

			map.get(folderId)!.push(budget);
		}

		return map;
	}, [budgets]);

	const foldersVM: BudgetFolderVM[] = useMemo(() => {
		return folderBudgets.map((f) => ({
			...f,
			budgets: budgetsByFolderId.get(f.id) ?? [],
		}));
	}, [folderBudgets, budgetsByFolderId]);

	const orderedFolders = useMemo(() => {
		return [...foldersVM].sort((a, b) => {
			const aNone = !a.work_id;
			const bNone = !b.work_id;
			if (aNone !== bNone) return aNone ? 1 : -1;
			return workLabel(a).localeCompare(workLabel(b));
		});
	}, [foldersVM]);

	const chosenBudgetIds = useMemo(() => {
		const chosen = budgets.filter((b) => !!b.accepted);
		return chosen.map((b) => b.id);
	}, [budgets]);

	useEffect(() => {
		setOpenFolders((prev) => {
			const next: Record<number, boolean> = { ...prev };
			for (const f of orderedFolders) {
				if (next[f.id] === undefined) next[f.id] = true;
			}
			return next;
		});
	}, [orderedFolders]);

	useEffect(() => {
		if (folderBudgetIds.length > 0) {
			refreshBudgets();
		}
	}, [folderBudgetIds.length, refreshBudgets]);

	useEffect(() => {
		if (!editModalOpen) {
			setEditingBudget(null);
		}
	}, [editModalOpen]);

	const refresh = () => {
		refreshFolders();
		refreshBudgets();
	};

	const updateFormData = (updates: Partial<BudgetFormData>) => {
		setFormData((prev) => ({ ...prev, ...updates }));
	};

	const resetFormData = () => {
		setFormData({
			type: FORM_DEFAULTS.type,
			number: FORM_DEFAULTS.number,
			amount: FORM_DEFAULTS.amount,
			amountUsd: FORM_DEFAULTS.amountUsd,
			workId: FORM_DEFAULTS.workId,
			pdf: null,
			created_at: FORM_DEFAULTS.created_at,
			usdRate: FORM_DEFAULTS.usdRate,
			usdQuote: FORM_DEFAULTS.usdQuote,
			date_of_sale: FORM_DEFAULTS.date_of_sale,
		});
	};

	return {
		// State
		isLoading,
		setIsLoading,
		openFolders,
		setOpenFolders,
		isCreateOpen,
		setIsCreateOpen,
		formData,
		updateFormData,
		resetFormData,
		deleteBudgetConfirm,
		setDeleteBudgetConfirm,
		deleteFolderConfirm,
		setDeleteFolderConfirm,
		isClientBudgetsUpdateModalOpen,
		setIsClientBudgetsUpdateModalOpen,
		budgetDetailModal,
		setBudgetDetailModal,
		editModalOpen,
		setEditModalOpen,
		editingBudget,
		setEditingBudget,

		// Data
		folderBudgets,
		loadingFolders,
		budgets,
		loadingBudgets,
		budgetsByFolderId,
		foldersVM,
		orderedFolders,
		chosenBudgetIds,

		// Actions
		refresh,
	};
}
