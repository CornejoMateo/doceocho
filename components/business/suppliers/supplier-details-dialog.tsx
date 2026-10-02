'use client';

import { useRef, useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus } from 'lucide-react';
import { useSupplierAccountTotals } from '@/hooks/suppliers/use-supplier-account-totals';
import { useSupplierPaymentOptions } from '@/hooks/suppliers/use-supplier-payment-options';
import { useSupplierPurchasesTab } from '@/hooks/suppliers/use-supplier-purchases-tab';
import { usePurchasePayments } from '@/hooks/suppliers/use-purchase-payments';
import { usePurchasePaymentForms } from '@/hooks/suppliers/use-purchase-payment-forms';
import { useDeleteConfirmations } from '@/hooks/suppliers/use-delete-confirmations';
import { purchaseStatus } from '@/helpers/suppliers/suppliers';
import { type PurchaseStatus } from '@/constants/suppliers/suppliers';
import { SupplierAccountSummary } from '@/components/business/suppliers/supplier-account-summary';
import { SupplierDateFilter } from '@/components/business/suppliers/supplier-date-filter';
import { SupplierPurchasesList } from '@/components/business/suppliers/supplier-purchases-list';
import { PurchaseForm } from '@/components/business/suppliers/purchase-form';
import { PaymentForm } from '@/components/business/suppliers/payment-form';
import { DeletePurchaseDialog } from '@/components/business/suppliers/delete-purchase-dialog';
import { DeletePaymentDialog } from '@/components/business/suppliers/delete-payment-dialog';

export { purchaseStatus };
export type { PurchaseStatus };

type TabValue = 'pending' | 'paid';

interface SupplierDetailsDialogProps {
	supplierId: number | null;
	supplierName: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onClosed?: (changed: boolean) => void;
}

