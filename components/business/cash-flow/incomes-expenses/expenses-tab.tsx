'use client';

import { useState } from 'react';
import { useExpenses } from '@/hooks/expenses/use-expenses';
import { IncomeExpenseEntry } from '@/hooks/income-expense/use-income-expense-tab';
import { IncomeExpenseTab } from '@/components/business/cash-flow/incomes-expenses/income-expense-tab';
import { AddPaymentFromExpenseDialog } from '@/components/business/cash-flow/incomes-expenses/add-payment-from-expense-dialog';

type ExpensesTabProps = {
	categoriesConfig: React.ReactNode;
};

export function ExpensesTab({ categoriesConfig }: ExpensesTabProps) {
	const state = useExpenses();
	const [expenseForPayment, setExpenseForPayment] = useState<IncomeExpenseEntry | null>(null);

	return (
		<>
			<IncomeExpenseTab
				state={state}
				entityLabel="gasto"
				partyLabel="Proveedor"
				addLabel="Nuevo gasto"
				emptyLabel="No hay gastos registrados"
				categoriesConfig={categoriesConfig}
				onAddPayment={setExpenseForPayment}
				cascadeDeleteWarning
				attachmentsKind="expense"
			/>

			{expenseForPayment && (
				<AddPaymentFromExpenseDialog
					key={expenseForPayment.id}
					expense={expenseForPayment}
					onClose={() => setExpenseForPayment(null)}
				/>
			)}
		</>
	);
}
