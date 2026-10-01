'use client';

import { useMemo, useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { useSupplierAccountDetail } from '@/hooks/suppliers/use-supplier-account-detail';
import { usePurchasePaymentForms } from '@/hooks/suppliers/use-purchase-payment-forms';
import { useDeleteConfirmations } from '@/hooks/suppliers/use-delete-confirmations';
import { inDateRange, purchaseStatus } from '@/helpers/suppliers/suppliers';
import { type PurchaseStatus } from '@/constants/suppliers/suppliers';
import { SupplierAccountSummary } from '@/components/business/suppliers/supplier-account-summary';
import { SupplierDateFilter } from '@/components/business/suppliers/supplier-date-filter';
import { PurchaseCard } from '@/components/business/suppliers/purchase-card';
import { PurchaseForm } from '@/components/business/suppliers/purchase-form';
import { PaymentForm } from '@/components/business/suppliers/payment-form';
import { DeletePurchaseDialog } from '@/components/business/suppliers/delete-purchase-dialog';
import { DeletePaymentDialog } from '@/components/business/suppliers/delete-payment-dialog';

export { purchaseStatus, inDateRange };
export type { PurchaseStatus };

interface SupplierDetailsDialogProps {
	supplierId: number | null;
	supplierName: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function SupplierDetailsDialog({
	supplierId,
	supplierName,
	open,
	onOpenChange,
}: SupplierDetailsDialogProps) {
	const [expandedPurchaseIds, setExpandedPurchaseIds] = useState<Set<number>>(new Set());
	// Date-range filter (desde/hasta), applied to the purchases list and each purchase's payments.
	const [filterFrom, setFilterFrom] = useState('');
	const [filterTo, setFilterTo] = useState('');

	const accountDetail = useSupplierAccountDetail(supplierId, open);
	const forms = usePurchasePaymentForms({ supplierId, fetchDetail: accountDetail.fetchDetail });

	const dropExpandedPurchaseId = (purchaseId: number) => {
		setExpandedPurchaseIds((current) => {
			const next = new Set(current);
			next.delete(purchaseId);
			return next;
		});
	};

	const deleteConfirmations = useDeleteConfirmations({
		fetchDetail: accountDetail.fetchDetail,
		dropExpandedPurchaseId,
	});

	const filteredPurchases = useMemo(() => {
		if (!accountDetail.detail) return [];
		return accountDetail.detail.purchases.filter((purchase) =>
			inDateRange(purchase.created_at, filterFrom, filterTo)
		);
	}, [accountDetail.detail, filterFrom, filterTo]);

	const toggleExpanded = (purchaseId: number) => {
		setExpandedPurchaseIds((current) => {
			const next = new Set(current);
			if (next.has(purchaseId)) {
				next.delete(purchaseId);
			} else {
				next.add(purchaseId);
			}
			return next;
		});
	};

	const clearFilters = () => {
		setFilterFrom('');
		setFilterTo('');
	};

	const handleOpenChange = (nextOpen: boolean) => {
		onOpenChange(nextOpen);
		if (!nextOpen) {
			accountDetail.invalidateAndReset();
			forms.resetOnClose();
			setExpandedPurchaseIds(new Set());
			clearFilters();
		}
	};

	const { detail, loadingDetail } = accountDetail;

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
				{forms.view === 'detail' && (
					<>
						<DialogHeader>
							<DialogTitle>{supplierName}</DialogTitle>
							<DialogDescription>Cuenta corriente del proveedor</DialogDescription>
						</DialogHeader>

						<div className="space-y-4">
							{loadingDetail ? (
								<Card className="p-8 text-center text-muted-foreground">Cargando...</Card>
							) : !detail ? (
								<Card className="p-8 text-center text-muted-foreground">
									No se pudo cargar la cuenta corriente.
								</Card>
							) : (
								<>
									<SupplierAccountSummary
										totalPurchasesArs={detail.totalPurchasesArs}
										totalPaymentsArs={detail.totalPaymentsArs}
										balanceArs={detail.balanceArs}
									/>

									<div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end md:justify-between">
										<SupplierDateFilter
											filterFrom={filterFrom}
											filterTo={filterTo}
											onFilterFromChange={setFilterFrom}
											onFilterToChange={setFilterTo}
											onClear={clearFilters}
										/>
										<Button
											size="sm"
											className="min-h-11 gap-2 sm:min-h-9"
											onClick={forms.handleNewPurchase}
										>
											<Plus className="h-4 w-4" />
											Nueva compra
										</Button>
									</div>

									{detail.purchases.length === 0 ? (
										<Card className="space-y-3 p-6 text-center text-sm text-muted-foreground">
											<p>Este proveedor no tiene compras registradas.</p>
											<Button
												size="sm"
												className="min-h-11 gap-2 sm:min-h-9"
												onClick={forms.handleNewPurchase}
											>
												<Plus className="h-4 w-4" />
												Registrar primera compra
											</Button>
										</Card>
									) : filteredPurchases.length === 0 ? (
										<Card className="space-y-3 p-6 text-center text-sm text-muted-foreground">
											<p>No hay compras en el rango de fechas seleccionado.</p>
											<Button
												type="button"
												variant="outline"
												size="sm"
												className="min-h-11 sm:min-h-9"
												onClick={clearFilters}
											>
												Limpiar filtro
											</Button>
										</Card>
									) : (
										<div className="space-y-3">
											{filteredPurchases.map((purchase) => (
												<PurchaseCard
													key={purchase.id}
													purchase={purchase}
													expanded={expandedPurchaseIds.has(purchase.id)}
													onToggleExpand={() => toggleExpanded(purchase.id)}
													purchaseFileCount={accountDetail.purchaseFileCounts.get(purchase.id) ?? 0}
													visiblePayments={purchase.payments.filter((payment) =>
														inDateRange(payment.created_at, filterFrom, filterTo)
													)}
													bankAccountById={accountDetail.bankAccountById}
													paymentMethodById={accountDetail.paymentMethodById}
													paymentFileCounts={accountDetail.paymentFileCounts}
													onEditPurchase={() => forms.handleEditPurchase(purchase)}
													onDeletePurchase={() => deleteConfirmations.setPurchaseToDelete(purchase)}
													onNewPayment={() => forms.handleNewPayment(purchase)}
													onEditPayment={(payment) => forms.handleEditPayment(purchase, payment)}
													onDeletePayment={(payment) =>
														deleteConfirmations.setPaymentToDelete({ payment, purchase })
													}
													onPurchaseCountChange={(count) =>
														accountDetail.setPurchaseFileCount(purchase.id, count)
													}
													onPaymentCountChange={(paymentId, count) =>
														accountDetail.setPaymentFileCount(paymentId, count)
													}
												/>
											))}
										</div>
									)}
								</>
							)}
						</div>
					</>
				)}

				{forms.view === 'purchase-form' && (
					<PurchaseForm
						editingPurchase={forms.editingPurchase}
						supplierName={supplierName}
						purchaseAmount={forms.purchaseAmount}
						onAmountChange={forms.setPurchaseAmount}
						purchaseNotes={forms.purchaseNotes}
						onNotesChange={forms.setPurchaseNotes}
						isSubmitting={forms.isSubmittingPurchase}
						stagedFiles={forms.stagedPurchaseFiles}
						onStagedChange={forms.setStagedPurchaseFiles}
						onSubmit={forms.handleSubmitPurchase}
						onCancel={() => void forms.returnToDetail()}
					/>
				)}

				{forms.view === 'payment-form' && (
					<PaymentForm
						editingPayment={forms.editingPayment}
						activePurchaseForPayment={forms.activePurchaseForPayment}
						paymentAmount={forms.paymentAmount}
						onAmountChange={forms.setPaymentAmount}
						remainingPurchaseBalance={forms.remainingPurchaseBalance}
						paymentExceedsBalance={forms.paymentExceedsBalance}
						paymentBankAccountId={forms.paymentBankAccountId}
						onBankAccountChange={forms.setPaymentBankAccountId}
						activeBankAccounts={accountDetail.activeBankAccounts}
						paymentMethodIdValue={forms.paymentMethodIdValue}
						onPaymentMethodChange={forms.setPaymentMethodIdValue}
						activePaymentMethods={accountDetail.activePaymentMethods}
						paymentNotes={forms.paymentNotes}
						onNotesChange={forms.setPaymentNotes}
						isSubmitting={forms.isSubmittingPayment}
						stagedFiles={forms.stagedPaymentFiles}
						onStagedChange={forms.setStagedPaymentFiles}
						onSubmit={forms.handleSubmitPayment}
						onCancel={() => void forms.returnToDetail()}
					/>
				)}

				<DeletePurchaseDialog
					purchaseToDelete={deleteConfirmations.purchaseToDelete}
					deleting={deleteConfirmations.deletingPurchase}
					onCancel={() => deleteConfirmations.setPurchaseToDelete(null)}
					onConfirm={() => void deleteConfirmations.confirmDeletePurchase()}
				/>

				<DeletePaymentDialog
					paymentToDelete={deleteConfirmations.paymentToDelete}
					deleting={deleteConfirmations.deletingPayment}
					onCancel={() => deleteConfirmations.setPaymentToDelete(null)}
					onConfirm={() => void deleteConfirmations.confirmDeletePayment()}
				/>
			</DialogContent>
		</Dialog>
	);
}
