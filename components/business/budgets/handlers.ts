import { toast } from '@/components/ui/use-toast';
import { getSupabaseClient } from '@/lib/supabase-client';
import { BudgetWithWork } from '@/lib/balances/balances';
import { createBudget, updateBudget, deleteBudget, editBudget } from '@/lib/budgets/budgets';
import {
	createFolderBudget,
	deleteFolderBudgetWithBudgets,
	deleteFolderBudget,
} from '@/lib/budgets/folder_budgets';
import { translateError } from '@/lib/error-translator';
import { TOAST_MESSAGES } from '@/constants/budgets/constants';
import { parseAmount } from '@/helpers/budgets/helper-budget';
import { BUDGET_STATUS, BUDGET_STATUS_LABELS } from '@/constants/budgets/budget-status';

export interface BudgetHandlers {
	handleChooseBudget: (
		budgetId: number,
		budgets: BudgetWithWork[],
		refresh: () => void,
		setIsLoading: (loading: boolean) => void
	) => Promise<void>;
	handleStatusChange: (
		budgetId: number,
		newStatus: string,
		budgets: BudgetWithWork[],
		refresh: () => void,
		setIsLoading: (loading: boolean) => void
	) => Promise<void>;
	handleDeleteBudget: (budgetId: number, setDeleteBudgetConfirm: (state: any) => void) => void;
	confirmDeleteBudget: (
		deleteBudgetConfirm: any,
		refresh: () => void,
		setIsLoading: (loading: boolean) => void,
		setDeleteBudgetConfirm: (state: any) => void
	) => Promise<void>;
	handleDeleteFolder: (
		folderId: number,
		budgetsByFolderId: Map<number, BudgetWithWork[]>,
		setDeleteFolderConfirm: (state: any) => void
	) => void;
	confirmDeleteFolder: (
		deleteFolderConfirm: any,
		refresh: () => void,
		setIsLoading: (loading: boolean) => void,
		setDeleteFolderConfirm: (state: any) => void
	) => Promise<void>;
	handleViewPdf: (
		budget: BudgetWithWork,
		setIsLoading: (loading: boolean) => void
	) => Promise<void>;
	handleOpenBudgetDetail: (
		budget: BudgetWithWork,
		setBudgetDetailModal: (state: any) => void
	) => void;
	closeBudgetDetailModal: (setBudgetDetailModal: (state: any) => void) => void;
	handleEditBudget: (
		budget: BudgetWithWork,
		setEditingBudget: (budget: BudgetWithWork | null) => void,
		closeBudgetDetailModal: () => void,
		setEditModalOpen: (open: boolean) => void
	) => void;
	handleEditBudgetSubmit: (
		formData: any,
		editingBudget: BudgetWithWork | null,
		clientId: number,
		setIsLoading: (loading: boolean) => void,
		setEditModalOpen: (open: boolean) => void,
		setEditingBudget: (budget: BudgetWithWork | null) => void,
		refresh: () => void
	) => Promise<void>;
	handleClientBudgetsUpdate: (
		newUsdRate: number,
		clientId: number,
		refresh: () => void
	) => Promise<void>;
	handleCreateBudget: (
		formData: any,
		folderBudgets: any[],
		clientId: number,
		setIsCreateOpen: (open: boolean) => void,
		refresh: () => void,
		setIsLoading: (loading: boolean) => void
	) => Promise<void>;
}

