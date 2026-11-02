// Forced before any Date-based formatting runs, so a day-shift bug (UTC midnight vs. Argentina) is reproducible.
process.env.TZ = 'America/Argentina/Buenos_Aires';

import { render, screen, fireEvent, within } from '@testing-library/react';
import { CollectionPaymentList } from '@/components/business/cash-flow/collections-payments/collection-payment-list';
import { formatCurrency } from '@/utils/formats-money';
import { formatDateOnly } from '@/utils/format-date';
import type { CollectionPaymentEntry } from '@/hooks/collection-payment/use-collection-payment-tab';
const money = (n: number) => formatCurrency(n).replace(/\u00A0/g, ' ');

function makeEntry(over: Partial<CollectionPaymentEntry> = {}): CollectionPaymentEntry {
	return {
		id: 1,
		date: '2026-01-10',
		receipt_number: '0001',
		work_id: null,
		work_name: null,
		party_id: 1,
		party_name: 'Cliente 1',
		category_id: 1,
		category_name: 'Alquiler',
		description: 'Cobro de alquiler',
		amount: 1000,
		payment_method_id: 1,
		payment_method_name: 'Efectivo',
		bank_account_id: null,
		bank_account_name: null,
		...over,
	};
}

const noop = () => {};

describe('CollectionPaymentList', () => {
	it('shows a loading state', () => {
		render(
			<CollectionPaymentList
				entries={[]}
				loading
				partyLabel="Cliente"
				emptyLabel="No hay cobros registrados"
				onEdit={noop}
				onAskDelete={noop}
			/>
		);

		expect(screen.getByText('Cargando...')).toBeInTheDocument();
	});

	it('shows the empty label when there are no entries', () => {
		render(
			<CollectionPaymentList
				entries={[]}
				loading={false}
				partyLabel="Cliente"
				emptyLabel="No hay cobros registrados"
				onEdit={noop}
				onAskDelete={noop}
			/>
		);

		expect(screen.getByText('No hay cobros registrados')).toBeInTheDocument();
	});

	it('renders a row with formatted date, amount and payment method', () => {
		const entry = makeEntry();
		render(
			<CollectionPaymentList
				entries={[entry]}
				loading={false}
				partyLabel="Cliente"
				emptyLabel="No hay cobros registrados"
				onEdit={noop}
				onAskDelete={noop}
			/>
		);

		const desktop = within(screen.getByTestId('collection-payment-desktop'));
		expect(desktop.getByText('Cliente')).toBeInTheDocument();
		expect(desktop.getByText(formatDateOnly(entry.date))).toBeInTheDocument();
		expect(desktop.getByText('Cliente 1')).toBeInTheDocument();
		expect(desktop.getByText('Efectivo')).toBeInTheDocument();
		expect(desktop.getByText(money(entry.amount))).toBeInTheDocument();
	});

	it('does not shift the date a day back in Argentina time (desktop and mobile)', () => {
		// new Date('2026-01-01') + toLocaleDateString in UTC-3 would wrongly show 31/12/2025.
		const entry = makeEntry({ date: '2026-01-01' });
		render(
			<CollectionPaymentList
				entries={[entry]}
				loading={false}
				partyLabel="Cliente"
				emptyLabel="No hay cobros registrados"
				onEdit={noop}
				onAskDelete={noop}
			/>
		);

		expect(
			within(screen.getByTestId('collection-payment-desktop')).getByText('01/01/2026')
		).toBeInTheDocument();
		expect(
			within(screen.getByTestId('collection-payment-mobile')).getByText('01/01/2026')
		).toBeInTheDocument();
	});

	it('calls onEdit and onAskDelete with the clicked entry', () => {
		const entry = makeEntry();
		const onEdit = jest.fn();
		const onAskDelete = jest.fn();
		render(
			<CollectionPaymentList
				entries={[entry]}
				loading={false}
				partyLabel="Proveedor"
				emptyLabel="No hay pagos registrados"
				onEdit={onEdit}
				onAskDelete={onAskDelete}
			/>
		);

		const desktop = within(screen.getByTestId('collection-payment-desktop'));
		fireEvent.click(desktop.getByRole('button', { name: 'Editar' }));
		expect(onEdit).toHaveBeenCalledWith(entry);

		fireEvent.click(desktop.getByRole('button', { name: 'Eliminar' }));
		expect(onAskDelete).toHaveBeenCalledWith(entry);
	});

	it('shows the bank account name next to the payment method when present', () => {
		const entry = makeEntry({ bank_account_name: 'Banco Nación - Caja ahorro' });
		render(
			<CollectionPaymentList
				entries={[entry]}
				loading={false}
				partyLabel="Cliente"
				emptyLabel="No hay cobros registrados"
				onEdit={noop}
				onAskDelete={noop}
			/>
		);

		expect(screen.getByText('Banco Nación - Caja ahorro')).toBeInTheDocument();
	});

	it('falls back to a dash for party_name when the payment has no supplier (general payment)', () => {
		const entry = makeEntry({ party_id: null, party_name: null, source: 'general' });
		render(
			<CollectionPaymentList
				entries={[entry]}
				loading={false}
				partyLabel="Proveedor"
				emptyLabel="No hay pagos registrados"
				onEdit={noop}
				onAskDelete={noop}
			/>
		);

		const desktop = within(screen.getByTestId('collection-payment-desktop'));
		expect(desktop.getAllByText('-').length).toBeGreaterThanOrEqual(1);
	});

	it('renders entries from both sources without key collisions even when ids overlap', () => {
		const general = makeEntry({ id: 1, source: 'general', party_id: null, party_name: null });
		const supplier = makeEntry({ id: 1, source: 'supplier', party_name: 'Acme SRL' });
		render(
			<CollectionPaymentList
				entries={[supplier, general]}
				loading={false}
				partyLabel="Proveedor"
				emptyLabel="No hay pagos registrados"
				onEdit={noop}
				onAskDelete={noop}
			/>
		);

		const desktop = within(screen.getByTestId('collection-payment-desktop'));
		expect(desktop.getAllByRole('row')).toHaveLength(3); // header + 2 data rows
		expect(desktop.getByText('Acme SRL')).toBeInTheDocument();
	});

	it('falls back to a dash for work, category and receipt number when absent', () => {
		const entry = makeEntry({ work_name: null, category_name: null, receipt_number: null });
		render(
			<CollectionPaymentList
				entries={[entry]}
				loading={false}
				partyLabel="Cliente"
				emptyLabel="No hay cobros registrados"
				onEdit={noop}
				onAskDelete={noop}
			/>
		);

		const desktop = within(screen.getByTestId('collection-payment-desktop'));
		expect(desktop.getAllByText('-').length).toBeGreaterThanOrEqual(3);
	});

	it('falls back to a dash for payment_method_name on legacy balance_transactions rows (desktop and mobile)', () => {
		const entry = makeEntry({ payment_method_id: null, payment_method_name: null });
		render(
			<CollectionPaymentList
				entries={[entry]}
				loading={false}
				partyLabel="Cliente"
				emptyLabel="No hay cobros registrados"
				onEdit={noop}
				onAskDelete={noop}
			/>
		);

		const desktop = within(screen.getByTestId('collection-payment-desktop'));
		const mobile = within(screen.getByTestId('collection-payment-mobile'));
		expect(desktop.getAllByText('-').length).toBeGreaterThanOrEqual(1);
		expect(mobile.getAllByText('-').length).toBeGreaterThanOrEqual(1);
	});

	it('shows the "Gasto: <label>" line when the payment has an expense_id (desktop and mobile)', () => {
		const entry = makeEntry({ expense_id: 42, expense_label: 'Gasto 42' });
		render(
			<CollectionPaymentList
				entries={[entry]}
				loading={false}
				partyLabel="Proveedor"
				emptyLabel="No hay pagos registrados"
				onEdit={noop}
				onAskDelete={noop}
			/>
		);

		expect(
			within(screen.getByTestId('collection-payment-desktop')).getByText('Gasto: Gasto 42')
		).toBeInTheDocument();
		expect(
			within(screen.getByTestId('collection-payment-mobile')).getByText('Gasto: Gasto 42')
		).toBeInTheDocument();
	});

	it('exposes the linked expense_label via the line title, on both desktop and mobile', () => {
		const entry = makeEntry({
			expense_id: 42,
			expense_label: '01/04/2026 · 0001-00000456 · $500,00',
		});
		render(
			<CollectionPaymentList
				entries={[entry]}
				loading={false}
				partyLabel="Proveedor"
				emptyLabel="No hay pagos registrados"
				onEdit={noop}
				onAskDelete={noop}
			/>
		);

		const desktopLine = within(screen.getByTestId('collection-payment-desktop')).getByText(
			`Gasto: ${entry.expense_label}`
		);
		const mobileLine = within(screen.getByTestId('collection-payment-mobile')).getByText(
			`Gasto: ${entry.expense_label}`
		);
		expect(desktopLine).toHaveAttribute('title', entry.expense_label);
		expect(mobileLine).toHaveAttribute('title', entry.expense_label);
	});

	it('does not show the "Gasto:" line when the payment has no expense_id', () => {
		const entry = makeEntry({ expense_id: null });
		render(
			<CollectionPaymentList
				entries={[entry]}
				loading={false}
				partyLabel="Proveedor"
				emptyLabel="No hay pagos registrados"
				onEdit={noop}
				onAskDelete={noop}
			/>
		);

		expect(screen.queryByText(/^Gasto:/)).not.toBeInTheDocument();
	});

	describe('onRowClick (Pagos-only detail dialog)', () => {
		it('does not add row click behavior when onRowClick is not passed (Cobros unaffected)', () => {
			const entry = makeEntry();
			render(
				<CollectionPaymentList
					entries={[entry]}
					loading={false}
					partyLabel="Cliente"
					emptyLabel="No hay cobros registrados"
					onEdit={noop}
					onAskDelete={noop}
				/>
			);

			const desktop = within(screen.getByTestId('collection-payment-desktop'));
			const row = desktop.getByText('Cliente 1').closest('tr')!;
			expect(row).not.toHaveAttribute('tabindex');
			expect(row).not.toHaveAttribute('aria-label');
		});

		it('calls onRowClick when a desktop row is clicked', () => {
			const entry = makeEntry();
			const onRowClick = jest.fn();
			render(
				<CollectionPaymentList
					entries={[entry]}
					loading={false}
					partyLabel="Cliente"
					emptyLabel="No hay cobros registrados"
					onEdit={noop}
					onAskDelete={noop}
					onRowClick={onRowClick}
				/>
			);

			const desktop = within(screen.getByTestId('collection-payment-desktop'));
			fireEvent.click(desktop.getByText('Cliente 1').closest('tr')!);
			expect(onRowClick).toHaveBeenCalledWith(entry);
		});

		it('calls onRowClick on Enter and Space on a focused desktop row', () => {
			const entry = makeEntry();
			const onRowClick = jest.fn();
			render(
				<CollectionPaymentList
					entries={[entry]}
					loading={false}
					partyLabel="Cliente"
					emptyLabel="No hay cobros registrados"
					onEdit={noop}
					onAskDelete={noop}
					onRowClick={onRowClick}
				/>
			);

			const desktop = within(screen.getByTestId('collection-payment-desktop'));
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
				<CollectionPaymentList
					entries={[entry]}
					loading={false}
					partyLabel="Cliente"
					emptyLabel="No hay cobros registrados"
					onEdit={noop}
					onAskDelete={noop}
					onRowClick={onRowClick}
				/>
			);

			const mobile = within(screen.getByTestId('collection-payment-mobile'));
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
				<CollectionPaymentList
					entries={[entry]}
					loading={false}
					partyLabel="Cliente"
					emptyLabel="No hay cobros registrados"
					onEdit={noop}
					onAskDelete={noop}
					onRowClick={onRowClick}
				/>
			);

			const desktop = within(screen.getByTestId('collection-payment-desktop'));
			fireEvent.click(desktop.getByRole('button', { name: 'Editar' }));
			fireEvent.click(desktop.getByRole('button', { name: 'Eliminar' }));
			expect(onRowClick).not.toHaveBeenCalled();
		});

		it('gives the row an accessible hint ("Ver detalle y archivos")', () => {
			const entry = makeEntry();
			render(
				<CollectionPaymentList
					entries={[entry]}
					loading={false}
					partyLabel="Cliente"
					emptyLabel="No hay cobros registrados"
					onEdit={noop}
					onAskDelete={noop}
					onRowClick={noop}
				/>
			);

			const desktop = within(screen.getByTestId('collection-payment-desktop'));
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
				<CollectionPaymentList
					entries={[entry]}
					loading={false}
					partyLabel="Cliente"
					emptyLabel="No hay cobros registrados"
					onEdit={noop}
					onAskDelete={noop}
					onRowClick={onRowClick}
				/>
			);

			const desktop = within(screen.getByTestId('collection-payment-desktop'));
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
				<CollectionPaymentList
					entries={entries}
					loading={false}
					partyLabel="Cliente"
					emptyLabel="No hay cobros registrados"
					onEdit={noop}
					onAskDelete={noop}
				/>
			);

			const desktop = within(screen.getByTestId('collection-payment-desktop'));
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
				<CollectionPaymentList
					entries={entries}
					loading={false}
					partyLabel="Cliente"
					emptyLabel="No hay cobros registrados"
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
				<CollectionPaymentList
					entries={entries}
					loading={false}
					partyLabel="Cliente"
					emptyLabel="No hay cobros registrados"
					onEdit={noop}
					onAskDelete={noop}
					pageResetKey="2026"
				/>
			);

			const desktop = within(screen.getByTestId('collection-payment-desktop'));
			fireEvent.click(screen.getByText('Siguiente'));
			expect(desktop.getByText('Cliente 21')).toBeInTheDocument();

			rerender(
				<CollectionPaymentList
					entries={entries}
					loading={false}
					partyLabel="Cliente"
					emptyLabel="No hay cobros registrados"
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
				<CollectionPaymentList
					entries={entries}
					loading={false}
					partyLabel="Cliente"
					emptyLabel="No hay cobros registrados"
					onEdit={noop}
					onAskDelete={noop}
					pageResetKey="2026"
				/>
			);

			fireEvent.click(screen.getByText('Siguiente'));
			const desktop = within(screen.getByTestId('collection-payment-desktop'));
			expect(desktop.getByText('Cliente 21')).toBeInTheDocument();

			// Delete the only entry on page 2; same pageResetKey, so no forced reset to page 1.
			const remaining = entries.slice(0, 20);
			rerender(
				<CollectionPaymentList
					entries={remaining}
					loading={false}
					partyLabel="Cliente"
					emptyLabel="No hay cobros registrados"
					onEdit={noop}
					onAskDelete={noop}
					pageResetKey="2026"
				/>
			);

			expect(desktop.getByText('Cliente 1')).toBeInTheDocument();
			expect(desktop.getByText('Cliente 20')).toBeInTheDocument();
		});
	});

	describe('hideParty (Pagos: payments have no party at all)', () => {
		it('hides the party column/row and never renders the party label or name', () => {
			render(
				<CollectionPaymentList
					entries={[makeEntry({ party_id: null, party_name: null })]}
					loading={false}
					partyLabel="Proveedor"
					hideParty
					emptyLabel="No hay pagos registrados"
					onEdit={noop}
					onAskDelete={noop}
				/>
			);

			expect(screen.queryByText('Proveedor')).not.toBeInTheDocument();
		});

		it('shows the party column by default (Cobros is unaffected)', () => {
			render(
				<CollectionPaymentList
					entries={[makeEntry()]}
					loading={false}
					partyLabel="Cliente"
					emptyLabel="No hay cobros registrados"
					onEdit={noop}
					onAskDelete={noop}
				/>
			);

			expect(screen.getAllByText('Cliente').length).toBeGreaterThan(0);
			expect(screen.getAllByText('Cliente 1').length).toBeGreaterThan(0);
		});
	});
});
