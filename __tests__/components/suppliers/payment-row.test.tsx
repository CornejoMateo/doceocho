import { render, screen } from '@testing-library/react';
import { PaymentRow } from '@/components/business/suppliers/payment-row';
import type { PaymentWithDetails } from '@/lib/payments/payments';
import type { CashFlowCategory } from '@/lib/categories/categories';

jest.mock('@/components/business/shared/attachments/attachments-gallery', () => ({
	AttachmentsGallery: () => null,
}));

function makePayment(over: Partial<PaymentWithDetails> = {}): PaymentWithDetails {
	return {
		id: 1,
		created_at: '2026-02-01T12:00:00.000Z',
		date: '2026-03-15',
		receipt_number: null,
		work_id: null,
		category_id: null,
		kind: 'payment',
		description: null,
		amount: 1000,
		bank_account_id: null,
		payment_method_id: null,
		expense_id: 11,
		work_name: null,
		category_name: null,
		payment_method_name: '',
		bank_account_name: null,
		expense_date: null,
		expense_voucher_number: null,
		expense_description: null,
		expense_total_amount: null,
		...over,
	};
}

describe('PaymentRow', () => {
	it('shows the date, not created_at, formatted as dd/mm/yyyy', () => {
		render(
			<PaymentRow
				payment={makePayment()}
				bankAccountById={new Map()}
				paymentMethodById={new Map()}
				categoryById={new Map()}
				fileCount={0}
				onEdit={() => {}}
				onDelete={() => {}}
				onCountChange={() => {}}
			/>
		);

		expect(screen.getByText(/15\/03\/2026/)).toBeInTheDocument();
	});

	it('renders "-" when date is missing', () => {
		render(
			<PaymentRow
				payment={makePayment({ date: null as any })}
				bankAccountById={new Map()}
				paymentMethodById={new Map()}
				categoryById={new Map()}
				fileCount={0}
				onEdit={() => {}}
				onDelete={() => {}}
				onCountChange={() => {}}
			/>
		);

		expect(screen.getByText(/^-/)).toBeInTheDocument();
	});

	it('shows the receipt number and category name when present', () => {
		const category: CashFlowCategory = {
			id: 5,
			created_at: '2026-01-01T00:00:00.000Z',
			name: 'Materiales',
			kind: 'payment',
			is_active: true,
		};
		render(
			<PaymentRow
				payment={makePayment({ receipt_number: 'A-0001', category_id: 5 })}
				bankAccountById={new Map()}
				paymentMethodById={new Map()}
				categoryById={new Map([[5, category]])}
				fileCount={0}
				onEdit={() => {}}
				onDelete={() => {}}
				onCountChange={() => {}}
			/>
		);

		expect(screen.getByText('N° A-0001 · Materiales')).toBeInTheDocument();
	});

	it('falls back to "Categoría eliminada" when the category id has no match', () => {
		render(
			<PaymentRow
				payment={makePayment({ category_id: 99 })}
				bankAccountById={new Map()}
				paymentMethodById={new Map()}
				categoryById={new Map()}
				fileCount={0}
				onEdit={() => {}}
				onDelete={() => {}}
				onCountChange={() => {}}
			/>
		);

		expect(screen.getByText('Categoría eliminada')).toBeInTheDocument();
	});
});