export const budgetHandlers: BudgetHandlers = {
	async handleChooseBudget(
		budgetId: number,
		budgets: BudgetWithWork[],
		refresh: () => void,
		setIsLoading: (loading: boolean) => void
	) {
		try {
			setIsLoading(true);
			const budget = budgets.find((b) => b.id === budgetId);
			if (!budget) return;

			const { error } = await updateBudget(budgetId, {
				accepted: !budget.accepted,
			});

			if (error) {
				toast({
					variant: 'destructive',
					title: 'No se pudo cambiar el estado',
					description: translateError(error),
				});
				return;
			}

			toast({
				title: budget.accepted ? TOAST_MESSAGES.budgetUnchosen : TOAST_MESSAGES.budgetChosen,
				description: budget.accepted
					? 'El presupuesto ya no será considerado como elegido.'
					: 'El presupuesto ahora es el elegido para este cliente.',
			});
			refresh();
		} finally {
			setIsLoading(false);
		}
	},

	async handleStatusChange(
		budgetId: number,
		newStatus: string,
		budgets: BudgetWithWork[],
		refresh: () => void,
		setIsLoading: (loading: boolean) => void
	) {
		try {
			setIsLoading(true);
			const budget = budgets.find((b) => b.id === budgetId);
			if (!budget) return;

			// Reset only main status flags (keep 'accepted' independent)
			const updateData: any = {
				sold: false,
				lost: false,
				date_of_sale: null,
			};

			// Set the new status
			switch (newStatus) {
				case BUDGET_STATUS.SOLD:
					updateData.sold = true;
					updateData.date_of_sale = new Date().toISOString();
					break;
				case BUDGET_STATUS.LOST:
					updateData.lost = true;
					break;
				case BUDGET_STATUS.IN_PROGRESS:
				default:
					// All flags remain false for "in progress"
					break;
			}

			const { error } = await updateBudget(budgetId, updateData);

			if (error) {
				toast({
					variant: 'destructive',
					title: 'No se pudo cambiar el estado del presupuesto',
					description: translateError(error),
				});
				return;
			}

			const statusLabel = BUDGET_STATUS_LABELS[newStatus as keyof typeof BUDGET_STATUS_LABELS];
			toast({
				title: 'Estado actualizado',
				description: `El presupuesto ahora está marcado como "${statusLabel}".`,
			});

			refresh();
		} finally {
			setIsLoading(false);
		}
	},

	handleDeleteBudget(budgetId: number, setDeleteBudgetConfirm: (state: any) => void) {
		setDeleteBudgetConfirm({ open: true, budgetId });
	},

	async confirmDeleteBudget(
		deleteBudgetConfirm: any,
		refresh: () => void,
		setIsLoading: (loading: boolean) => void,
		setDeleteBudgetConfirm: (state: any) => void
	) {
		if (!deleteBudgetConfirm.budgetId) {
			return;
		}

		try {
			setIsLoading(true);
			const { error } = await deleteBudget(deleteBudgetConfirm.budgetId);
			if (error && error !== null) {
				toast({
					variant: 'destructive',
					title: 'No se pudo eliminar el presupuesto',
					description: translateError(error) || 'Intente nuevamente.',
				});
				return;
			}
			toast({ title: TOAST_MESSAGES.budgetDeleted });
			refresh();
		} finally {
			setIsLoading(false);
			setDeleteBudgetConfirm({ open: false, budgetId: null });
		}
	},

	handleDeleteFolder(
		folderId: number,
		budgetsByFolderId: Map<number, BudgetWithWork[]>,
		setDeleteFolderConfirm: (state: any) => void
	) {
		const budgetCount = budgetsByFolderId.get(folderId)?.length || 0;
		setDeleteFolderConfirm({
			open: true,
			folderId,
			budgetCount,
		});
	},

	async confirmDeleteFolder(
		deleteFolderConfirm: any,
		refresh: () => void,
		setIsLoading: (loading: boolean) => void,
		setDeleteFolderConfirm: (state: any) => void
	) {
		if (!deleteFolderConfirm.folderId) {
			return;
		}

		try {
			setIsLoading(true);
			const { error } = await deleteFolderBudgetWithBudgets(deleteFolderConfirm.folderId);
			if (error && error !== null) {
				toast({
					variant: 'destructive',
					title: 'No se pudo eliminar la carpeta',
					description: translateError(error) || 'Intente nuevamente.',
				});
				return;
			}
			toast({ title: TOAST_MESSAGES.folderDeleted });
			refresh();
		} finally {
			setIsLoading(false);
			setDeleteFolderConfirm({
				open: false,
				folderId: null,
				budgetCount: 0,
			});
		}
	},

	async handleViewPdf(budget: BudgetWithWork, setIsLoading: (loading: boolean) => void) {
		if (!budget.pdf_path) return;

		try {
			setIsLoading(true);
			const supabase = getSupabaseClient();
			const { data, error } = await supabase.storage
				.from('clients')
				.createSignedUrl(budget.pdf_path, 3600);

			if (error) {
				toast({
					variant: 'destructive',
					title: 'No se pudo cargar el PDF',
					description: 'Intente nuevamente.',
				});
				return;
			}

			if (data?.signedUrl) {
				window.open(data.signedUrl, '_blank');
			}
		} finally {
			setIsLoading(false);
		}
	},

	handleOpenBudgetDetail(budget: BudgetWithWork, setBudgetDetailModal: (state: any) => void) {
		setBudgetDetailModal({ open: true, budget });
	},

	closeBudgetDetailModal(setBudgetDetailModal: (state: any) => void) {
		setBudgetDetailModal({ open: false, budget: null });
	},

	handleEditBudget(
		budget: BudgetWithWork,
		setEditingBudget: (budget: BudgetWithWork | null) => void,
		closeBudgetDetailModal: () => void,
		setEditModalOpen: (open: boolean) => void
	) {
		setEditingBudget(budget);
		closeBudgetDetailModal();
		setEditModalOpen(true);
	},

	async handleEditBudgetSubmit(
		formData: any,
		editingBudget: BudgetWithWork | null,
		clientId: number,
		setIsLoading: (loading: boolean) => void,
		setEditModalOpen: (open: boolean) => void,
		setEditingBudget: (budget: BudgetWithWork | null) => void,
		refresh: () => void
	) {
		if (!editingBudget) return;

		try {
			setIsLoading(true);

			const amount = parseAmount(formData.amount);
			const amountUsd = parseAmount(formData.amountUsd);
			const number = formData.number.trim() || null;

			const { error } = await editBudget(
				editingBudget.id,
				{
					type: formData.type,
					number: number,
					amount_ars: amount,
					amount_usd: amountUsd,
					created_at: formData.created_at
						? new Date(formData.created_at + 'T00:00:00').toISOString()
						: editingBudget.created_at,
					usd_quote: formData.usdRate ? parseAmount(formData.usdRate) : null,
				},
				formData.pdf,
				clientId
			);

			if (error) {
				console.error('Error editando presupuesto:', error);
				toast({
					variant: 'destructive',
					title: 'No se pudo editar el presupuesto',
					description: translateError(error) || 'Intente nuevamente.',
				});
				return;
			}

			toast({ title: TOAST_MESSAGES.budgetUpdated });
			setEditModalOpen(false);
			setEditingBudget(null);
			refresh();
		} finally {
			setIsLoading(false);
		}
	},

	async handleClientBudgetsUpdate(newUsdRate: number, clientId: number, refresh: () => void) {
		try {
			const response = await fetch('/api/budget-dollar-rate', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					clientId,
					newUsdRate,
				}),
			});

			const result = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.error || 'Error al actualizar el tipo de cambio');
			}

			refresh();

			toast({
				title: TOAST_MESSAGES.pricesUpdated,
				description: `${result.data.updatedCount} presupuesto(s) se actualizaron con el nuevo tipo de cambio.`,
			});
		} catch (error) {
			console.error('Error al actualizar presupuestos del cliente:', error);
			throw error;
		}
	},

	async handleCreateBudget(
		formData: any,
		folderBudgets: any[],
		clientId: number,
		setIsCreateOpen: (open: boolean) => void,
		refresh: () => void,
		setIsLoading: (loading: boolean) => void
	) {
		try {
			setIsLoading(true);

			const work_id = formData.workId === 'none' ? null : Number(formData.workId);

			const existingFolder = folderBudgets.find((f) => (f.work_id ?? null) === work_id);
			let folderId = existingFolder?.id;
			let newFolder = false;

			if (!folderId) {
				const { data: folder, error: folderError } = await createFolderBudget({
					client_id: clientId,
					work_id: work_id,
				});

				if (folderError || !folder) {
					const errorMessage = folderError
						? translateError(folderError)
						: 'Error desconocido al crear la carpeta';
					toast({
						variant: 'destructive',
						title: 'No se pudo crear la carpeta.' + errorMessage,
						description: 'Intente nuevamente.',
					});
					return;
				}
				folderId = folder.id;
				newFolder = true;
			}

			const amount = parseAmount(formData.amount);
			const amountUsd = parseAmount(formData.amountUsd);
			const number = formData.number.trim() || null;

			const { error: createError } = await createBudget(
				{
					folder_budget_id: folderId,
					accepted: false,
					sold: false,
					lost: false,
					type: formData.type,
					number: number,
					amount_ars: amount,
					amount_usd: amountUsd,
					created_at: formData.created_at
						? new Date(formData.created_at + 'T00:00:00').toISOString()
						: new Date().toISOString(),
					usd_quote: formData.usdRate ? parseAmount(formData.usdRate) : null,
				},
				formData.pdf,
				clientId
			);

			if (createError) {
				console.error('Error creando presupuesto:', createError);
				toast({
					variant: 'destructive',
					title: 'No se pudo crear el presupuesto',
					description: translateError(createError) || 'Intente nuevamente.',
				});
				if (newFolder && folderId) {
					await deleteFolderBudget(folderId);
				}
				return;
			}

			toast({ title: TOAST_MESSAGES.budgetCreated });
			setIsCreateOpen(false);
			refresh();
		} finally {
			setIsLoading(false);
		}
	},
};
