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
import type { PaymentSupplier } from '@/lib/suppliers/payments-suppliers';

interface DeletePaymentDialogProps {
	paymentToDelete: { payment: PaymentSupplier; purchase: PurchaseSupplierWithBalance } | null;
	deleting: boolean;
	onCancel: () => void;
	onConfirm: () => void;
}

export function DeletePaymentDialog({
	paymentToDelete,
	deleting,
	onCancel,
	onConfirm,
}: DeletePaymentDialogProps) {
	return (
		<AlertDialog
			open={!!paymentToDelete}
			onOpenChange={(nextOpen) => {
				if (!nextOpen && !deleting) onCancel();
			}}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>¿Eliminar pago?</AlertDialogTitle>
					<AlertDialogDescription>
						Esta acción no se puede deshacer. Se eliminará permanentemente el pago por{' '}
						<span className="font-semibold">
							{paymentToDelete ? formatCurrency(paymentToDelete.payment.amount_ars) : ''}
						</span>{' '}
						del {paymentToDelete ? formatShortDate(paymentToDelete.payment.created_at) : ''} junto
						con sus archivos adjuntos.
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
