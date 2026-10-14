import { computeCollectionPaymentByMethod } from '@/helpers/collection-payment/collection-payment-summary';
import type { CollectionPaymentEntry } from '@/hooks/collection-payment/use-collection-payment-tab';
import type { PaymentMethod } from '@/lib/payment-methods/payment-methods';

function entry(overrides: Partial<CollectionPaymentEntry>): CollectionPaymentEntry {
	return {
		id: 1,
		date: '2026-01-15',
		receipt_number: null,
		work_id: null,
		work_name: null,
		party_id: 1,
		party_name: 'Cliente',
		category_id: null,
		category_name: null,
		description: null,
		amount: 100,
		payment_method_id: 1,
		payment_method_name: 'Efectivo',
		bank_account_id: null,
		bank_account_name: null,
		...overrides,
	};
}

function method(overrides: Partial<PaymentMethod>): PaymentMethod {
	return {
		id: 1,
		created_at: '2026-01-01T00:00:00Z',
		name: 'Efectivo',
		is_active: true,
		...overrides,
	};
}

describe('computeCollectionPaymentByMethod', () => {
	it('returns rows sorted by amount descending', () => {
		const methods = [method({ id: 1, name: 'Efectivo' }), method({ id: 2, name: 'Transferencia' })];
		const entries = [
			entry({ payment_method_id: 1, payment_method_name: 'Efectivo', amount: 50 }),
			entry({ payment_method_id: 2, payment_method_name: 'Transferencia', amount: 500 }),
		];

		const rows = computeCollectionPaymentByMethod(entries, methods);

		expect(rows.map((r) => r.paymentMethodName)).toEqual(['Transferencia', 'Efectivo']);
	});

	it('sums movements for the same payment method and returns the total', () => {
		const methods = [method({ id: 1 })];
		const entries = [
			entry({ payment_method_id: 1, amount: 100 }),
			entry({ payment_method_id: 1, amount: 50 }),
		];

		const rows = computeCollectionPaymentByMethod(entries, methods);

		expect(rows).toEqual([{ paymentMethodId: 1, paymentMethodName: 'Efectivo', amount: 150 }]);
	});

	it('includes an inactive payment method when it has movements', () => {
		const methods = [method({ id: 1, is_active: false, name: 'Cheque (de baja)' })];
		const entries = [
			entry({ payment_method_id: 1, payment_method_name: 'Cheque (de baja)', amount: 80 }),
		];

		const rows = computeCollectionPaymentByMethod(entries, methods);

		expect(rows).toEqual([
			{ paymentMethodId: 1, paymentMethodName: 'Cheque (de baja)', amount: 80 },
		]);
	});

	it('excludes an inactive payment method when it has no movements', () => {
		const methods = [method({ id: 1, is_active: false, name: 'Cheque (de baja)' })];

		const rows = computeCollectionPaymentByMethod([], methods);

		expect(rows).toEqual([]);
	});

	it('includes an active payment method with zero movements', () => {
		const methods = [method({ id: 1, is_active: true, name: 'Efectivo' })];

		const rows = computeCollectionPaymentByMethod([], methods);

		expect(rows).toEqual([{ paymentMethodId: 1, paymentMethodName: 'Efectivo', amount: 0 }]);
	});

	// payment_method_id on CollectionPaymentEntry is a required `number` (collections/payments always carry
	// a payment method), so there is no literal-null case to exercise here. The closest real edge case is
	// an entry whose method id isn't present in the (active) paymentMethods list at all, e.g. a deleted method.
	it('falls back to an empty name for an entry whose payment method is missing from the list entirely', () => {
		const entries = [entry({ payment_method_id: 99, payment_method_name: '', amount: 30 })];

		const rows = computeCollectionPaymentByMethod(entries, []);

		expect(rows).toEqual([{ paymentMethodId: 99, paymentMethodName: '', amount: 30 }]);
	});

	it('rounds the accumulated amount to 2 decimals', () => {
		const methods = [method({ id: 1 })];
		const entries = [
			entry({ payment_method_id: 1, amount: 0.1 }),
			entry({ payment_method_id: 1, amount: 0.2 }),
		];

		const rows = computeCollectionPaymentByMethod(entries, methods);

		expect(rows[0].amount).toBe(0.3);
	});
});
