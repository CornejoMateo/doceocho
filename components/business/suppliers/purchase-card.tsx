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
import { formatShortDate } from '@/utils/format-date';
import { purchaseStatus, pluralArchivos } from '@/helpers/suppliers/suppliers';
import { purchaseStatusBadgeClassName, purchaseStatusLabel } from '@/constants/suppliers/suppliers';
import type { PurchaseSupplierWithBalance } from '@/lib/suppliers/purchases-suppliers';
import type { PaymentSupplier } from '@/lib/suppliers/payments-suppliers';
import type { BankAccount } from '@/lib/cash-flow/cash-flow';
import type { PaymentMethod } from '@/lib/payment-methods/payment-methods';
import type { FilePaymentSupplier } from '@/lib/suppliers/files-payments-suppliers';
import { SupplierAttachmentsGallery } from '@/components/business/suppliers/supplier-attachments-gallery';
import { PaymentRow } from '@/components/business/suppliers/payment-row';

const purchaseProgressPct = (purchase: PurchaseSupplierWithBalance) =>
	Math.min(100, Math.max(0, (purchase.totalPaidArs / purchase.amount_ars) * 100));

interface PurchaseCardProps {
	purchase: PurchaseSupplierWithBalance;
	expanded: boolean;
	onToggleExpand: () => void;
	purchaseFileCount: number;
	payments: PaymentSupplier[] | undefined;
	paymentsLoading: boolean;
	paymentsError: any;
	onRetryPayments: () => void;
	bankAccountById: Map<number, BankAccount>;
	paymentMethodById: Map<number, PaymentMethod>;
	paymentFileCounts: Map<number, number>;
	paymentFilesByPaymentId: Map<number, FilePaymentSupplier[]>;
	onEditPurchase: () => void;
	onDeletePurchase: () => void;
	onNewPayment: () => void;
	onEditPayment: (payment: PaymentSupplier) => void;
	onDeletePayment: (payment: PaymentSupplier) => void;
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
		<Card data-purchase-id={purchase.id} className="gap-0 overflow-hidden p-0">
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
								{formatShortDate(purchase.created_at)}
								{purchaseFileCount > 0 && ` · ${pluralArchivos(purchaseFileCount)}`}
							</p>
							{purchase.notes && <p className="truncate text-sm font-medium">{purchase.notes}</p>}
						</div>
						<div className="flex shrink-0 items-center gap-2">
							<div className="text-right">
								<p className="font-semibold">{formatCurrency(purchase.amount_ars)}</p>
								<Badge className={purchaseStatusBadgeClassName[status]}>
									{purchaseStatusLabel[status]}
								</Badge>
							</div>
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
							{formatCurrency(purchase.amount_ars)} · Deuda {formatCurrency(purchase.balanceArs)}
						</p>
					</div>
				</div>
			</div>

			{expanded && (
				<div id={panelId} className="space-y-4 border-t border-border bg-muted/30 p-3">
					<div className="space-y-1.5">
						<p className="text-xs font-medium text-muted-foreground">Comprobantes de compra</p>
						<SupplierAttachmentsGallery
							kind="purchase"
							entityId={purchase.id}
							onCountChange={onPurchaseCountChange}
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
										fileCount={paymentFileCounts.get(payment.id) ?? 0}
										preloadedFiles={paymentFilesByPaymentId.get(payment.id)}
										onEdit={() => onEditPayment(payment)}
										onDelete={() => onDeletePayment(payment)}
										onCountChange={(count) => onPaymentCountChange(payment.id, count)}
									/>
								))}
							</ol>
						)}

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
					</div>
				</div>
			)}
		</Card>
	);
}
