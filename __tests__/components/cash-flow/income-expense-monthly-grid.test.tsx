import { render, screen, within } from '@testing-library/react';
import { IncomeExpenseMonthlyGrid } from '@/components/business/cash-flow/incomes-expenses/income-expense-monthly-grid';
import { formatCurrency } from '@/utils/formats-money';
import type { IncomeExpenseEntry } from '@/hooks/income-expense/use-income-expense-tab';

const money = (n: number) => formatCurrency(n).replace(/\u00A0/g, ' ');

function makeEntry(over: Partial<IncomeExpenseEntry>): IncomeExpenseEntry {
	return {
		id: 1,
		date: '2026-01-10',
		voucher_number: null,
		voucher_type_id: 1,
		voucher_type_name: 'Factura A',
		work_id: null,
		work_name: null,
		party_id: 1,
		party_name: 'Cliente 1',
		category_id: 1,
		category_name: 'Categoría 1',
		description: null,
		net_amount: 1000,
		iva_percent: 21,
		iva_amount: 210,
		total_amount: 1210,
		...over,
	};
}

describe('IncomeExpenseMonthlyGrid', () => {
	it('renders all 12 months zero-filled and includes the year in the title', () => {
		render(<IncomeExpenseMonthlyGrid entries={[]} year={2026} />);

		expect(screen.getByText('Por mes (2026)')).toBeInTheDocument();
		expect(screen.getAllByText(money(0))).toHaveLength(39); // 12 months x 3 columns + totals row
	});

	it('groups entries by month and shows a Total row with the annual sum', () => {
		const entries = [
			makeEntry({ date: '2026-01-10', net_amount: 1000, iva_amount: 210, total_amount: 1210 }),
			makeEntry({ date: '2026-01-20', net_amount: 500, iva_amount: 0, total_amount: 500 }),
			makeEntry({ date: '2026-03-05', net_amount: 2000, iva_amount: 420, total_amount: 2420 }),
		];

		render(<IncomeExpenseMonthlyGrid entries={entries} year={2026} />);

		const table = screen.getByRole('table');
		const rows = within(table).getAllByRole('row');
		const januaryRow = within(rows[1]);
		expect(januaryRow.getByText('Ene')).toBeInTheDocument();
		expect(januaryRow.getByText(money(1500))).toBeInTheDocument();
		expect(januaryRow.getByText(money(210))).toBeInTheDocument();
		expect(januaryRow.getByText(money(1710))).toBeInTheDocument();

		const totalRow = within(rows[rows.length - 1]);
		expect(totalRow.getByText('Total')).toBeInTheDocument();
		expect(totalRow.getByText(money(3500))).toBeInTheDocument();
		expect(totalRow.getByText(money(630))).toBeInTheDocument();
		expect(totalRow.getByText(money(4130))).toBeInTheDocument();
	});
});
