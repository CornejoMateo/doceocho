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
		payment_method_id: null,
		payment_method_name: null,
		bank_account_id: null,
		bank_account_name: null,
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

	describe('onAddPayment ("Agregar pago")', () => {
		it('does not render the button when onAddPayment is not passed', () => {
			const entry = makeEntry({ party_id: null });
			render(
				<IncomeExpenseList
					entries={[entry]}
					loading={false}
					partyLabel="Proveedor"
					emptyLabel="No hay gastos registrados"
					onEdit={noop}
					onAskDelete={noop}
				/>
			);

			expect(screen.queryByRole('button', { name: 'Agregar pago' })).not.toBeInTheDocument();
		});

		it('renders the button for an entry with no supplier when onAddPayment is passed', () => {
			const entry = makeEntry({ party_id: null });
			render(
				<IncomeExpenseList
					entries={[entry]}
					loading={false}
					partyLabel="Proveedor"
					emptyLabel="No hay gastos registrados"
					onEdit={noop}
					onAskDelete={noop}
					onAddPayment={noop}
				/>
			);

			const buttons = screen.getAllByRole('button', { name: 'Agregar pago' });
			expect(buttons.length).toBeGreaterThan(0);
			buttons.forEach((button) => expect(button).toBeEnabled());
		});

		it('renders the button enabled for an entry that already has a supplier, and calls the handler (payments created from a supplier purchase have no party)', () => {
			const entry = makeEntry({ party_id: 9, party_name: 'Acme SRL' });
			const onAddPayment = jest.fn();
			render(
				<IncomeExpenseList
					entries={[entry]}
					loading={false}
					partyLabel="Proveedor"
					emptyLabel="No hay gastos registrados"
					onEdit={noop}
					onAskDelete={noop}
					onAddPayment={onAddPayment}
				/>
			);

			const desktop = within(screen.getByTestId('income-expense-desktop'));
			const button = desktop.getByRole('button', { name: 'Agregar pago' });
			expect(button).not.toBeDisabled();

			fireEvent.click(button);
			expect(onAddPayment).toHaveBeenCalledWith(entry);
		});

		it('calls onAddPayment with the clicked entry', () => {
			const entry = makeEntry({ party_id: null });
			const onAddPayment = jest.fn();
			render(
				<IncomeExpenseList
					entries={[entry]}
					loading={false}
					partyLabel="Proveedor"
					emptyLabel="No hay gastos registrados"
					onEdit={noop}
					onAskDelete={noop}
					onAddPayment={onAddPayment}
				/>
			);

			const desktop = within(screen.getByTestId('income-expense-desktop'));
			fireEvent.click(desktop.getByRole('button', { name: 'Agregar pago' }));

			expect(onAddPayment).toHaveBeenCalledWith(entry);
		});
	});

	describe('onRowClick (Gastos-only detail dialog)', () => {
		it('does not add row click behavior when onRowClick is not passed (Ingresos unaffected)', () => {
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
			const row = desktop.getByText('Cliente 1').closest('tr')!;
			expect(row).not.toHaveAttribute('tabindex');
			expect(row).not.toHaveAttribute('aria-label');
		});

		it('calls onRowClick when a desktop row is clicked', () => {
			const entry = makeEntry();
			const onRowClick = jest.fn();
			render(
				<IncomeExpenseList
					entries={[entry]}
					loading={false}
					partyLabel="Cliente"
					emptyLabel="No hay ingresos registrados"
					onEdit={noop}
					onAskDelete={noop}
					onRowClick={onRowClick}
				/>
			);

			const desktop = within(screen.getByTestId('income-expense-desktop'));
			fireEvent.click(desktop.getByText('Cliente 1').closest('tr')!);
			expect(onRowClick).toHaveBeenCalledWith(entry);
		});

		it('calls onRowClick on Enter and Space on a focused desktop row', () => {
			const entry = makeEntry();
			const onRowClick = jest.fn();
			render(
				<IncomeExpenseList
					entries={[entry]}
					loading={false}
					partyLabel="Cliente"
					emptyLabel="No hay ingresos registrados"
					onEdit={noop}
					onAskDelete={noop}
					onRowClick={onRowClick}
				/>
			);

			const desktop = within(screen.getByTestId('income-expense-desktop'));
			const row = desktop.getByText('Cliente 1').closest('tr')!;
			fireEvent.keyDown(row, { key: 'Enter' });
			fireEvent.keyDown(row, { key: ' ' });
			expect(onRowClick).toHaveBeenCalledTimes(2);
			expect(onRowClick).toHaveBeenCalledWith(entry);
		});

		it('calls onRowClick when a mobile card is clicked, and on Enter/Space when focused', () => {
			const entry = makeEntry();
			const onRowClick = jest.fn();
			render(
				<IncomeExpenseList
					entries={[entry]}
					loading={false}
					partyLabel="Cliente"
					emptyLabel="No hay ingresos registrados"
					onEdit={noop}
					onAskDelete={noop}
					onRowClick={onRowClick}
				/>
			);

			const mobile = within(screen.getByTestId('income-expense-mobile'));
			const card = mobile.getByText('Cliente 1').closest('[tabindex]')!;
			fireEvent.click(card);
			fireEvent.keyDown(card, { key: 'Enter' });
			expect(onRowClick).toHaveBeenCalledTimes(2);
			expect(onRowClick).toHaveBeenCalledWith(entry);
		});

		it('does not call onRowClick when clicking the Editar or Eliminar action buttons', () => {
			const entry = makeEntry();
			const onRowClick = jest.fn();
			render(
				<IncomeExpenseList
					entries={[entry]}
					loading={false}
					partyLabel="Cliente"
					emptyLabel="No hay ingresos registrados"
					onEdit={noop}
					onAskDelete={noop}
					onRowClick={onRowClick}
				/>
			);

			const desktop = within(screen.getByTestId('income-expense-desktop'));
			fireEvent.click(desktop.getByRole('button', { name: 'Editar' }));
			fireEvent.click(desktop.getByRole('button', { name: 'Eliminar' }));
			expect(onRowClick).not.toHaveBeenCalled();
		});

		it('does not call onRowClick when clicking the Agregar pago action button', () => {
			const entry = makeEntry({ party_id: null });
			const onRowClick = jest.fn();
			const onAddPayment = jest.fn();
			render(
				<IncomeExpenseList
					entries={[entry]}
					loading={false}
					partyLabel="Proveedor"
					emptyLabel="No hay gastos registrados"
					onEdit={noop}
					onAskDelete={noop}
					onAddPayment={onAddPayment}
					onRowClick={onRowClick}
				/>
			);

			const desktop = within(screen.getByTestId('income-expense-desktop'));
			fireEvent.click(desktop.getByRole('button', { name: 'Agregar pago' }));
			expect(onAddPayment).toHaveBeenCalledWith(entry);
			expect(onRowClick).not.toHaveBeenCalled();
		});

		it('gives the row an accessible hint ("Ver detalle y archivos")', () => {
			const entry = makeEntry();
			render(
				<IncomeExpenseList
					entries={[entry]}
					loading={false}
					partyLabel="Cliente"
					emptyLabel="No hay ingresos registrados"
					onEdit={noop}
					onAskDelete={noop}
					onRowClick={noop}
				/>
			);

			const desktop = within(screen.getByTestId('income-expense-desktop'));
			const row = desktop.getByText('Cliente 1').closest('tr')!;
			expect(row).toHaveAttribute('aria-label', 'Ver detalle y archivos');
			expect(row).toHaveAttribute('tabindex', '0');
		});

		it('ignores the click when the user has an active text selection (drag-to-select)', () => {
			const entry = makeEntry();
			const onRowClick = jest.fn();
			const getSelectionSpy = jest.spyOn(window, 'getSelection').mockReturnValue({
				toString: () => 'some selected text',
			} as any);

			render(
				<IncomeExpenseList
					entries={[entry]}
					loading={false}
					partyLabel="Cliente"
					emptyLabel="No hay ingresos registrados"
					onEdit={noop}
					onAskDelete={noop}
					onRowClick={onRowClick}
				/>
			);

			const desktop = within(screen.getByTestId('income-expense-desktop'));
			fireEvent.click(desktop.getByText('Cliente 1').closest('tr')!);
			expect(onRowClick).not.toHaveBeenCalled();

			getSelectionSpy.mockRestore();
		});
	});

	describe('pagination', () => {
		it('shows only 20 entries per page and navigates to the next page', () => {
			const entries = Array.from({ length: 22 }, (_, i) =>
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
			expect(desktop.getByText('Cliente 20')).toBeInTheDocument();
			expect(desktop.queryByText('Cliente 21')).not.toBeInTheDocument();
			expect(screen.getByText('Mostrando 1-20 de 22 movimientos')).toBeInTheDocument();

			fireEvent.click(screen.getByText('Siguiente'));

			expect(desktop.getByText('Cliente 21')).toBeInTheDocument();
			expect(desktop.getByText('Cliente 22')).toBeInTheDocument();
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
			const entries = Array.from({ length: 22 }, (_, i) =>
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
			expect(desktop.getByText('Cliente 21')).toBeInTheDocument();

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
			expect(desktop.queryByText('Cliente 21')).not.toBeInTheDocument();
		});

		it('clamps to the last valid page when a delete empties the current page', () => {
			const entries = Array.from({ length: 21 }, (_, i) =>
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
			expect(desktop.getByText('Cliente 21')).toBeInTheDocument();

			// Delete the only entry on page 2; same pageResetKey, so no forced reset to page 1.
			const remaining = entries.slice(0, 20);
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
			expect(desktop.getByText('Cliente 20')).toBeInTheDocument();
		});
	});
});
