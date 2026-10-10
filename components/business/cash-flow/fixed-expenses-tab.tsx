'use client';

import { useState } from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useFixedExpenses } from '@/hooks/fixed-expenses/use-fixed-expenses';
import { useFixedExpensePayments } from '@/hooks/fixed-expenses/use-fixed-expense-payments';
import { useFixedExpensePaymentDialog } from '@/hooks/fixed-expenses/use-fixed-expense-payment-dialog';
import { FixedExpensesList } from '@/components/business/cash-flow/fixed-expenses-list';
import { FixedExpensesSummary } from '@/components/business/cash-flow/fixed-expenses-summary';
import {
	FixedExpensePaymentsList,
	monthLabel,
} from '@/components/business/cash-flow/fixed-expense-payments-list';
import { FixedExpenseFormDialog } from '@/components/business/cash-flow/fixed-expense-form-dialog';
import { FixedExpensePaymentDialog } from '@/components/business/cash-flow/fixed-expense-payment-dialog';
import { FixedExpenseConfirmDialog } from '@/components/business/cash-flow/fixed-expense-confirm-dialog';
import { formatCurrency } from '@/utils/formats-money';

const INNER_TAB_OPTIONS = [
	{ value: 'expenses', label: 'Costos fijos' },
	{ value: 'payments', label: 'Pagos registrados' },
];

