import { render, screen } from '@testing-library/react';
import { PurchaseCard } from '@/components/business/suppliers/purchase-card';
import type { SupplierExpenseListItem } from '@/lib/suppliers/supplier-expenses';

jest.mock('@/components/business/shared/attachments/attachments-gallery', () => ({
	AttachmentsGallery: () => null,
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
	DropdownMenu: ({ children }: any) => <>{children}</>,
	DropdownMenuTrigger: ({ children }: any) => <>{children}</>,
	DropdownMenuContent: ({ children }: any) => <>{children}</>,
	DropdownMenuItem: ({ children, onSelect, ...props }: any) => (
		<button type="button" onClick={onSelect} {...props}>
			{children}
		</button>
	),
}));

function makePurchase(over: Partial<SupplierExpenseListItem> = {}): SupplierExpenseListItem {
	return {
		id: 1,
		created_at: '2026-01-10T00:00:00.000Z',
		date: '2026-01-10',
		voucher_number: null,
		voucher_type_id: null,
		voucher_type_name: null,
		work_id: null,
		work_name: null,
		category_id: null,
		category_name: null,
		payment_method_id: null,
		payment_method_name: null,
		bank_account_id: null,
		bank_account_name: null,
		description: null,
		net_amount: 1000,
		iva_percent: 0,
		iva_amount: 0,
		total_amount: 1000,
		totalPaidArs: 0,
		balanceArs: 1000,
		...over,
	};
}

const baseProps = {
	expanded: false,
	onToggleExpand: () => {},
	purchaseFileCount: 0,
	payments: undefined,
	paymentsLoading: false,
	paymentsError: null,
	onRetryPayments: () => {},
	bankAccountById: new Map(),
	paymentMethodById: new Map(),
	paymentCategoryById: new Map(),
	paymentFileCounts: new Map(),
	paymentFilesByPaymentId: new Map(),
	onEditPurchase: () => {},
	onDeletePurchase: () => {},
	onNewPayment: () => {},
	onEditPayment: () => {},
	onDeletePayment: () => {},
	onPurchaseCountChange: () => {},
	onPaymentCountChange: () => {},
};

describe('PurchaseCard', () => {
	it('renders nothing extra when voucher number, category and obra are all null', () => {
		render(<PurchaseCard purchase={makePurchase()} {...baseProps} />);

		expect(screen.queryByText(/N°/)).not.toBeInTheDocument();
	});

	it('shows voucher number, category and obra, in that order, separated by middle dots', () => {
		render(
			<PurchaseCard
				purchase={makePurchase({
					voucher_number: 'A-0001',
					category_name: 'Materiales',
					work_name: 'Casa Norte',
				})}
				{...baseProps}
			/>
		);

		expect(screen.getByText('N° A-0001 · Materiales · Casa Norte')).toBeInTheDocument();
	});

	it('skips the parts that are null without leaving stray separators', () => {
		render(
			<PurchaseCard purchase={makePurchase({ category_name: 'Materiales' })} {...baseProps} />
		);

		expect(screen.getByText('Materiales')).toBeInTheDocument();
	});
});
