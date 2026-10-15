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
});
