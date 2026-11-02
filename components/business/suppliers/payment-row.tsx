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
import { formatDateOnly } from '@/utils/format-date';
import { pluralArchivos } from '@/helpers/attachments/attachments';
import type { PaymentWithDetails } from '@/lib/payments/payments';
import type { BankAccount } from '@/lib/cash-flow/cash-flow';
import type { PaymentMethod } from '@/lib/payment-methods/payment-methods';
import type { CashFlowCategory } from '@/lib/categories/categories';
import type { FilePayment } from '@/lib/payments/files-payments';
import { AttachmentsGallery } from '@/components/business/shared/attachments/attachments-gallery';

interface PaymentRowProps {
	payment: PaymentWithDetails;
	bankAccountById: Map<number, BankAccount>;
	paymentMethodById: Map<number, PaymentMethod>;
	categoryById: Map<number, CashFlowCategory>;
	fileCount: number;
	preloadedFiles?: FilePayment[];
	onEdit: () => void;
	onDelete: () => void;
	onCountChange: (count: number) => void;
}

export function PaymentRow({
	payment,
	bankAccountById,
	paymentMethodById,
	categoryById,
	fileCount,
	preloadedFiles,
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
						<p className="font-medium">{formatCurrency(payment.amount)}</p>
						<p className="text-xs text-muted-foreground">
							{formatDateOnly(payment.date)}
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
						{(payment.receipt_number || payment.category_id) && (
							<p className="line-clamp-2 break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
								{[
									payment.receipt_number ? `N° ${payment.receipt_number}` : null,
									payment.category_id
										? (categoryById.get(payment.category_id)?.name ?? 'Categoría eliminada')
										: null,
								]
									.filter((part): part is string => !!part)
									.join(' · ')}
							</p>
						)}
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
				<AttachmentsGallery
					kind="payment"
					entityId={payment.id}
					preloadedFiles={preloadedFiles}
					onCountChange={onCountChange}
				/>
			</div>
		</li>
	);
}
