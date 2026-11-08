'use client';

import { useState } from 'react';
import { FixedExpenseWithCategory } from '@/lib/fixed-expenses/fixed-expenses';
import { useFixedExpenses } from '@/hooks/fixed-expenses/use-fixed-expenses';
import { FixedExpensesList } from '@/components/business/cash-flow/fixed-expenses/fixed-expenses-list';
import { FixedExpensesSummary } from '@/components/business/cash-flow/fixed-expenses/fixed-expenses-summary';
import { FixedExpenseFormDialog } from '@/components/business/cash-flow/fixed-expenses/fixed-expense-form-dialog';
import { FixedExpenseConfirmDialog } from '@/components/business/cash-flow/fixed-expenses/fixed-expense-confirm-dialog';
import { AddExpenseFromFixedExpenseDialog } from '@/components/business/cash-flow/fixed-expenses/add-expense-from-fixed-expense-dialog';

export function FixedExpensesTab() {
	const [fixedExpenseForExpense, setFixedExpenseForExpense] =
		useState<FixedExpenseWithCategory | null>(null);

	const expensesState = useFixedExpenses();

	return (
		<div className="space-y-4 min-w-0">
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
						onAddExpense={setFixedExpenseForExpense}
						actionLoading={expensesState.actionLoading}
					/>
				</div>
				<div className="lg:col-span-1 min-w-0">
					<FixedExpensesSummary
						totals={expensesState.expenseTotals}
						byCategory={expensesState.expensesByCategory}
					/>
				</div>
			</div>

			<FixedExpenseFormDialog
				open={expensesState.isFormOpen}
				onOpenChange={expensesState.handleFormOpenChange}
				editingExpense={expensesState.editingExpense}
				activeCategories={expensesState.activeCategories}
				categoryId={expensesState.categoryId}
				setCategoryId={expensesState.setCategoryId}
				description={expensesState.description}
				setDescription={expensesState.setDescription}
				netAmount={expensesState.netAmount}
				setNetAmount={expensesState.setNetAmount}
				ivaPercent={expensesState.ivaPercent}
				setIvaPercent={expensesState.setIvaPercent}
				totalAmount={expensesState.totalAmount}
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

			{fixedExpenseForExpense && (
				<AddExpenseFromFixedExpenseDialog
					key={fixedExpenseForExpense.id}
					fixedExpense={fixedExpenseForExpense}
					onClose={() => setFixedExpenseForExpense(null)}
					onExpenseCreated={expensesState.markExpenseCreated}
				/>
			)}
		</div>
	);
}
