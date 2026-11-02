import { render, screen } from '@testing-library/react';
import { SummaryKpis } from '@/components/business/cash-flow/summary/summary-kpis';
import { SummaryCards } from '@/helpers/cash-flow-stats/cash-flow-summary';

function cards(over: Partial<SummaryCards> = {}): SummaryCards {
	return {
		incomeNet: 1000,
		expenseNet: 400,
		expenseWithIva: 484,
		debe: 150,
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
		expect(screen.getByText('Gastos con IVA')).toBeInTheDocument();
		expect(screen.getByText(/^\$\s*484$/)).toBeInTheDocument();
		expect(screen.getByText('Debe')).toBeInTheDocument();
		expect(screen.getByText(/^\$\s*150$/)).toBeInTheDocument();
		expect(screen.getByText('Gastos con IVA menos pagos')).toBeInTheDocument();
		expect(screen.getByText('Cobros')).toBeInTheDocument();
		expect(screen.getByText('Pagos')).toBeInTheDocument();
		expect(screen.getByText('IVA del mes (crédito − débito)')).toBeInTheDocument();
	});

	it('highlights a positive debe as destructive (se debe)', () => {
		render(<SummaryKpis cards={cards({ debe: 200 })} />);
		const debeValue = screen.getByText(/^\$\s*200$/);
		expect(debeValue.className).toContain('text-destructive');
	});

	it('does not highlight debe as destructive when zero or negative', () => {
		render(<SummaryKpis cards={cards({ debe: 0 })} />);
		const debeValue = screen.getByText('$0');
		expect(debeValue.className).not.toContain('text-destructive');
	});

	it('does not highlight a negative debe as destructive', () => {
		render(<SummaryKpis cards={cards({ debe: -200 })} />);
		const debeValue = screen.getByText(/^-\$\s*200$/);
		expect(debeValue.className).not.toContain('text-destructive');
	});
});
