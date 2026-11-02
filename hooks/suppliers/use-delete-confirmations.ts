import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';
import { deleteExpense } from '@/lib/expenses/expenses';
import { deletePayment, type PaymentWithDetails } from '@/lib/payments/payments';
import type { SupplierExpenseListItem } from '@/lib/suppliers/supplier-expenses';

type MutationContext = { kind: 'purchase' | 'payment'; purchaseId: number };

interface UseDeleteConfirmationsArgs {
	onSaved: (ctx: MutationContext) => void | Promise<void>;
	dropExpandedPurchaseId: (purchaseId: number) => void;
	dropPurchasePayments: (purchaseId: number) => void;
	onChanged?: () => void;
}

export function useDeleteConfirmations({
	onSaved,
	dropExpandedPurchaseId,
	dropPurchasePayments,
	onChanged,
}: UseDeleteConfirmationsArgs) {
	const { toast } = useToast();

	const [purchaseToDelete, setPurchaseToDelete] = useState<SupplierExpenseListItem | null>(null);
	const [deletingPurchase, setDeletingPurchase] = useState(false);

	const [paymentToDelete, setPaymentToDelete] = useState<{
		payment: PaymentWithDetails;
		purchase: SupplierExpenseListItem;
	} | null>(null);
	const [deletingPayment, setDeletingPayment] = useState(false);

	const confirmDeletePurchase = async () => {
		if (!purchaseToDelete) return;
		const purchaseId = purchaseToDelete.id;
		setDeletingPurchase(true);
		try {
			const { error, orphanedPaths } = await deleteExpense(purchaseId);
			if (error) throw error;
			toast({ title: 'Compra eliminada' });
			onChanged?.();
			if (orphanedPaths && orphanedPaths.length > 0) {
				toast({
					title: 'Archivos pendientes de limpieza',
					description:
						'La compra se eliminó, pero algunos archivos no se pudieron borrar del almacenamiento.',
				});
			}
			dropExpandedPurchaseId(purchaseId);
			dropPurchasePayments(purchaseId);
			await onSaved({ kind: 'purchase', purchaseId });
		} catch (error) {
			toast({
				title: 'Error',
				description: translateError(error) || 'No se pudo eliminar la compra.',
				variant: 'destructive',
			});
		} finally {
			setDeletingPurchase(false);
			setPurchaseToDelete(null);
		}
	};

	const confirmDeletePayment = async () => {
		if (!paymentToDelete) return;
		const paymentId = paymentToDelete.payment.id;
		const purchaseId = paymentToDelete.purchase.id;
		setDeletingPayment(true);
		try {
			const { error, orphanedPaths } = await deletePayment(paymentId);
			if (error) throw error;
			toast({ title: 'Pago eliminado' });
			onChanged?.();
			if (orphanedPaths && orphanedPaths.length > 0) {
				toast({
					title: 'Archivos pendientes de limpieza',
					description:
						'El pago se eliminó, pero algunos archivos no se pudieron borrar del almacenamiento.',
				});
			}
			await onSaved({ kind: 'payment', purchaseId });
		} catch (error) {
			toast({
				title: 'Error',
				description: translateError(error) || 'No se pudo eliminar el pago.',
				variant: 'destructive',
			});
		} finally {
			setDeletingPayment(false);
			setPaymentToDelete(null);
		}
	};

	return {
		purchaseToDelete,
		setPurchaseToDelete,
		deletingPurchase,
		paymentToDelete,
		setPaymentToDelete,
		deletingPayment,
		confirmDeletePurchase,
		confirmDeletePayment,
	};
}
