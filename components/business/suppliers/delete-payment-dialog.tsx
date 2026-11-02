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
import type { PaymentWithDetails } from '@/lib/payments/payments';

interface DeletePaymentDialogProps {
	paymentToDelete: { payment: PaymentWithDetails; purchase: SupplierExpenseListItem } | null;
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
							{paymentToDelete ? formatCurrency(paymentToDelete.payment.amount) : ''}
						</span>{' '}
						del {paymentToDelete ? formatDateOnly(paymentToDelete.payment.date) : ''} junto con sus
						archivos adjuntos.
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