export function SupplierDetailsDialog({
	supplierId,
	supplierName,
	open,
	onOpenChange,
	onClosed,
}: SupplierDetailsDialogProps) {
	const [activeTab, setActiveTab] = useState<TabValue>('pending');
	const [expandedPurchaseIds, setExpandedPurchaseIds] = useState<Set<number>>(new Set());
	// Date-range filter (desde/hasta), applied to both tabs via the RPC.
	const [filterFrom, setFilterFrom] = useState('');
	const [filterTo, setFilterTo] = useState('');
	const dirtyRef = useRef(false);
	const markDirty = () => {
		dirtyRef.current = true;
	};

	const totals = useSupplierAccountTotals(supplierId, open);
	const paymentOptions = useSupplierPaymentOptions(open);
	const pendingTab = useSupplierPurchasesTab({
		supplierId,
		status: 'pending',
		from: filterFrom,
		to: filterTo,
		isCurrentTab: activeTab === 'pending',
	});
	const paidTab = useSupplierPurchasesTab({
		supplierId,
		status: 'paid',
		from: filterFrom,
		to: filterTo,
		isCurrentTab: activeTab === 'paid',
	});
	const purchasePayments = usePurchasePayments();

	const currentTab = activeTab === 'pending' ? pendingTab : paidTab;
	const otherTab = activeTab === 'pending' ? paidTab : pendingTab;

	// Refetches totals + the visible tab's list; the other tab lazily refetches next time it's entered.
	const refreshAfterMutation = async ({
		kind,
		purchaseId,
	}: {
		kind: 'purchase' | 'payment';
		purchaseId: number;
	}) => {
		const tasks: Promise<unknown>[] = [totals.fetchTotals(), currentTab.refetchFirstPage()];
		if (kind === 'payment') tasks.push(purchasePayments.loadPayments(purchaseId));
		otherTab.invalidate();
		await Promise.all(tasks);
	};

	const forms = usePurchasePaymentForms({
		supplierId,
		onSaved: refreshAfterMutation,
		onChanged: markDirty,
	});

	const dropExpandedPurchaseId = (purchaseId: number) => {
		setExpandedPurchaseIds((current) => {
			const next = new Set(current);
			next.delete(purchaseId);
			return next;
		});
	};

	const deleteConfirmations = useDeleteConfirmations({
		onSaved: refreshAfterMutation,
		dropExpandedPurchaseId,
		dropPurchasePayments: purchasePayments.dropPurchase,
		onChanged: markDirty,
	});

	const toggleExpanded = (purchaseId: number) => {
		setExpandedPurchaseIds((current) => {
			const next = new Set(current);
			if (next.has(purchaseId)) {
				next.delete(purchaseId);
			} else {
				next.add(purchaseId);
				purchasePayments.ensureLoaded(purchaseId);
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
			onClosed?.(dirtyRef.current);
			dirtyRef.current = false;
			totals.invalidateAndReset();
			pendingTab.reset();
			paidTab.reset();
			purchasePayments.resetAll();
			forms.resetOnClose();
			setExpandedPurchaseIds(new Set());
			clearFilters();
			setActiveTab('pending');
		}
	};

	const hasDateFilter = !!(filterFrom || filterTo);
	const { totals: accountTotals, loadingTotals } = totals;
	const noPurchasesAtAll =
		!!accountTotals && accountTotals.pendingCount === 0 && accountTotals.paidCount === 0;

	const renderTab = (status: TabValue, tab: typeof pendingTab) => (
		<SupplierPurchasesList
			status={status}
			purchases={tab.purchases}
			loading={tab.loading}
			loadingMore={tab.loadingMore}
			hasMore={tab.hasMore}
			onLoadMore={tab.loadMore}
			hasDateFilter={hasDateFilter}
			fileCounts={tab.fileCounts}
			expandedPurchaseIds={expandedPurchaseIds}
			onToggleExpand={toggleExpanded}
			paymentsByPurchaseId={purchasePayments.paymentsByPurchaseId}
			loadingPurchaseIds={purchasePayments.loadingPurchaseIds}
			errorByPurchaseId={purchasePayments.errorByPurchaseId}
			onRetryPayments={purchasePayments.loadPayments}
			bankAccountById={paymentOptions.bankAccountById}
			paymentMethodById={paymentOptions.paymentMethodById}
			paymentFileCounts={purchasePayments.paymentFileCounts}
			paymentFilesByPaymentId={purchasePayments.paymentFilesByPaymentId}
			onEditPurchase={forms.handleEditPurchase}
			onDeletePurchase={deleteConfirmations.setPurchaseToDelete}
			onNewPayment={forms.handleNewPayment}
			onEditPayment={forms.handleEditPayment}
			onDeletePayment={(purchase, payment) =>
				deleteConfirmations.setPaymentToDelete({ payment, purchase })
			}
			onPurchaseCountChange={tab.setFileCount}
			onPaymentCountChange={purchasePayments.setPaymentFileCount}
		/>
	);

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
							{loadingTotals && !accountTotals ? (
								<Card className="p-8 text-center text-muted-foreground">Cargando...</Card>
							) : !accountTotals ? (
								<Card className="p-8 text-center text-muted-foreground">
									No se pudo cargar la cuenta corriente.
								</Card>
							) : (
								<>
									<SupplierAccountSummary
										totalPurchasesArs={accountTotals.totalPurchasesArs}
										totalPaymentsArs={accountTotals.totalPaymentsArs}
										balanceArs={accountTotals.balanceArs}
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

									{noPurchasesAtAll ? (
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
									) : (
										<Tabs
											value={activeTab}
											onValueChange={(value) => setActiveTab(value as TabValue)}
										>
											<TabsList>
												<TabsTrigger value="pending">
													Pendientes ({accountTotals.pendingCount})
												</TabsTrigger>
												<TabsTrigger value="paid">Pagadas ({accountTotals.paidCount})</TabsTrigger>
											</TabsList>
											<TabsContent value="pending">{renderTab('pending', pendingTab)}</TabsContent>
											<TabsContent value="paid">{renderTab('paid', paidTab)}</TabsContent>
										</Tabs>
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
						onCancel={forms.cancelForm}
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
						activeBankAccounts={paymentOptions.activeBankAccounts}
						paymentMethodIdValue={forms.paymentMethodIdValue}
						onPaymentMethodChange={forms.setPaymentMethodIdValue}
						activePaymentMethods={paymentOptions.activePaymentMethods}
						paymentNotes={forms.paymentNotes}
						onNotesChange={forms.setPaymentNotes}
						isSubmitting={forms.isSubmittingPayment}
						stagedFiles={forms.stagedPaymentFiles}
						onStagedChange={forms.setStagedPaymentFiles}
						onSubmit={forms.handleSubmitPayment}
						onCancel={forms.cancelForm}
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
