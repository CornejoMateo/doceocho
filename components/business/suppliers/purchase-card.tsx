import { EditOnly } from '@/components/permissions/edit-scope';
import { useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, ChevronRight, Edit, MoreVertical, Plus, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/utils/formats-money';
import { formatDateOnly } from '@/utils/format-date';
import { purchaseStatus } from '@/helpers/suppliers/suppliers';
import { pluralArchivos } from '@/helpers/attachments/attachments';
import { purchaseStatusBadgeClassName, purchaseStatusLabel } from '@/constants/suppliers/suppliers';
import type { SupplierExpenseListItem } from '@/lib/suppliers/supplier-expenses';
import type { PaymentWithDetails } from '@/lib/payments/payments';
import type { BankAccount } from '@/lib/cash-flow/cash-flow';
import type { PaymentMethod } from '@/lib/payment-methods/payment-methods';
import type { CashFlowCategory } from '@/lib/categories/categories';
import type { FilePayment } from '@/lib/payments/files-payments';
import { AttachmentsGallery } from '@/components/business/shared/attachments/attachments-gallery';
import { PaymentRow } from '@/components/business/suppliers/payment-row';

const purchaseProgressPct = (purchase: SupplierExpenseListItem) =>
	purchase.total_amount > 0
		? Math.min(100, Math.max(0, (purchase.totalPaidArs / purchase.total_amount) * 100))
		: 100;

// voucher number, category and obra, in that order, skipping any that are null.
const purchaseMetaLine = (purchase: SupplierExpenseListItem): string =>
	[
		purchase.voucher_number ? `N° ${purchase.voucher_number}` : null,
		purchase.category_name,
		purchase.work_name,
	]
		.filter((part): part is string => !!part)
		.join(' · ');

interface PurchaseCardProps {
	purchase: SupplierExpenseListItem;
	expanded: boolean;
	onToggleExpand: () => void;
	purchaseFileCount: number;
	payments: PaymentWithDetails[] | undefined;
	paymentsLoading: boolean;
	paymentsError: any;
	onRetryPayments: () => void;
	bankAccountById: Map<number, BankAccount>;
	paymentMethodById: Map<number, PaymentMethod>;
	paymentCategoryById: Map<number, CashFlowCategory>;
	paymentFileCounts: Map<number, number>;
	paymentFilesByPaymentId: Map<number, FilePayment[]>;
	onEditPurchase: () => void;
	onDeletePurchase: () => void;
	onNewPayment: () => void;
	onEditPayment: (payment: PaymentWithDetails) => void;
	onDeletePayment: (payment: PaymentWithDetails) => void;
	onPurchaseCountChange: (count: number) => void;
	onPaymentCountChange: (paymentId: number, count: number) => void;
}

export function PurchaseCard({
	purchase,
	expanded,
	onToggleExpand,
	purchaseFileCount,
	payments,
	paymentsLoading,
	paymentsError,
	onRetryPayments,
	bankAccountById,
	paymentMethodById,
	paymentCategoryById,
	paymentFileCounts,
	paymentFilesByPaymentId,
	onEditPurchase,
	onDeletePurchase,
	onNewPayment,
	onEditPayment,
	onDeletePayment,
	onPurchaseCountChange,
	onPaymentCountChange,
}: PurchaseCardProps) {
	const status = purchaseStatus(purchase);
	const panelId = `purchase-${purchase.id}-panel`;
	const deleteRafRef = useRef<number | null>(null);
	useEffect(() => {
		return () => {
			if (deleteRafRef.current !== null) cancelAnimationFrame(deleteRafRef.current);
		};
	}, []);

	return (
		<Card data-purchase-id={purchase.id} className="min-w-0 gap-0 overflow-hidden p-0">
			<div className="flex items-start gap-1 p-3">
				<button
					type="button"
					onClick={onToggleExpand}
					aria-expanded={expanded}
					aria-controls={panelId}
					aria-label={expanded ? 'Ocultar detalle de la compra' : 'Mostrar detalle de la compra'}
					className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground sm:min-h-7 sm:min-w-7"
				>
					{expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
				</button>

				<div className="min-w-0 flex-1 space-y-2">
					<div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
						<div className="min-w-0">
							<p className="text-xs text-muted-foreground">
								{formatDateOnly(purchase.date)}
								{purchaseFileCount > 0 && ` · ${pluralArchivos(purchaseFileCount)}`}
							</p>
							{purchase.description && (
								<p className="line-clamp-2 break-words text-sm font-medium [overflow-wrap:anywhere]">
									{purchase.description}
								</p>
							)}
							{purchaseMetaLine(purchase) && (
								<p className="line-clamp-2 break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
									{purchaseMetaLine(purchase)}
								</p>
							)}
						</div>
						<div className="flex shrink-0 items-center gap-2">
							<div className="text-right">
								<p className="font-semibold">{formatCurrency(purchase.total_amount)}</p>
								<Badge className={purchaseStatusBadgeClassName[status]}>
									{purchaseStatusLabel[status]}
								</Badge>
							</div>
							<EditOnly edit="cash-flow.suppliers">
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											className="min-h-11 min-w-11 shrink-0 sm:min-h-9 sm:min-w-9"
											aria-label="Más acciones de la compra"
										>
											<MoreVertical className="h-4 w-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuItem
											aria-label="Editar compra"
											className="min-h-11 sm:min-h-9"
											onSelect={onEditPurchase}
										>
											<Edit className="h-4 w-4" />
											Editar
										</DropdownMenuItem>
										<DropdownMenuItem
											aria-label="Eliminar compra"
											variant="destructive"
											className="min-h-11 sm:min-h-9"
											onSelect={() => {
												deleteRafRef.current = requestAnimationFrame(onDeletePurchase);
											}}
										>
											<Trash2 className="h-4 w-4" />
											Eliminar
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</EditOnly>
						</div>
					</div>

					<div className="space-y-1">
						<div className="h-2 w-full overflow-hidden rounded-full bg-muted">
							<div
								className={`h-full rounded-full ${
									status === 'pagada' || status === 'a-favor'
										? 'bg-green-500'
										: status === 'parcial'
											? 'bg-amber-500'
											: 'bg-destructive'
								}`}
								style={{ width: `${purchaseProgressPct(purchase)}%` }}
							/>
						</div>
						<p className="text-xs text-muted-foreground">
							Pagado {formatCurrency(purchase.totalPaidArs)} de{' '}
							{formatCurrency(purchase.total_amount)} · Deuda {formatCurrency(purchase.balanceArs)}
						</p>
					</div>
				</div>
			</div>

			{expanded && (
				<div id={panelId} className="space-y-4 border-t border-border bg-muted/30 p-3">
					<div className="space-y-1.5">
						<p className="text-xs font-medium text-muted-foreground">Comprobantes de compra</p>
						<AttachmentsGallery
							kind="expense"
							entityId={purchase.id}
							onCountChange={onPurchaseCountChange}
							editKey="cash-flow.suppliers"
						/>
					</div>

					<div className="space-y-2">
						<p className="text-sm font-medium">Pagos{payments ? ` (${payments.length})` : ''}</p>

						{paymentsLoading ? (
							<p className="text-xs text-muted-foreground">Cargando pagos...</p>
						) : paymentsError ? (
							<div className="space-y-2">
								<p className="text-xs text-destructive">No se pudieron cargar los pagos.</p>
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="min-h-11 sm:min-h-9"
									onClick={onRetryPayments}
								>
									Reintentar
								</Button>
							</div>
						) : !payments || payments.length === 0 ? (
							<p className="text-xs text-muted-foreground">Sin pagos registrados.</p>
						) : (
							<ol className="space-y-2 border-l-2 border-border pl-5">
								{payments.map((payment) => (
									<PaymentRow
										key={payment.id}
										payment={payment}
										bankAccountById={bankAccountById}
										paymentMethodById={paymentMethodById}
										categoryById={paymentCategoryById}
										fileCount={paymentFileCounts.get(payment.id) ?? 0}
										preloadedFiles={paymentFilesByPaymentId.get(payment.id)}
										onEdit={() => onEditPayment(payment)}
										onDelete={() => onDeletePayment(payment)}
										onCountChange={(count) => onPaymentCountChange(payment.id, count)}
									/>
								))}
							</ol>
						)}

						<EditOnly edit="cash-flow.suppliers">
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="min-h-11 gap-2 sm:min-h-9"
								onClick={onNewPayment}
							>
								<Plus className="h-4 w-4" />
								Registrar pago
							</Button>
						</EditOnly>
					</div>
				</div>
			)}
		</Card>
	);
}
