'use client';

import { useExpenses } from '@/hooks/expenses/use-expenses';
import { IncomeExpenseTab } from '@/components/business/cash-flow/income-expense-tab';

type ExpensesTabProps = {
	categoriesConfig: React.ReactNode;
};

export function ExpensesTab({ categoriesConfig }: ExpensesTabProps) {
	const state = useExpenses();
	return (
		<IncomeExpenseTab
			state={state}
			entityLabel="gasto"
			partyLabel="Proveedor"
			addLabel="Nuevo gasto"
			emptyLabel="No hay gastos registrados"
			categoriesConfig={categoriesConfig}
		/>
	);
}
