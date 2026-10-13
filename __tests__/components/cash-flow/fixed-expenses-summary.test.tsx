import { render, screen, fireEvent, within } from '@testing-library/react';
import { FixedExpensesSummary } from '@/components/business/cash-flow/fixed-expenses-summary';

const TOTALS = { net: 1000, iva: 210, total: 1210, count: 2, average: 605 };
const BY_MONTH = Array.from({ length: 12 }, (_, month) => ({ month, net: 0, iva: 0, total: 0 }));
const BY_CATEGORY = [{ categoryId: 1, categoryName: 'Alquiler', net: 1000 }];

describe('FixedExpensesSummary', () => {
	it('renders the automatic summary totals for the given payments', () => {
		render(
			<FixedExpensesSummary
				year={2026}
				totals={TOTALS}
				byMonth={BY_MONTH}
				byCategory={BY_CATEGORY}
				loading={false}
				error={null}
				onRetry={jest.fn()}
			/>
		);

		const stats = within(screen.getByTestId('fixed-expenses-summary-stats'));
		expect(stats.getByText('$ 1.000')).toBeInTheDocument();
		expect(stats.getByText('$ 210')).toBeInTheDocument();
		expect(stats.getByText('$ 1.210')).toBeInTheDocument();
		expect(stats.getByText('$ 605')).toBeInTheDocument();
		expect(stats.getByText('2')).toBeInTheDocument();
		expect(screen.getByText('Alquiler')).toBeInTheDocument();
	});

	it('shows a retry alert instead of the totals when loading failed', () => {
		const onRetry = jest.fn();
		render(
			<FixedExpensesSummary
				year={2026}
				totals={TOTALS}
				byMonth={BY_MONTH}
				byCategory={BY_CATEGORY}
				loading={false}
				error="No se pudo cargar"
				onRetry={onRetry}
			/>
		);

		expect(screen.getByText('No se pudo cargar')).toBeInTheDocument();
		expect(screen.queryByText('Resumen automático')).not.toBeInTheDocument();

		fireEvent.click(screen.getByText('Reintentar'));

		expect(onRetry).toHaveBeenCalled();
	});
});
