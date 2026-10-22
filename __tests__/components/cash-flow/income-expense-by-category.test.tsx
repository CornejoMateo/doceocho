import { render, screen, within } from '@testing-library/react';
import { IncomeExpenseByCategory } from '@/components/business/cash-flow/incomes-expenses/income-expense-by-category';
import { formatCurrency } from '@/utils/formats-money';
import type { IncomeExpenseEntry } from '@/hooks/income-expense/use-income-expense-tab';
import type { CashFlowCategory } from '@/lib/categories/categories';

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
		category_name: 'Alquiler',
		description: null,
		net_amount: 1000,
		iva_percent: 21,
		iva_amount: 210,
		total_amount: 1210,
		payment_method_id: null,
		payment_method_name: null,
		bank_account_id: null,
		bank_account_name: null,
		...over,
	};
}

function makeCategory(over: Partial<CashFlowCategory>): CashFlowCategory {
	return {
		id: 1,
		created_at: '2026-01-01',
		name: 'Alquiler',
		kind: 'income',
		is_active: true,
		...over,
	};
}

describe('IncomeExpenseByCategory', () => {
	it('shows the empty-state message when there are no categories with movements', () => {
		render(<IncomeExpenseByCategory entries={[]} categories={[]} />);

		expect(screen.getByText('No hay categorías con movimientos')).toBeInTheDocument();
	});

	it('sorts categories by net descending and shows a Total row', () => {
		const categories = [
			makeCategory({ id: 1, name: 'Alquiler' }),
			makeCategory({ id: 2, name: 'Insumos' }),
		];
		const entries = [
			makeEntry({ category_id: 1, category_name: 'Alquiler', net_amount: 500 }),
			makeEntry({ category_id: 2, category_name: 'Insumos', net_amount: 1500 }),
		];

		render(<IncomeExpenseByCategory entries={entries} categories={categories} />);

		const table = screen.getByRole('table');
		const rows = within(table).getAllByRole('row');
		expect(within(rows[1]).getByText('Insumos')).toBeInTheDocument();
		expect(within(rows[2]).getByText('Alquiler')).toBeInTheDocument();
		const totalRow = within(rows[rows.length - 1]);
		expect(totalRow.getByText('Total')).toBeInTheDocument();
		expect(totalRow.getByText(money(2000))).toBeInTheDocument();
	});

	it('includes inactive categories that still have movements', () => {
		const categories = [makeCategory({ id: 1, name: 'Categoría inactiva', is_active: false })];
		const entries = [
			makeEntry({ category_id: 1, category_name: 'Categoría inactiva', net_amount: 300 }),
		];

		render(<IncomeExpenseByCategory entries={entries} categories={categories} />);

		expect(screen.getByText('Categoría inactiva')).toBeInTheDocument();
		expect(screen.getAllByText(money(300))).toHaveLength(2);
	});

	it('hides inactive categories that have no movements', () => {
		const categories = [
			makeCategory({ id: 1, name: 'Categoría inactiva sin movimientos', is_active: false }),
		];

		render(<IncomeExpenseByCategory entries={[]} categories={categories} />);

		expect(screen.getByText('No hay categorías con movimientos')).toBeInTheDocument();
		expect(screen.queryByText('Categoría inactiva sin movimientos')).not.toBeInTheDocument();
	});
});
