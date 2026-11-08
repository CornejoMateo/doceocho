'use client';

import { useEffect, useRef } from 'react';
import { FixedExpenseWithCategory } from '@/lib/fixed-expenses/fixed-expenses';
import { listCategories } from '@/lib/categories/categories';
import { useExpenses } from '@/hooks/expenses/use-expenses';
import { IncomeExpenseFormDialog } from '@/components/business/cash-flow/incomes-expenses/income-expense-form-dialog';
import { getLocalDate } from '@/utils/format-date';

type AddExpenseFromFixedExpenseDialogProps = {
	fixedExpense: FixedExpenseWithCategory;
	onClose: () => void;
	onExpenseCreated: (fixedExpenseId: number) => void;
};

export function AddExpenseFromFixedExpenseDialog({
	fixedExpense,
	onClose,
	onExpenseCreated,
}: AddExpenseFromFixedExpenseDialogProps) {
	const expensesState = useExpenses({ onCreated: () => onExpenseCreated(fixedExpense.id) });
	const hasOpenedRef = useRef(false);

	useEffect(() => {
		let active = true;
		// Categories kind='expense' is shared with Costos fijos; checked fresh in case it was deactivated.
		listCategories('expense').then(({ data }) => {
			if (!active) return;
			const categoryMatch = (data ?? []).some(
				(c) => c.id === fixedExpense.category_id && c.is_active
			);
			expensesState.handleAdd({
				date: getLocalDate(),
				description: fixedExpense.description,
				net_amount: fixedExpense.net_amount,
				iva_percent: fixedExpense.iva_percent,
				category_id: categoryMatch ? fixedExpense.category_id : null,
			});
		});
		return () => {
			active = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (expensesState.isFormOpen) {
			hasOpenedRef.current = true;
		} else if (hasOpenedRef.current) {
			onClose();
		}
	}, [expensesState.isFormOpen]);

	return (
		<IncomeExpenseFormDialog
			open={expensesState.isFormOpen}
			onOpenChange={expensesState.handleFormOpenChange}
			editingEntry={expensesState.editingEntry}
			entityLabel="gasto"
			partyLabel="Proveedor"
			categories={expensesState.categories}
			activeCategories={expensesState.activeCategories}
			voucherTypes={expensesState.voucherTypes}
			activeVoucherTypes={expensesState.activeVoucherTypes}
			works={expensesState.works}
			parties={expensesState.parties}
			paymentMethods={expensesState.paymentMethods}
			activePaymentMethods={expensesState.activePaymentMethods}
			bankAccounts={expensesState.bankAccounts}
			activeBankAccounts={expensesState.activeBankAccounts}
			date={expensesState.date}
			setDate={expensesState.setDate}
			voucherNumber={expensesState.voucherNumber}
			setVoucherNumber={expensesState.setVoucherNumber}
			voucherTypeId={expensesState.voucherTypeId}
			setVoucherTypeId={expensesState.setVoucherTypeId}
			workId={expensesState.workId}
			setWorkId={expensesState.setWorkId}
			partyId={expensesState.partyId}
			setPartyId={expensesState.setPartyId}
			categoryId={expensesState.categoryId}
			setCategoryId={expensesState.setCategoryId}
			description={expensesState.description}
			setDescription={expensesState.setDescription}
			netAmount={expensesState.netAmount}
			setNetAmount={expensesState.setNetAmount}
			ivaPercent={expensesState.ivaPercent}
			setIvaPercent={expensesState.setIvaPercent}
			totalAmount={expensesState.totalAmount}
			paymentMethodId={expensesState.paymentMethodId}
			setPaymentMethodId={expensesState.setPaymentMethodId}
			bankAccountId={expensesState.bankAccountId}
			setBankAccountId={expensesState.setBankAccountId}
			saving={expensesState.saving}
			onSubmit={expensesState.handleSubmit}
			errors={expensesState.errors}
			attachmentsKind="expense"
			stagedFiles={expensesState.stagedFiles}
			onStagedFilesChange={expensesState.setStagedFiles}
			descriptionMaxLength={expensesState.descriptionMaxLength}
		/>
	);
}
