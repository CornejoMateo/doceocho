// Forced before any Date-based formatting runs, so a day-shift bug (UTC midnight vs. Argentina) is reproducible.
process.env.TZ = 'America/Argentina/Buenos_Aires';

import { render, screen, fireEvent, within } from '@testing-library/react';
import { IncomeExpenseList } from '@/components/business/cash-flow/incomes-expenses/income-expense-list';
import { formatCurrency } from '@/utils/formats-money';
import { formatDateOnly } from '@/utils/format-date';
import type { IncomeExpenseEntry } from '@/hooks/income-expense/use-income-expense-tab';

const money = (n: number) => formatCurrency(n).replace(/\u00A0/g, ' ');

function makeEntry(over: Partial<IncomeExpenseEntry> = {}): IncomeExpenseEntry {
	return {
		id: 1,
		date: '2026-01-10',
		voucher_number: '0001-00000123',
		voucher_type_id: 1,
		voucher_type_name: 'Factura A',
		work_id: null,
		work_name: null,
		party_id: 1,
		party_name: 'Cliente 1',
		category_id: 1,
		category_name: 'Alquiler',
		description: 'Pago de alquiler',
		net_amount: 1000,
		iva_percent: 21,
		iva_amount: 210,
		total_amount: 1210,
		...over,
	};
}

const noop = () => {};

