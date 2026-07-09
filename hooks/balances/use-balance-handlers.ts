'use client';

import { useState } from 'react';
import { deleteBalance } from '@/lib/balances/balances';
import { BalanceWithTotals } from '@/components/business/balances/client-balances';
import { toast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';

interface UseBalanceHandlersProps {
	onBalanceDeleted?: () => void;
	onRefresh: () => void;
}

export function useBalanceHandlers({ onBalanceDeleted, onRefresh }: UseBalanceHandlersProps) {
	const [selectedBalance, setSelectedBalance] = useState<BalanceWithTotals | null>(null);
	const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
	const [balanceToDelete, setBalanceToDelete] = useState<BalanceWithTotals | null>(null);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [isDollarUpdateModalOpen, setIsDollarUpdateModalOpen] = useState(false);
	const [balanceToUpdate, setBalanceToUpdate] = useState<BalanceWithTotals | null>(null);

	const handleBalanceUpdate = () => {
		onRefresh();
	};

	const handleDeleteBalance = async () => {
		if (!balanceToDelete) return;

		try {
			const { error } = await deleteBalance(balanceToDelete.id);

			if (error) {
				toast({
					variant: 'destructive',
					title: 'Error al eliminar saldo',
					description:
						translateError(error) || 'Hubo un problema al eliminar el saldo. Intente nuevamente.',
				});
				return;
			}

			// Refresh the list
			handleBalanceUpdate();

			toast({
				title: 'Saldo eliminado',
				description: 'El saldo se eliminó correctamente.',
			});

			// Notify parent to reload budgets
			if (onBalanceDeleted) {
				onBalanceDeleted();
			}
		} catch (error) {
			toast({
				variant: 'destructive',
				title: 'Error inesperado al eliminar saldo',
				description:
					translateError(error) ||
					'Ocurrió un error inesperado al eliminar el saldo. Intente nuevamente.',
			});
		} finally {
			setIsDeleteDialogOpen(false);
			setBalanceToDelete(null);
		}
	};

	const handleDollarUpdate = async (newUsdRate: number, newAmountArs: number) => {
		if (!balanceToUpdate) return;

		try {
			const response = await fetch('/api/dollar-rate', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					balanceId: balanceToUpdate.id,
					newUsdRate,
					newBalanceAmountARS: newAmountArs,
				}),
			});

			const result = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.error || 'Error al actualizar el tipo de cambio');
			}

			// Refresh the list
			handleBalanceUpdate();
		} catch (error) {
			console.error('Error al actualizar tipo de dólar:', error);
			throw error;
		}
	};

	const openDollarUpdateModal = (balance: BalanceWithTotals) => {
		setBalanceToUpdate(balance);
		setIsDollarUpdateModalOpen(true);
	};

	const openDetailsModal = (balance: BalanceWithTotals) => {
		setSelectedBalance(balance);
		setIsDetailsModalOpen(true);
	};

	const openDeleteDialog = (balance: BalanceWithTotals) => {
		setBalanceToDelete(balance);
		setIsDeleteDialogOpen(true);
	};

	return {
		// State
		selectedBalance,
		isDetailsModalOpen,
		setIsDetailsModalOpen,
		balanceToDelete,
		isDeleteDialogOpen,
		setIsDeleteDialogOpen,
		isDollarUpdateModalOpen,
		setIsDollarUpdateModalOpen,
		balanceToUpdate,

		// Handlers
		openDetailsModal,
		openDeleteDialog,
		openDollarUpdateModal,
		handleDeleteBalance,
		handleDollarUpdate,
		handleBalanceUpdate,
	};
}
