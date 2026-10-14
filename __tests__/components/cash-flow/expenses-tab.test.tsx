import { render, screen } from '@testing-library/react';
import { ExpensesTab } from '@/components/business/cash-flow/expenses-tab';
import { useExpenses } from '@/hooks/expenses/use-expenses';

jest.mock('@/hooks/expenses/use-expenses', () => ({
	useExpenses: jest.fn(),
}));

jest.mock('@/components/business/cash-flow/income-expense-tab', () => ({
	IncomeExpenseTab: ({
		state,
		entityLabel,
		partyLabel,
		addLabel,
		emptyLabel,
		categoriesConfig,
	}: any) => (
		<div>
			<span data-testid="entity-label">{entityLabel}</span>
			<span data-testid="party-label">{partyLabel}</span>
			<span data-testid="add-label">{addLabel}</span>
			<span data-testid="empty-label">{emptyLabel}</span>
			<span data-testid="year">{state.year}</span>
			{categoriesConfig}
		</div>
	),
}));

describe('ExpensesTab', () => {
	it('wires useExpenses state and expense-specific labels into IncomeExpenseTab', () => {
		(useExpenses as jest.Mock).mockReturnValue({ year: 2026 });

		render(<ExpensesTab categoriesConfig={<button>Configurar categorías</button>} />);

		expect(screen.getByTestId('entity-label')).toHaveTextContent('gasto');
		expect(screen.getByTestId('party-label')).toHaveTextContent('Proveedor');
		expect(screen.getByTestId('add-label')).toHaveTextContent('Nuevo gasto');
		expect(screen.getByTestId('empty-label')).toHaveTextContent('No hay gastos registrados');
		expect(screen.getByTestId('year')).toHaveTextContent('2026');
		expect(screen.getByText('Configurar categorías')).toBeInTheDocument();
	});
});
