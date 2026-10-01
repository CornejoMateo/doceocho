import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Edit, MoreVertical, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/utils/formats-money';
import { formatShortDate } from '@/utils/format-date';
import { pluralArchivos } from '@/lib/suppliers/purchase-status';
import type { PaymentSupplier } from '@/lib/suppliers/payments-suppliers';
import type { BankAccount } from '@/lib/cash-flow/cash-flow';
import type { PaymentMethod } from '@/lib/payment-methods/payment-methods';
import { SupplierAttachmentsGallery } from '@/components/business/suppliers/supplier-attachments-gallery';

interface PaymentRowProps {
	payment: PaymentSupplier;
	bankAccountById: Map<number, BankAccount>;
	paymentMethodById: Map<number, PaymentMethod>;
	fileCount: number;
	onEdit: () => void;
	onDelete: () => void;
	onCountChange: (count: number) => void;
}

export function PaymentRow({
	payment,
	bankAccountById,
	paymentMethodById,
	fileCount,
	onEdit,
	onDelete,
	onCountChange,
}: PaymentRowProps) {
	const deleteRafRef = useRef<number | null>(null);
	useEffect(() => {
		return () => {
			if (deleteRafRef.current !== null) cancelAnimationFrame(deleteRafRef.current);
		};
	}, []);

	return (
		<li data-payment-id={payment.id} className="relative">
			<span
				aria-hidden="true"
				className="absolute -left-5 top-3 h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-background bg-muted-foreground/50"
			/>
			<div className="space-y-1.5 rounded-md bg-muted/50 p-2">
				<div className="flex flex-wrap items-start justify-between gap-2">
					<div className="min-w-0 text-sm">
						<p className="font-medium">{formatCurrency(payment.amount_ars)}</p>
						<p className="text-xs text-muted-foreground">
							{formatShortDate(payment.created_at)}
							{' · '}
							{payment.bank_account_id
								? (bankAccountById.get(payment.bank_account_id)?.name ?? 'Cuenta eliminada')
								: 'Sin cuenta'}
							{' · '}
							{payment.payment_method_id
								? (paymentMethodById.get(payment.payment_method_id)?.name ?? 'Método eliminado')
								: 'Sin método'}
							{fileCount > 0 && ` · ${pluralArchivos(fileCount)}`}
						</p>
					</div>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="min-h-11 min-w-11 shrink-0 sm:min-h-9 sm:min-w-9"
								aria-label="Más acciones del pago"
							>
								<MoreVertical className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem
								aria-label="Editar pago"
								className="min-h-11 sm:min-h-9"
								onSelect={onEdit}
							>
								<Edit className="h-4 w-4" />
								Editar
							</DropdownMenuItem>
							<DropdownMenuItem
								aria-label="Eliminar pago"
								variant="destructive"
								className="min-h-11 sm:min-h-9"
								onSelect={() => {
									deleteRafRef.current = requestAnimationFrame(onDelete);
								}}
							>
								<Trash2 className="h-4 w-4" />
								Eliminar
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
				<SupplierAttachmentsGallery
					kind="payment"
					entityId={payment.id}
					onCountChange={onCountChange}
				/>
			</div>
		</li>
	);
}
