import { render, screen } from '@testing-library/react';
import { ReportsView } from '@/components/business/reports/reports-view';

jest.mock('@/components/business/reports/budgets/budgets-report', () => ({
	BudgetsReport: () => <div data-testid="budgets-report">Presupuestos report</div>,
}));

describe('ReportsView', () => {
	it('renders the header and only the budgets report', () => {
		render(<ReportsView />);
		expect(screen.getByText('Reportes y métricas')).toBeInTheDocument();
		expect(screen.getByTestId('budgets-report')).toBeInTheDocument();
	});

	it('does not render checking accounts content or an inner tab strip', () => {
		render(<ReportsView />);
		expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
		expect(screen.queryByText('Cuentas corrientes')).not.toBeInTheDocument();
		expect(screen.queryByText('A definir')).not.toBeInTheDocument();
		expect(screen.queryByText('TOTAL')).not.toBeInTheDocument();
	});
});
