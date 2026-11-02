'use client';

import { useEffect, useRef } from 'react';
import { IncomeExpenseEntry } from '@/hooks/income-expense/use-income-expense-tab';
import { buildExpenseOptionLabel, usePayments } from '@/hooks/payments/use-payments';
import { CollectionPaymentFormDialog } from '@/components/business/cash-flow/collections-payments/collection-payment-form-dialog';

type AddPaymentFromExpenseDialogProps = {
	expense: IncomeExpenseEntry;
	onClose: () => void;
};

export function AddPaymentFromExpenseDialog({
	expense,
	onClose,
}: AddPaymentFromExpenseDialogProps) {
	const paymentsState = usePayments();
	const hasOpenedRef = useRef(false);

	useEffect(() => {
		paymentsState.handleAdd({
			amount: expense.total_amount,
			work_id: expense.work_id,
			description: expense.description,
			payment_method_id: expense.payment_method_id,
			bank_account_id: expense.bank_account_id,
			receipt_number: expense.voucher_number,
			expense_id: expense.id,
			expense_label: buildExpenseOptionLabel({
				date: expense.date,
				voucher_number: expense.voucher_number,
				description: expense.description,
				total_amount: expense.total_amount,
			}),
		});
	}, []);

	useEffect(() => {
		if (paymentsState.isFormOpen) {
			hasOpenedRef.current = true;
		} else if (hasOpenedRef.current) {
			onClose();
		}
	}, [paymentsState.isFormOpen]);

	return (
		<CollectionPaymentFormDialog
			open={paymentsState.isFormOpen}
			onOpenChange={paymentsState.handleFormOpenChange}
			editingEntry={paymentsState.editingEntry}
			entityLabel="pago"
			partyLabel="Proveedor"
			hideParty
			categories={paymentsState.categories}
			activeCategories={paymentsState.activeCategories}
			works={paymentsState.works}
			parties={paymentsState.parties}
			paymentMethods={paymentsState.paymentMethods}
			activePaymentMethods={paymentsState.activePaymentMethods}
			bankAccounts={paymentsState.bankAccounts}
			activeBankAccounts={paymentsState.activeBankAccounts}
			date={paymentsState.date}
			setDate={paymentsState.setDate}
			receiptNumber={paymentsState.receiptNumber}
			setReceiptNumber={paymentsState.setReceiptNumber}
			workId={paymentsState.workId}
			setWorkId={paymentsState.setWorkId}
			partyId={paymentsState.partyId}
			setPartyId={paymentsState.setPartyId}
			categoryId={paymentsState.categoryId}
			setCategoryId={paymentsState.setCategoryId}
			description={paymentsState.description}
			setDescription={paymentsState.setDescription}
			amount={paymentsState.amount}
			setAmount={paymentsState.setAmount}
			paymentMethodId={paymentsState.paymentMethodId}
			setPaymentMethodId={paymentsState.setPaymentMethodId}
			paymentMethodOptional={paymentsState.paymentMethodOptional}
			bankAccountId={paymentsState.bankAccountId}
			setBankAccountId={paymentsState.setBankAccountId}
			saving={paymentsState.saving}
			onSubmit={paymentsState.handleSubmit}
			errors={paymentsState.errors}
			partyOptional={paymentsState.partyOptional}
			linkedLabel={paymentsState.linkedLabel}
			purchaseId={paymentsState.purchaseId}
			setPurchaseId={paymentsState.setPurchaseId}
			purchases={paymentsState.purchases}
			purchasesLoading={paymentsState.purchasesLoading}
			descriptionMaxLength={paymentsState.descriptionMaxLength}
			supportsExpenseLink={paymentsState.supportsExpenseLink}
			expenseId={paymentsState.expenseId}
			setExpenseId={paymentsState.setExpenseId}
			expenseOptions={paymentsState.expenseOptions}
			expenseOptionsLoading={paymentsState.expenseOptionsLoading}
			attachmentsKind="payment"
			stagedFiles={paymentsState.stagedFiles}
			onStagedFilesChange={paymentsState.setStagedFiles}
		/>
	);
}
