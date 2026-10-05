import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatCurrency } from '@/utils/formats-money';
import { formatShortDate } from '@/utils/format-date';
import type { PurchaseSupplierWithBalance } from '@/lib/suppliers/purchases-suppliers';

interface DeletePurchaseDialogProps {
	purchaseToDelete: PurchaseSupplierWithBalance | null;
	deleting: boolean;
	onCancel: () => void;
	onConfirm: () => void;
}

export function DeletePurchaseDialog({
	purchaseToDelete,
	deleting,
	onCancel,
	onConfirm,
}: DeletePurchaseDialogProps) {
	return (
		<AlertDialog
			open={!!purchaseToDelete}
			onOpenChange={(nextOpen) => {
				if (!nextOpen && !deleting) onCancel();
			}}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>¿Eliminar compra?</AlertDialogTitle>
					<AlertDialogDescription>
						Esta acción no se puede deshacer. Se eliminará permanentemente la compra por{' '}
						<span className="font-semibold">
							{purchaseToDelete ? formatCurrency(purchaseToDelete.amount_ars) : ''}
						</span>{' '}
						del {purchaseToDelete ? formatShortDate(purchaseToDelete.created_at) : ''}, junto con
						sus archivos y pagos asociados.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
					<AlertDialogAction
						onClick={(e) => {
							e.preventDefault();
							onConfirm();
						}}
						disabled={deleting}
						className="bg-destructive text-destructive-foreground"
					>
						{deleting ? 'Eliminando...' : 'Eliminar'}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