export function FixedExpensesTab() {
	const [innerTab, setInnerTab] = useState('expenses');

	const expensesState = useFixedExpenses();
	const paymentsState = useFixedExpensePayments(expensesState.categories);
	const paymentDialogState = useFixedExpensePaymentDialog(() =>
		Promise.all([expensesState.fetchExpenses(), paymentsState.fetchPayments(paymentsState.year)])
	);

	return (
		<div className="space-y-4 min-w-0">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div
					role="tablist"
					aria-label="Vista de costos fijos"
					className="inline-flex items-center gap-1 rounded-full bg-muted p-1"
				>
					{INNER_TAB_OPTIONS.map((option) => (
						<Button
							key={option.value}
							type="button"
							role="tab"
							aria-selected={innerTab === option.value}
							variant={innerTab === option.value ? 'default' : 'ghost'}
							size="sm"
							className="rounded-full px-4"
							onClick={() => setInnerTab(option.value)}
						>
							{option.label}
						</Button>
					))}
				</div>

				<Select
					value={String(paymentsState.year)}
					onValueChange={(value) => paymentsState.setYear(Number(value))}
				>
					<SelectTrigger className="w-28" aria-label="Año">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{paymentsState.yearOptions.map((option) => (
							<SelectItem key={option} value={String(option)}>
								{option}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<Tabs value={innerTab} onValueChange={setInnerTab} className="space-y-4">
				<TabsContent value="expenses" className="space-y-4 min-w-0">
					<div className="grid gap-6 lg:grid-cols-3">
						<div className="lg:col-span-2 min-w-0">
							<FixedExpensesList
								expenses={expensesState.visibleExpenses}
								loading={expensesState.loadingList}
								showInactive={expensesState.showInactive}
								onShowInactiveChange={expensesState.setShowInactive}
								onAdd={expensesState.handleAdd}
								onEdit={expensesState.handleEdit}
								onDeactivate={expensesState.setExpenseToDeactivate}
								onReactivate={expensesState.handleReactivate}
								actionLoading={expensesState.actionLoading}
								togglingId={paymentDialogState.togglingId}
								onTogglePaid={paymentDialogState.handleTogglePaid}
							/>
						</div>
						<div className="lg:col-span-1 min-w-0">
							<FixedExpensesSummary
								year={paymentsState.year}
								totals={paymentsState.paymentTotals}
								byMonth={paymentsState.paymentsByMonth}
								byCategory={paymentsState.paymentsByCategory}
								loading={paymentsState.loadingPayments}
								error={paymentsState.paymentsError}
								onRetry={() => paymentsState.fetchPayments(paymentsState.year)}
							/>
						</div>
					</div>
				</TabsContent>

				<TabsContent value="payments" className="min-w-0">
					<FixedExpensePaymentsList
						payments={paymentsState.payments}
						loading={paymentsState.loadingPayments}
						error={paymentsState.paymentsError}
						onRetry={() => paymentsState.fetchPayments(paymentsState.year)}
						year={paymentsState.year}
						onEdit={paymentDialogState.openEditPaymentDialog}
						onDelete={paymentDialogState.setPaymentToDelete}
					/>
				</TabsContent>
			</Tabs>

			<FixedExpenseFormDialog
				open={expensesState.isFormOpen}
				onOpenChange={expensesState.handleFormOpenChange}
				editingExpense={expensesState.editingExpense}
				activeCategories={expensesState.activeCategories}
				categoryId={expensesState.categoryId}
				setCategoryId={expensesState.setCategoryId}
				description={expensesState.description}
				setDescription={expensesState.setDescription}
				amount={expensesState.amount}
				setAmount={expensesState.setAmount}
				saving={expensesState.saving}
				onSubmit={expensesState.handleSubmit}
			/>

			<FixedExpenseConfirmDialog
				open={!!expensesState.expenseToDeactivate}
				onOpenChange={(open) => {
					if (!open && !expensesState.actionLoading) expensesState.setExpenseToDeactivate(null);
				}}
				title="¿Desactivar costo fijo?"
				description="El costo fijo dejará de aparecer en los listados activos. Podrás reactivarlo cuando quieras."
				confirmLabel="Desactivar"
				loadingLabel="Desactivando..."
				loading={expensesState.actionLoading}
				destructive
				onConfirm={expensesState.confirmDeactivate}
			/>

			<FixedExpensePaymentDialog
				open={!!paymentDialogState.expenseToPay || !!paymentDialogState.paymentToEdit}
				onOpenChange={paymentDialogState.handlePayDialogOpenChange}
				expenseToPay={paymentDialogState.expenseToPay}
				paymentToEdit={paymentDialogState.paymentToEdit}
				paymentMonth={paymentDialogState.paymentMonth}
				setPaymentMonth={paymentDialogState.setPaymentMonth}
				paymentDate={paymentDialogState.paymentDate}
				setPaymentDate={paymentDialogState.setPaymentDate}
				paymentNet={paymentDialogState.paymentNet}
				setPaymentNet={paymentDialogState.setPaymentNet}
				paymentIvaPercent={paymentDialogState.paymentIvaPercent}
				setPaymentIvaPercent={paymentDialogState.setPaymentIvaPercent}
				paymentTotal={paymentDialogState.paymentTotal}
				paymentMethodId={paymentDialogState.paymentMethodId}
				setPaymentMethodId={paymentDialogState.setPaymentMethodId}
				activePaymentMethods={paymentDialogState.activePaymentMethods}
				paymentBankAccountId={paymentDialogState.paymentBankAccountId}
				setPaymentBankAccountId={paymentDialogState.setPaymentBankAccountId}
				bankAccounts={paymentDialogState.bankAccounts}
				payingSaving={paymentDialogState.payingSaving}
				onSubmit={paymentDialogState.handleSubmitPayment}
			/>

			<FixedExpenseConfirmDialog
				open={!!paymentDialogState.paymentToDelete}
				onOpenChange={(open) => {
					if (!open && !paymentDialogState.deletingPayment)
						paymentDialogState.setPaymentToDelete(null);
				}}
				title="¿Eliminar pago?"
				description={
					paymentDialogState.paymentToDelete &&
					`Se eliminará el pago de ${paymentDialogState.paymentToDelete.description} de ${monthLabel(paymentDialogState.paymentToDelete.period)} ${paymentDialogState.paymentToDelete.period.slice(0, 4)} por ${formatCurrency(paymentDialogState.paymentToDelete.total_amount)}.`
				}
				confirmLabel="Eliminar"
				loadingLabel="Eliminando..."
				loading={paymentDialogState.deletingPayment}
				destructive
				onConfirm={paymentDialogState.confirmDeletePayment}
			/>

			<FixedExpenseConfirmDialog
				open={!!paymentDialogState.expenseToUnmark}
				onOpenChange={(open) => {
					if (!open && !paymentDialogState.unmarking) paymentDialogState.setExpenseToUnmark(null);
				}}
				title="¿Desmarcar como pagado?"
				description="Se eliminará el registro de pago del mes actual de este costo fijo."
				confirmLabel="Desmarcar"
				loadingLabel="Desmarcando..."
				loading={paymentDialogState.unmarking}
				onConfirm={paymentDialogState.confirmUnmark}
			/>
		</div>
	);
}
