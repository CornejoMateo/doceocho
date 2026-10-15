import { render, screen } from '@testing-library/react';
import { PaymentRow } from '@/components/business/suppliers/payment-row';
import type { PaymentSupplier } from '@/lib/suppliers/payments-suppliers';

jest.mock('@/components/business/suppliers/supplier-attachments-gallery', () => ({
	SupplierAttachmentsGallery: () => null,
}));

function makePayment(over: Partial<PaymentSupplier> = {}): PaymentSupplier {
	return {
		id: 1,
		created_at: '2026-02-01T12:00:00.000Z',
		paid_date: '2026-03-15',
		amount_ars: 1000,
		receipt_number: null,
		work_id: null,
		category_id: null,
		bank_account_id: null,
		payment_method_id: null,
		purchase_supplier_id: 11,
		notes: null,
		...over,
	};
}

describe('PaymentRow', () => {
	it('shows the paid_date, not created_at, formatted as dd/mm/yyyy', () => {
		render(
			<PaymentRow
				payment={makePayment()}
				bankAccountById={new Map()}
				paymentMethodById={new Map()}
				fileCount={0}
				onEdit={() => {}}
				onDelete={() => {}}
				onCountChange={() => {}}
			/>
		);

		expect(screen.getByText(/15\/03\/2026/)).toBeInTheDocument();
	});

	it('renders "-" when paid_date is missing', () => {
		render(
			<PaymentRow
				payment={makePayment({ paid_date: null as any })}
				bankAccountById={new Map()}
				paymentMethodById={new Map()}
				fileCount={0}
				onEdit={() => {}}
				onDelete={() => {}}
				onCountChange={() => {}}
			/>
		);

		expect(screen.getByText(/^-/)).toBeInTheDocument();
	});
});
