import { render, screen } from '@testing-library/react';
import { CashBoxSummaryCard } from '@/components/business/cash-flow/cash-box-summary-card';

const mockSummary = {
	id: 1,
	opening_balance: 100000,
	total_income: 50000,
	total_expense: 20000,
	current_balance: 130000,
	closing_balance: null,
	is_closed: false,
	transaction_count: 5,
};

describe('CashBoxSummaryCard', () => {
	it('renders the four labels', () => {
		render(<CashBoxSummaryCard summary={mockSummary} />);

		expect(screen.getByText('Saldo Inicial')).toBeInTheDocument();
		expect(screen.getByText('Total Ingresos')).toBeInTheDocument();
		expect(screen.getByText('Total Egresos')).toBeInTheDocument();
		expect(screen.getByText('Saldo Actual')).toBeInTheDocument();
	});

	it('renders each formatted amount in its corresponding card', () => {
		render(<CashBoxSummaryCard summary={mockSummary} />);

		expect(screen.getByText('$ 100.000')).toBeInTheDocument();
		expect(screen.getByText('$ 50.000')).toBeInTheDocument();
		expect(screen.getByText('$ 20.000')).toBeInTheDocument();
		expect(screen.getByText('$ 130.000')).toBeInTheDocument();
	});

	it('renders correctly with zero values', () => {
		render(
			<CashBoxSummaryCard
				summary={{
					...mockSummary,
					opening_balance: 0,
					total_income: 0,
					total_expense: 0,
					current_balance: 0,
				}}
			/>
		);

		expect(screen.getAllByText('$0')).toHaveLength(4);
	});

	it('renders correctly with a negative current balance', () => {
		render(<CashBoxSummaryCard summary={{ ...mockSummary, current_balance: -5000 }} />);

		expect(screen.getByText('-$ 5.000')).toBeInTheDocument();
	});
});
