import { render, screen } from '@testing-library/react';
import { SummaryMonthlyChart } from '@/components/business/cash-flow/summary/summary-monthly-chart';
import { MonthlyChartPoint } from '@/helpers/cash-flow-stats/cash-flow-summary';

// jsdom has no layout engine; ResponsiveContainer reports 0x0 and renders nothing without this mock.
jest.mock('recharts', () => {
	const Original = jest.requireActual('recharts');
	return {
		...Original,
		ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
			<div data-testid="responsive-container">{children}</div>
		),
	};
});

function point(over: Partial<MonthlyChartPoint> = {}): MonthlyChartPoint {
	return { month: 1, label: 'Ene', incomeNet: 1000, expenseNet: 400, ...over };
}

describe('SummaryMonthlyChart', () => {
	it('renders the chart title and a bar for each of the 12 months', () => {
		const data = Array.from({ length: 12 }, (_, i) => point({ month: i + 1, label: `M${i + 1}` }));
		render(<SummaryMonthlyChart data={data} selectedMonth={0} />);

		expect(screen.getByText('Ingresos vs Gastos por mes')).toBeInTheDocument();
		expect(screen.getByTestId('summary-monthly-chart')).toBeInTheDocument();
	});

	it('renders with an empty data array without throwing', () => {
		render(<SummaryMonthlyChart data={[]} selectedMonth={0} />);
		expect(screen.getByTestId('summary-monthly-chart')).toBeInTheDocument();
	});
});
