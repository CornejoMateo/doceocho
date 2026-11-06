import { render, screen, within } from '@testing-library/react';
import { FixedExpensesSummary } from '@/components/business/cash-flow/fixed-expenses/fixed-expenses-summary';

const TOTALS = { net: 1000, iva: 210, total: 1210, count: 2, average: 605 };
const BY_CATEGORY = [{ categoryId: 1, categoryName: 'Alquiler', net: 1000 }];

describe('FixedExpensesSummary', () => {
	it('renders the automatic summary totals for the active fixed expenses', () => {
		render(<FixedExpensesSummary totals={TOTALS} byCategory={BY_CATEGORY} />);

		const stats = within(screen.getByTestId('fixed-expenses-summary-stats'));
		expect(stats.getByText('$ 1.000')).toBeInTheDocument();
		expect(stats.getByText('$ 210')).toBeInTheDocument();
		expect(stats.getByText('$ 1.210')).toBeInTheDocument();
		expect(stats.getByText('$ 605')).toBeInTheDocument();
		expect(stats.getByText('2')).toBeInTheDocument();
		expect(screen.getByText('Alquiler')).toBeInTheDocument();
	});

	it('shows the empty-categories message when there are no categories to show', () => {
		render(<FixedExpensesSummary totals={TOTALS} byCategory={[]} />);

		expect(screen.getByText('No hay categorías de costos fijos')).toBeInTheDocument();
	});
});
