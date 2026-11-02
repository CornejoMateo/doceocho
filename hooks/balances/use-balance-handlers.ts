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

	const handleBalanceUpdate = () => {
		onRefresh();
	};

	const handleDeleteBalance = async () => {
		if (!balanceToDelete) return;

		const loadingToast = toast({
			title: 'Eliminando cuenta corriente...',
			description: 'Se están eliminando los archivos asociados. Esto puede tardar unos momentos.',
		});

		try {
			const { error } = await deleteBalance(balanceToDelete.id);

			if (error) {
				loadingToast.update({
					variant: 'destructive',
					title: 'Error al eliminar la cuenta corriente',
					description:
						translateError(error) ||
						'Hubo un problema al eliminar la cuenta corriente. Intente nuevamente.',
				} as any);
				return;
			}

			// Refresh the list
			handleBalanceUpdate();

			loadingToast.update({
				title: 'Cuenta corriente eliminada',
				description: 'La cuenta corriente se eliminó correctamente.',
			} as any);

			// Notify parent to reload budgets
			if (onBalanceDeleted) {
				onBalanceDeleted();
			}
		} catch (error) {
			loadingToast.update({
				variant: 'destructive',
				title: 'Error inesperado al eliminar la cuenta corriente',
				description:
					translateError(error) ||
					'Ocurrió un error inesperado al eliminar la cuenta corriente. Intente nuevamente.',
			} as any);
		} finally {
			setIsDeleteDialogOpen(false);
			setBalanceToDelete(null);
		}
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

		// Handlers
		openDetailsModal,
		openDeleteDialog,
		handleDeleteBalance,
		handleBalanceUpdate,
	};
}
