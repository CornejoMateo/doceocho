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
import { formatDateOnly } from '@/utils/format-date';
import type { SupplierExpenseListItem } from '@/lib/suppliers/supplier-expenses';

interface DeletePurchaseDialogProps {
	purchaseToDelete: SupplierExpenseListItem | null;
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
							{purchaseToDelete ? formatCurrency(purchaseToDelete.total_amount) : ''}
						</span>{' '}
						del {purchaseToDelete ? formatDateOnly(purchaseToDelete.date) : ''}, junto con sus pagos
						y archivos adjuntos asociados.
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
