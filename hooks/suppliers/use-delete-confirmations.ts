import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';
import type { PurchaseSupplierWithPayments } from '@/lib/suppliers/account-summary';
import { deletePurchaseSupplier } from '@/lib/suppliers/purchases-suppliers';
import { deletePaymentSupplier, type PaymentSupplier } from '@/lib/suppliers/payments-suppliers';

interface UseDeleteConfirmationsArgs {
	fetchDetail: () => Promise<void>;
	dropExpandedPurchaseId: (purchaseId: number) => void;
}

export function useDeleteConfirmations({
	fetchDetail,
	dropExpandedPurchaseId,
}: UseDeleteConfirmationsArgs) {
	const { toast } = useToast();

	const [purchaseToDelete, setPurchaseToDelete] = useState<PurchaseSupplierWithPayments | null>(
		null
	);
	const [deletingPurchase, setDeletingPurchase] = useState(false);

	const [paymentToDelete, setPaymentToDelete] = useState<{
		payment: PaymentSupplier;
		purchase: PurchaseSupplierWithPayments;
	} | null>(null);
	const [deletingPayment, setDeletingPayment] = useState(false);

	const confirmDeletePurchase = async () => {
		if (!purchaseToDelete) return;
		const purchaseId = purchaseToDelete.id;
		setDeletingPurchase(true);
		try {
			const { error, orphanedPaths } = await deletePurchaseSupplier(purchaseId);
			if (error) throw error;
			toast({ title: 'Compra eliminada' });
			if (orphanedPaths && orphanedPaths.length > 0) {
				toast({
					title: 'Archivos pendientes de limpieza',
					description:
						'La compra se eliminó, pero algunos archivos no se pudieron borrar del almacenamiento.',
				});
			}
			dropExpandedPurchaseId(purchaseId);
			await fetchDetail();
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
		setDeletingPayment(true);
		try {
			const { error, orphanedPaths } = await deletePaymentSupplier(paymentId);
			if (error) throw error;
			toast({ title: 'Pago eliminado' });
			if (orphanedPaths && orphanedPaths.length > 0) {
				toast({
					title: 'Archivos pendientes de limpieza',
					description:
						'El pago se eliminó, pero algunos archivos no se pudieron borrar del almacenamiento.',
				});
			}
			await fetchDetail();
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
