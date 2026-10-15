import { render, screen } from '@testing-library/react';
import { CollectionPaymentSummary } from '@/components/business/cash-flow/collections-payments/collection-payment-summary';
import { formatCurrency } from '@/utils/formats-money';

const money = (n: number) => formatCurrency(n).replace(/\u00A0/g, ' ');

describe('CollectionPaymentSummary', () => {
	it('renders total, count, average and max formatted as currency where applicable', () => {
		render(<CollectionPaymentSummary total={3000} count={3} average={1000} max={2000} />);

		expect(screen.getByText('Total')).toBeInTheDocument();
		expect(screen.getByText(money(3000))).toBeInTheDocument();
		expect(screen.getByText('Cantidad')).toBeInTheDocument();
		expect(screen.getByText('3')).toBeInTheDocument();
		expect(screen.getByText('Promedio')).toBeInTheDocument();
		expect(screen.getByText(money(1000))).toBeInTheDocument();
		expect(screen.getByText('Mayor')).toBeInTheDocument();
		expect(screen.getByText(money(2000))).toBeInTheDocument();
	});

	it('shows $0 totals and a count of 0 when there are no entries', () => {
		render(<CollectionPaymentSummary total={0} count={0} average={0} max={0} />);

		expect(screen.getAllByText('$0')).toHaveLength(3);
		expect(screen.getByText('0')).toBeInTheDocument();
	});
});
