import { render, screen } from '@testing-library/react';
import { StatsCardsBalances } from '@/components/business/balances/stats-cards-balances';

jest.mock('@/utils/formats-money', () => ({
	formatCurrency: (v: any) => `$${v || 0}`,
}));

jest.mock('@/constants/balances/balances-report', () => ({
	BALANCE_TYPES: {
		TOTAL: 'Total',
		DEBTOR: 'Deudores',
		CREDITOR: 'Acreedores',
	},
}));

describe('StatsCardsBalances', () => {
	it('renders all stat cards with correct labels', () => {
		render(
			<StatsCardsBalances
				stats={{
					totalDebtors: 50000,
					totalCreditors: 30000,
					debtorsCount: 3,
					creditorsCount: 2,
				}}
			/>
		);

		expect(screen.getByText('Total')).toBeInTheDocument();
		expect(screen.getByText('Deudores')).toBeInTheDocument();
		expect(screen.getByText('Acreedores')).toBeInTheDocument();
	});

	it('renders total count (debtors + creditors)', () => {
		render(
			<StatsCardsBalances
				stats={{
					totalDebtors: 50000,
					totalCreditors: 30000,
					debtorsCount: 3,
					creditorsCount: 2,
				}}
			/>
		);

		expect(screen.getByText('5')).toBeInTheDocument();
	});

	it('renders formatted debtor and creditor totals', () => {
		render(
			<StatsCardsBalances
				stats={{
					totalDebtors: 50000,
					totalCreditors: 30000,
					debtorsCount: 3,
					creditorsCount: 2,
				}}
			/>
		);

		expect(screen.getByText('$50000')).toBeInTheDocument();
		expect(screen.getByText('$30000')).toBeInTheDocument();
	});

	it('renders debtor and creditor counts', () => {
		render(
			<StatsCardsBalances
				stats={{
					totalDebtors: 50000,
					totalCreditors: 30000,
					debtorsCount: 3,
					creditorsCount: 2,
				}}
			/>
		);

		expect(screen.getByText('3 deudores, 2 acreedores')).toBeInTheDocument();
	});

	it('handles singular counts', () => {
		render(
			<StatsCardsBalances
				stats={{
					totalDebtors: 50000,
					totalCreditors: 30000,
					debtorsCount: 1,
					creditorsCount: 1,
				}}
			/>
		);

		expect(screen.getAllByText(/1 cliente/)).toHaveLength(2);
	});

	it('handles zero stats', () => {
		render(
			<StatsCardsBalances
				stats={{
					totalDebtors: 0,
					totalCreditors: 0,
					debtorsCount: 0,
					creditorsCount: 0,
				}}
			/>
		);

		expect(screen.getAllByText('$0')).toHaveLength(2);
		expect(screen.getByText('0 deudores, 0 acreedores')).toBeInTheDocument();
	});
});
