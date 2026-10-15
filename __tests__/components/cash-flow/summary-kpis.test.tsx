import { render, screen } from '@testing-library/react';
import { SummaryKpis } from '@/components/business/cash-flow/summary/summary-kpis';
import { SummaryCards } from '@/helpers/cash-flow-stats/cash-flow-summary';

function cards(over: Partial<SummaryCards> = {}): SummaryCards {
	return {
		incomeNet: 1000,
		expenseNet: 400,
		margin: 600,
		profitability: 0.6,
		collections: 300,
		payments: 100,
		ivaOfMonth: 50,
		...over,
	};
}

describe('SummaryKpis', () => {
	it('renders the 7 KPI cards with formatted values', () => {
		render(<SummaryKpis cards={cards()} />);

		expect(screen.getByText('Ingresos')).toBeInTheDocument();
		expect(screen.getByText(/^\$\s*1\.000$/)).toBeInTheDocument();
		expect(screen.getByText('Gastos')).toBeInTheDocument();
		expect(screen.getByText(/^\$\s*400$/)).toBeInTheDocument();
		expect(screen.getByText('Margen')).toBeInTheDocument();
		expect(screen.getByText(/^\$\s*600$/)).toBeInTheDocument();
		expect(screen.getByText('Rentabilidad')).toBeInTheDocument();
		expect(screen.getByText('60%')).toBeInTheDocument();
		expect(screen.getByText('Cobros')).toBeInTheDocument();
		expect(screen.getByText('Pagos')).toBeInTheDocument();
		expect(screen.getByText('IVA del mes (crédito − débito)')).toBeInTheDocument();
	});

	it('highlights a negative margin as destructive', () => {
		render(<SummaryKpis cards={cards({ margin: -200 })} />);
		const marginValue = screen.getByText(/-\$\s*200/);
		expect(marginValue.className).toContain('text-destructive');
	});

	it('shows 0.0% profitability without dividing by zero when income is 0', () => {
		render(<SummaryKpis cards={cards({ incomeNet: 0, profitability: 0 })} />);
		expect(screen.getByText('0.00%')).toBeInTheDocument();
	});
});
