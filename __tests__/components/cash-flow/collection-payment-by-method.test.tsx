import { render, screen, within } from '@testing-library/react';
import { CollectionPaymentByMethod } from '@/components/business/cash-flow/collections-payments/collection-payment-by-method';
import { formatCurrency } from '@/utils/formats-money';
import type { CollectionPaymentEntry } from '@/hooks/collection-payment/use-collection-payment-tab';
import type { PaymentMethod } from '@/lib/payment-methods/payment-methods';

const money = (n: number) => formatCurrency(n).replace(/\u00A0/g, ' ');

function makeEntry(over: Partial<CollectionPaymentEntry>): CollectionPaymentEntry {
	return {
		id: 1,
		date: '2026-01-10',
		receipt_number: null,
		work_id: null,
		work_name: null,
		party_id: 1,
		party_name: 'Cliente 1',
		category_id: null,
		category_name: null,
		description: null,
		amount: 1000,
		payment_method_id: 1,
		payment_method_name: 'Efectivo',
		bank_account_id: null,
		bank_account_name: null,
		...over,
	};
}

function makeMethod(over: Partial<PaymentMethod>): PaymentMethod {
	return { id: 1, created_at: '2026-01-01', name: 'Efectivo', is_active: true, ...over };
}

describe('CollectionPaymentByMethod', () => {
	it('shows the empty-state message when there are no methods with movements', () => {
		render(<CollectionPaymentByMethod entries={[]} paymentMethods={[]} />);

		expect(screen.getByText('No hay cuentas/medios con movimientos')).toBeInTheDocument();
	});

	it('sorts methods by amount descending and shows a Total row', () => {
		const paymentMethods = [
			makeMethod({ id: 1, name: 'Efectivo' }),
			makeMethod({ id: 2, name: 'Transferencia' }),
		];
		const entries = [
			makeEntry({ payment_method_id: 1, payment_method_name: 'Efectivo', amount: 400 }),
			makeEntry({ payment_method_id: 2, payment_method_name: 'Transferencia', amount: 1600 }),
		];

		render(<CollectionPaymentByMethod entries={entries} paymentMethods={paymentMethods} />);

		const table = screen.getByRole('table');
		const rows = within(table).getAllByRole('row');
		expect(within(rows[1]).getByText('Transferencia')).toBeInTheDocument();
		expect(within(rows[2]).getByText('Efectivo')).toBeInTheDocument();
		const totalRow = within(rows[rows.length - 1]);
		expect(totalRow.getByText('Total')).toBeInTheDocument();
		expect(totalRow.getByText(money(2000))).toBeInTheDocument();
	});

	it('includes inactive methods that still have movements', () => {
		const paymentMethods = [makeMethod({ id: 1, name: 'Método inactivo', is_active: false })];
		const entries = [
			makeEntry({ payment_method_id: 1, payment_method_name: 'Método inactivo', amount: 300 }),
		];

		render(<CollectionPaymentByMethod entries={entries} paymentMethods={paymentMethods} />);

		expect(screen.getByText('Método inactivo')).toBeInTheDocument();
		expect(screen.getAllByText(money(300))).toHaveLength(2);
	});

	it('hides inactive methods that have no movements', () => {
		const paymentMethods = [
			makeMethod({ id: 1, name: 'Método inactivo sin movimientos', is_active: false }),
		];

		render(<CollectionPaymentByMethod entries={[]} paymentMethods={paymentMethods} />);

		expect(screen.getByText('No hay cuentas/medios con movimientos')).toBeInTheDocument();
		expect(screen.queryByText('Método inactivo sin movimientos')).not.toBeInTheDocument();
	});
});