describe('IncomeExpenseList', () => {
	it('shows a loading state', () => {
		render(
			<IncomeExpenseList
				entries={[]}
				loading
				partyLabel="Cliente"
				emptyLabel="No hay ingresos registrados"
				onEdit={noop}
				onAskDelete={noop}
			/>
		);

		expect(screen.getByText('Cargando...')).toBeInTheDocument();
	});

	it('shows the empty label when there are no entries', () => {
		render(
			<IncomeExpenseList
				entries={[]}
				loading={false}
				partyLabel="Cliente"
				emptyLabel="No hay ingresos registrados"
				onEdit={noop}
				onAskDelete={noop}
			/>
		);

		expect(screen.getByText('No hay ingresos registrados')).toBeInTheDocument();
	});

	it('renders a row with formatted date, amounts and the party label as a column header', () => {
		const entry = makeEntry();
		render(
			<IncomeExpenseList
				entries={[entry]}
				loading={false}
				partyLabel="Cliente"
				emptyLabel="No hay ingresos registrados"
				onEdit={noop}
				onAskDelete={noop}
			/>
		);

		const desktop = within(screen.getByTestId('income-expense-desktop'));
		expect(desktop.getByText('Cliente')).toBeInTheDocument();
		expect(desktop.getByText(formatDateOnly(entry.date))).toBeInTheDocument();
		expect(desktop.getByText('Cliente 1')).toBeInTheDocument();
		expect(desktop.getByText(money(entry.net_amount))).toBeInTheDocument();
		expect(desktop.getByText(money(entry.iva_amount))).toBeInTheDocument();
		expect(desktop.getByText(money(entry.total_amount))).toBeInTheDocument();
	});

	it('does not shift the date a day back in Argentina time (desktop and mobile)', () => {
		// new Date('2026-01-01') + toLocaleDateString in UTC-3 would wrongly show 31/12/2025.
		const entry = makeEntry({ date: '2026-01-01' });
		render(
			<IncomeExpenseList
				entries={[entry]}
				loading={false}
				partyLabel="Cliente"
				emptyLabel="No hay ingresos registrados"
				onEdit={noop}
				onAskDelete={noop}
			/>
		);

		expect(
			within(screen.getByTestId('income-expense-desktop')).getByText('01/01/2026')
		).toBeInTheDocument();
		expect(
			within(screen.getByTestId('income-expense-mobile')).getByText('01/01/2026')
		).toBeInTheDocument();
	});

	it('calls onEdit and onAskDelete with the clicked entry', () => {
		const entry = makeEntry();
		const onEdit = jest.fn();
		const onAskDelete = jest.fn();
		render(
			<IncomeExpenseList
				entries={[entry]}
				loading={false}
				partyLabel="Cliente"
				emptyLabel="No hay ingresos registrados"
				onEdit={onEdit}
				onAskDelete={onAskDelete}
			/>
		);

		const desktop = within(screen.getByTestId('income-expense-desktop'));
		fireEvent.click(desktop.getByRole('button', { name: 'Editar' }));
		expect(onEdit).toHaveBeenCalledWith(entry);

		fireEvent.click(desktop.getByRole('button', { name: 'Eliminar' }));
		expect(onAskDelete).toHaveBeenCalledWith(entry);
	});

	it('falls back to a dash for work and description when absent', () => {
		const entry = makeEntry({ work_name: null, description: null });
		render(
			<IncomeExpenseList
				entries={[entry]}
				loading={false}
				partyLabel="Cliente"
				emptyLabel="No hay ingresos registrados"
				onEdit={noop}
				onAskDelete={noop}
			/>
		);

		const desktop = within(screen.getByTestId('income-expense-desktop'));
		expect(desktop.getAllByText('-').length).toBeGreaterThanOrEqual(2);
	});

	describe('pagination', () => {
		it('shows only 10 entries per page and navigates to the next page', () => {
			const entries = Array.from({ length: 12 }, (_, i) =>
				makeEntry({ id: i + 1, party_name: `Cliente ${i + 1}` })
			);
			render(
				<IncomeExpenseList
					entries={entries}
					loading={false}
					partyLabel="Cliente"
					emptyLabel="No hay ingresos registrados"
					onEdit={noop}
					onAskDelete={noop}
				/>
			);

			const desktop = within(screen.getByTestId('income-expense-desktop'));
			expect(desktop.getByText('Cliente 1')).toBeInTheDocument();
			expect(desktop.getByText('Cliente 10')).toBeInTheDocument();
			expect(desktop.queryByText('Cliente 11')).not.toBeInTheDocument();
			expect(screen.getByText('Mostrando 1-10 de 12 movimientos')).toBeInTheDocument();

			fireEvent.click(screen.getByText('Siguiente'));

			expect(desktop.getByText('Cliente 11')).toBeInTheDocument();
			expect(desktop.getByText('Cliente 12')).toBeInTheDocument();
			expect(desktop.queryByText('Cliente 1')).not.toBeInTheDocument();
		});

		it('hides the pager when there is a single page', () => {
			const entries = Array.from({ length: 5 }, (_, i) => makeEntry({ id: i + 1 }));
			render(
				<IncomeExpenseList
					entries={entries}
					loading={false}
					partyLabel="Cliente"
					emptyLabel="No hay ingresos registrados"
					onEdit={noop}
					onAskDelete={noop}
				/>
			);

			expect(screen.queryByText('Siguiente')).not.toBeInTheDocument();
		});

		it('resets to page 1 when pageResetKey changes (filters/search/year)', () => {
			const entries = Array.from({ length: 12 }, (_, i) =>
				makeEntry({ id: i + 1, party_name: `Cliente ${i + 1}` })
			);
			const { rerender } = render(
				<IncomeExpenseList
					entries={entries}
					loading={false}
					partyLabel="Cliente"
					emptyLabel="No hay ingresos registrados"
					onEdit={noop}
					onAskDelete={noop}
					pageResetKey="2026"
				/>
			);

			const desktop = within(screen.getByTestId('income-expense-desktop'));
			fireEvent.click(screen.getByText('Siguiente'));
			expect(desktop.getByText('Cliente 11')).toBeInTheDocument();

			rerender(
				<IncomeExpenseList
					entries={entries}
					loading={false}
					partyLabel="Cliente"
					emptyLabel="No hay ingresos registrados"
					onEdit={noop}
					onAskDelete={noop}
					pageResetKey="2027"
				/>
			);

			expect(desktop.getByText('Cliente 1')).toBeInTheDocument();
			expect(desktop.queryByText('Cliente 11')).not.toBeInTheDocument();
		});

		it('clamps to the last valid page when a delete empties the current page', () => {
			const entries = Array.from({ length: 11 }, (_, i) =>
				makeEntry({ id: i + 1, party_name: `Cliente ${i + 1}` })
			);
			const { rerender } = render(
				<IncomeExpenseList
					entries={entries}
					loading={false}
					partyLabel="Cliente"
					emptyLabel="No hay ingresos registrados"
					onEdit={noop}
					onAskDelete={noop}
					pageResetKey="2026"
				/>
			);

			fireEvent.click(screen.getByText('Siguiente'));
			const desktop = within(screen.getByTestId('income-expense-desktop'));
			expect(desktop.getByText('Cliente 11')).toBeInTheDocument();

			// Delete the only entry on page 2; same pageResetKey, so no forced reset to page 1.
			const remaining = entries.slice(0, 10);
			rerender(
				<IncomeExpenseList
					entries={remaining}
					loading={false}
					partyLabel="Cliente"
					emptyLabel="No hay ingresos registrados"
					onEdit={noop}
					onAskDelete={noop}
					pageResetKey="2026"
				/>
			);

			expect(desktop.getByText('Cliente 1')).toBeInTheDocument();
			expect(desktop.getByText('Cliente 10')).toBeInTheDocument();
		});
	});
});
