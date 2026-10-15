'use client';

import { useIncomes } from '@/hooks/incomes/use-incomes';
import { IncomeExpenseTab } from '@/components/business/cash-flow/incomes-expenses/income-expense-tab';

type IncomesTabProps = {
	categoriesConfig: React.ReactNode;
};

export function IncomesTab({ categoriesConfig }: IncomesTabProps) {
	const state = useIncomes();
	return (
		<IncomeExpenseTab
			state={state}
			entityLabel="ingreso"
			partyLabel="Cliente"
			addLabel="Nuevo ingreso"
			emptyLabel="No hay ingresos registrados"
			categoriesConfig={categoriesConfig}
		/>
	);
}
