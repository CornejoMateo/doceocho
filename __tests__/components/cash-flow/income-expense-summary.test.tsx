import { render, screen } from '@testing-library/react';
import { IncomeExpenseSummary } from '@/components/business/cash-flow/incomes-expenses/income-expense-summary';
import { formatCurrency } from '@/utils/formats-money';

const money = (n: number) => formatCurrency(n).replace(/\u00A0/g, ' ');

describe('IncomeExpenseSummary', () => {
	it('renders every total formatted as currency and the count as a plain number', () => {
		render(
			<IncomeExpenseSummary
				totalNet={1000}
				totalIva={210}
				totalGross={1210}
				count={2}
				average={605}
			/>
		);

		expect(screen.getByText('Total neto')).toBeInTheDocument();
		expect(screen.getByText(money(1000))).toBeInTheDocument();
		expect(screen.getByText(money(210))).toBeInTheDocument();
		expect(screen.getByText(money(1210))).toBeInTheDocument();
		expect(screen.getByText(money(605))).toBeInTheDocument();
		expect(screen.getByText('2')).toBeInTheDocument();
	});

	it('shows $0 totals and a count of 0 when there are no entries', () => {
		render(<IncomeExpenseSummary totalNet={0} totalIva={0} totalGross={0} count={0} average={0} />);

		expect(screen.getAllByText('$0')).toHaveLength(4);
		expect(screen.getByText('0')).toBeInTheDocument();
	});
});
