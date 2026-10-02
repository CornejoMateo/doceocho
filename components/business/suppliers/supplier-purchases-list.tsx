import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { PurchaseCard } from '@/components/business/suppliers/purchase-card';
import type {
	PurchaseSupplierWithBalance,
	SupplierPurchaseStatus,
} from '@/lib/suppliers/purchases-suppliers';
import type { PaymentSupplier } from '@/lib/suppliers/payments-suppliers';
import type { BankAccount } from '@/lib/cash-flow/cash-flow';
import type { PaymentMethod } from '@/lib/payment-methods/payment-methods';
import type { FilePaymentSupplier } from '@/lib/suppliers/files-payments-suppliers';

const emptyTabMessage: Record<SupplierPurchaseStatus, string> = {
	pending: 'No hay compras pendientes.',
	paid: 'Todavía no hay compras pagadas.',
};

interface SupplierPurchasesListProps {
	status: SupplierPurchaseStatus;
	purchases: PurchaseSupplierWithBalance[];
	loading: boolean;
	loadingMore: boolean;
	hasMore: boolean;
	onLoadMore: () => void;
	hasDateFilter: boolean;
	fileCounts: Map<number, number>;
	expandedPurchaseIds: Set<number>;
	onToggleExpand: (purchaseId: number) => void;
	paymentsByPurchaseId: Map<number, PaymentSupplier[]>;
	loadingPurchaseIds: Set<number>;
	errorByPurchaseId: Map<number, any>;
	onRetryPayments: (purchaseId: number) => void;
	bankAccountById: Map<number, BankAccount>;
	paymentMethodById: Map<number, PaymentMethod>;
	paymentFileCounts: Map<number, number>;
	paymentFilesByPaymentId: Map<number, FilePaymentSupplier[]>;
	onEditPurchase: (purchase: PurchaseSupplierWithBalance) => void;
	onDeletePurchase: (purchase: PurchaseSupplierWithBalance) => void;
	onNewPayment: (purchase: PurchaseSupplierWithBalance) => void;
	onEditPayment: (purchase: PurchaseSupplierWithBalance, payment: PaymentSupplier) => void;
	onDeletePayment: (purchase: PurchaseSupplierWithBalance, payment: PaymentSupplier) => void;
	onPurchaseCountChange: (purchaseId: number, count: number) => void;
	onPaymentCountChange: (paymentId: number, count: number) => void;
}

export function SupplierPurchasesList({
	status,
	purchases,
	loading,
	loadingMore,
	hasMore,
	onLoadMore,
	hasDateFilter,
	fileCounts,
	expandedPurchaseIds,
	onToggleExpand,
	paymentsByPurchaseId,
	loadingPurchaseIds,
	errorByPurchaseId,
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
}: SupplierPurchasesListProps) {
	if (loading && purchases.length === 0) {
		return <Card className="p-8 text-center text-muted-foreground">Cargando...</Card>;
	}

	if (purchases.length === 0) {
		return (
			<Card className="p-6 text-center text-sm text-muted-foreground">
				{hasDateFilter
					? 'No hay compras en el rango de fechas seleccionado.'
					: emptyTabMessage[status]}
			</Card>
		);
	}

	return (
		<div className="space-y-3">
			{purchases.map((purchase) => (
				<PurchaseCard
					key={purchase.id}
					purchase={purchase}
					expanded={expandedPurchaseIds.has(purchase.id)}
					onToggleExpand={() => onToggleExpand(purchase.id)}
					purchaseFileCount={fileCounts.get(purchase.id) ?? 0}
					payments={paymentsByPurchaseId.get(purchase.id)}
					paymentsLoading={loadingPurchaseIds.has(purchase.id)}
					paymentsError={errorByPurchaseId.get(purchase.id) ?? null}
					onRetryPayments={() => onRetryPayments(purchase.id)}
					bankAccountById={bankAccountById}
					paymentMethodById={paymentMethodById}
					paymentFileCounts={paymentFileCounts}
					paymentFilesByPaymentId={paymentFilesByPaymentId}
					onEditPurchase={() => onEditPurchase(purchase)}
					onDeletePurchase={() => onDeletePurchase(purchase)}
					onNewPayment={() => onNewPayment(purchase)}
					onEditPayment={(payment) => onEditPayment(purchase, payment)}
					onDeletePayment={(payment) => onDeletePayment(purchase, payment)}
					onPurchaseCountChange={(count) => onPurchaseCountChange(purchase.id, count)}
					onPaymentCountChange={onPaymentCountChange}
				/>
			))}
			{hasMore && (
				<div className="flex justify-center">
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="min-h-11 gap-2 sm:min-h-9"
						disabled={loadingMore}
						onClick={onLoadMore}
					>
						{loadingMore && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
						Cargar más
					</Button>
				</div>
			)}
		</div>
	);
}
