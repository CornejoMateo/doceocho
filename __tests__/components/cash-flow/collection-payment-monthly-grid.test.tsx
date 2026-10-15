import { render, screen, within } from '@testing-library/react';
import { CollectionPaymentMonthlyGrid } from '@/components/business/cash-flow/collections-payments/collection-payment-monthly-grid';
import { formatCurrency } from '@/utils/formats-money';
const money = (n: number) => formatCurrency(n).replace(/\u00A0/g, ' ');

describe('CollectionPaymentMonthlyGrid', () => {
	it('renders the given title and all 12 months zero-filled with no entries', () => {
		render(<CollectionPaymentMonthlyGrid entries={[]} title="Cobros por mes" />);

		expect(screen.getByText('Cobros por mes')).toBeInTheDocument();
		expect(screen.getAllByText(money(0))).toHaveLength(13);
	});

	it('sums entry amounts into their month and shows the annual total', () => {
		const entries = [
			{ date: '2026-02-10', amount: 1000 },
			{ date: '2026-02-15', amount: 500 },
			{ date: '2026-05-01', amount: 2000 },
		];

		render(<CollectionPaymentMonthlyGrid entries={entries} title="Pagos por mes" />);

		const table = screen.getByRole('table');
		const rows = within(table).getAllByRole('row');
		const februaryRow = within(rows[2]);
		expect(februaryRow.getByText('Feb')).toBeInTheDocument();
		expect(februaryRow.getByText(money(1500))).toBeInTheDocument();

		const totalRow = within(rows[rows.length - 1]);
		expect(totalRow.getByText('Total anual')).toBeInTheDocument();
		expect(totalRow.getByText(money(3500))).toBeInTheDocument();
	});
});
