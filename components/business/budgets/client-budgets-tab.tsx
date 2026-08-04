'use client';

import { useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { TrendingUp, Plus } from 'lucide-react';
import { BudgetWithWork } from '@/lib/balances/balances';
import { updateFolderBudget } from '@/lib/budgets/folder_budgets';
import { BudgetFormModal } from '@/components/business/budgets/budget-form-modal';
import { useClientBudgetsState } from '@/hooks/budgets/useClientBudgetsState';
import { budgetHandlers } from './handlers';
import { FolderCard } from '@/components/business/budgets/FolderCard';
import { BudgetDetailModal } from '@/components/business/budgets/BudgetDetailModal';
import { ClientBudgetsTabProps } from '@/components/business/reports/budgets/types';
import { toast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';

export function ClientBudgetsTab({
	clientId,
	works,
	loadWorks,
	onBudgetsChange,
}: ClientBudgetsTabProps) {
	const {
		// State
		isLoading,
		setIsLoading,
		openFolders,
		setOpenFolders,
		isCreateOpen,
		setIsCreateOpen,
		deleteBudgetConfirm,
		setDeleteBudgetConfirm,
		deleteFolderConfirm,
		setDeleteFolderConfirm,
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
		orderedFolders,
		chosenBudgetIds,

		// Actions
		refresh,
	} = useClientBudgetsState(clientId);

	useEffect(() => {
		onBudgetsChange(budgets);
	}, [budgets, onBudgetsChange]);

	useEffect(() => {
		loadWorks();
	}, []);

	// Event handlers
	const handleChooseBudget = (budgetId: number) => {
		budgetHandlers.handleChooseBudget(budgetId, budgets, refresh, setIsLoading);
	};

	const handleStatusChange = (budgetId: number, newStatus: string) => {
		budgetHandlers.handleStatusChange(budgetId, newStatus, budgets, refresh, setIsLoading);
	};

	const handleDeleteBudget = (budgetId: number) => {
		budgetHandlers.handleDeleteBudget(budgetId, setDeleteBudgetConfirm);
	};

	const confirmDeleteBudget = () => {
		budgetHandlers.confirmDeleteBudget(
			deleteBudgetConfirm,
			refresh,
			setIsLoading,
			setDeleteBudgetConfirm
		);
	};

	const handleDeleteFolder = (folderId: number) => {
		budgetHandlers.handleDeleteFolder(folderId, budgetsByFolderId, setDeleteFolderConfirm);
	};

	const confirmDeleteFolder = () => {
		budgetHandlers.confirmDeleteFolder(
			deleteFolderConfirm,
			refresh,
			setIsLoading,
			setDeleteFolderConfirm
		);
	};

	const handleViewPdf = (budget: BudgetWithWork) => {
		budgetHandlers.handleViewPdf(budget, setIsLoading);
	};

	const handleOpenBudgetDetail = (budget: BudgetWithWork) => {
		budgetHandlers.handleOpenBudgetDetail(budget, setBudgetDetailModal);
	};

	const closeBudgetDetailModal = () => {
		budgetHandlers.closeBudgetDetailModal(setBudgetDetailModal);
	};

	const handleEditBudget = (budget: BudgetWithWork) => {
		budgetHandlers.handleEditBudget(
			budget,
			setEditingBudget,
			closeBudgetDetailModal,
			setEditModalOpen
		);
	};

	const handleEditBudgetSubmit = async (formData: any) => {
		await budgetHandlers.handleEditBudgetSubmit(
			formData,
			editingBudget,
			clientId,
			setIsLoading,
			setEditModalOpen,
			setEditingBudget,
			refresh
		);
	};

	const handleAssignWork = async (folderId: number, workId: number) => {
		const { error } = await updateFolderBudget(folderId, { work_id: workId });
		if (!error) {
			toast({
				title: 'Obra asignada',
				description: 'La obra ha sido asignada a la carpeta de presupuestos.',
			});
			refresh();
		} else {
			const errorMessage = translateError(error);
			toast({
				title: 'Error',
				description:
					errorMessage || 'Ocurrió un error al asignar la obra. Por favor, intentá nuevamente.',
				variant: 'destructive',
			});
		}
	};

	const handleCreateBudgetSubmit = async (formData: any) => {
		await budgetHandlers.handleCreateBudget(
			formData,
			folderBudgets,
			clientId,
			setIsCreateOpen,
			refresh,
			setIsLoading
		);
	};

	// Helper function to get budgets by folder ID (needed for folder delete)
	const budgetsByFolderId = new Map<number, BudgetWithWork[]>();
	for (const budget of budgets) {
		if (!budget || !budget.folder_budget || !budget.folder_budget.id) {
			continue;
		}
		const folderId = budget.folder_budget.id;
		if (!budgetsByFolderId.has(folderId)) {
			budgetsByFolderId.set(folderId, []);
		}
		budgetsByFolderId.get(folderId)!.push(budget);
	}

	return (
		<>
			<div className="space-y-4">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="min-w-0">
						{chosenBudgetIds.length > 0 && (
							<Badge variant="secondary" className="max-w-full">
								{chosenBudgetIds.length} presupuesto(s) elegido(s)
							</Badge>
						)}
					</div>

					<Button
						size="sm"
						className="w-full sm:w-auto gap-2"
						disabled={isLoading}
						onClick={() => setIsCreateOpen(true)}
					>
						<Plus className="h-4 w-4 shrink-0" />
						<span>Nuevo presupuesto</span>
					</Button>
				</div>

				{(loadingFolders || loadingBudgets) && folderBudgets.length === 0 ? (
					<p className="text-sm text-muted-foreground text-center py-6">Cargando presupuestos...</p>
				) : folderBudgets.length === 0 ? (
					<Card className="p-6">
						<div className="text-center space-y-2">
							<p className="text-sm text-muted-foreground">
								Este cliente todavía no tiene presupuestos.
							</p>
						</div>
					</Card>
				) : null}

				<div className="space-y-3">
					{orderedFolders.map((folder) => (
						<FolderCard
							key={folder.id}
							folder={folder}
							works={works}
							isOpen={!!openFolders[folder.id]}
							onToggle={(open) => setOpenFolders((prev) => ({ ...prev, [folder.id]: open }))}
							isLoading={isLoading}
							onChooseBudget={handleChooseBudget}
							onDeleteBudget={handleDeleteBudget}
							onDeleteFolder={handleDeleteFolder}
							onViewPdf={handleViewPdf}
							onOpenDetail={handleOpenBudgetDetail}
							onAssignWork={handleAssignWork}
						/>
					))}
				</div>
			</div>

			<ConfirmDialog
				open={deleteBudgetConfirm.open}
				onOpenChange={(open) => setDeleteBudgetConfirm({ ...deleteBudgetConfirm, open })}
				title="Eliminar presupuesto"
				description="¿Estás seguro de que quieres eliminar este presupuesto? Esta acción no se puede deshacer."
				onConfirm={confirmDeleteBudget}
				isLoading={isLoading}
			/>

			<ConfirmDialog
				open={deleteFolderConfirm.open}
				onOpenChange={(open) => setDeleteFolderConfirm({ ...deleteFolderConfirm, open })}
				title="Eliminar carpeta"
				description={`¿Estás seguro de que quieres eliminar esta carpeta y sus ${deleteFolderConfirm.budgetCount} presupuesto(s)? Esta acción no se puede deshacer.`}
				onConfirm={confirmDeleteFolder}
				isLoading={isLoading}
			/>

			<BudgetDetailModal
				isOpen={budgetDetailModal.open}
				onOpenChange={closeBudgetDetailModal}
				budget={budgetDetailModal.budget}
				isLoading={isLoading}
				onEdit={handleEditBudget}
				onChooseBudget={handleChooseBudget}
				onViewPdf={handleViewPdf}
				onStatusChange={handleStatusChange}
				onClose={closeBudgetDetailModal}
			/>

			<BudgetFormModal
				isOpen={isCreateOpen}
				onOpenChange={setIsCreateOpen}
				mode="create"
				works={works}
				onSubmit={handleCreateBudgetSubmit}
				budget={null}
				isLoading={isLoading}
			/>

			<BudgetFormModal
				isOpen={editModalOpen}
				onOpenChange={setEditModalOpen}
				mode="edit"
				works={works}
				budget={editingBudget}
				onSubmit={handleEditBudgetSubmit}
				isLoading={isLoading}
			/>
		</>
	);
}
