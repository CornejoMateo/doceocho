import { render, screen } from '@testing-library/react';
import { IncomesTab } from '@/components/business/cash-flow/incomes-expenses/incomes-tab';
import { useIncomes } from '@/hooks/incomes/use-incomes';

jest.mock('@/hooks/incomes/use-incomes', () => ({
	useIncomes: jest.fn(),
}));

jest.mock('@/components/business/cash-flow/incomes-expenses/income-expense-tab', () => ({
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

describe('IncomesTab', () => {
	it('wires useIncomes state and income-specific labels into IncomeExpenseTab', () => {
		(useIncomes as jest.Mock).mockReturnValue({ year: 2026 });

		render(<IncomesTab categoriesConfig={<button>Configurar categorías</button>} />);

		expect(screen.getByTestId('entity-label')).toHaveTextContent('ingreso');
		expect(screen.getByTestId('party-label')).toHaveTextContent('Cliente');
		expect(screen.getByTestId('add-label')).toHaveTextContent('Nuevo ingreso');
		expect(screen.getByTestId('empty-label')).toHaveTextContent('No hay ingresos registrados');
		expect(screen.getByTestId('year')).toHaveTextContent('2026');
		expect(screen.getByText('Configurar categorías')).toBeInTheDocument();
	});
});
