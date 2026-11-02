import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddPaymentFromExpenseDialog } from '@/components/business/cash-flow/incomes-expenses/add-payment-from-expense-dialog';
import type { IncomeExpenseEntry } from '@/hooks/income-expense/use-income-expense-tab';
import { listPayments, createPayment } from '@/lib/payments/payments';
import { uploadFilePayment } from '@/lib/payments/files-payments';
import { listExpenses } from '@/lib/expenses/expenses';
import { listCategories } from '@/lib/categories/categories';
import { listWorks } from '@/lib/works/works';
import { listPaymentMethods } from '@/lib/payment-methods/payment-methods';
import { listBankAccounts } from '@/lib/cash-flow/cash-flow';

// Real usePayments + useCollectionPaymentTab run here; only the data-layer calls they make are mocked.
jest.mock('@/lib/payments/payments', () => ({
	listPayments: jest.fn(),
	createPayment: jest.fn(),
	updatePayment: jest.fn(),
	deletePayment: jest.fn(),
}));
jest.mock('@/lib/payments/files-payments', () => ({
	uploadFilePayment: jest.fn(),
}));
jest.mock('@/lib/expenses/expenses', () => ({
	listExpenses: jest.fn(),
}));
jest.mock('@/lib/categories/categories', () => ({
	listCategories: jest.fn(),
}));
jest.mock('@/lib/works/works', () => ({
	listWorks: jest.fn(),
}));
jest.mock('@/lib/payment-methods/payment-methods', () => ({
	listPaymentMethods: jest.fn(),
}));
jest.mock('@/lib/cash-flow/cash-flow', () => ({
	listBankAccounts: jest.fn(),
}));

jest.mock(
	'@/components/business/cash-flow/collections-payments/collection-payment-form-dialog',
	() => ({
		CollectionPaymentFormDialog: ({
			open,
			expenseId,
			amount,
			workId,
			description,
			paymentMethodId,
			bankAccountId,
			receiptNumber,
			hideParty,
			attachmentsKind,
			descriptionMaxLength,
			saving,
			stagedFiles,
			onStagedFilesChange,
			onSubmit,
		}: any) => (
			<div data-testid="payment-dialog">
				<span data-testid="dialog-open">{open ? 'open' : 'closed'}</span>
				<span data-testid="dialog-expense-id">{expenseId}</span>
				<span data-testid="dialog-amount">{amount}</span>
				<span data-testid="dialog-work-id">{workId}</span>
				<span data-testid="dialog-description">{description}</span>
				<span data-testid="dialog-payment-method-id">{paymentMethodId}</span>
				<span data-testid="dialog-bank-account-id">{bankAccountId}</span>
				<span data-testid="dialog-receipt-number">{receiptNumber}</span>
				<span data-testid="dialog-hide-party">{hideParty ? 'true' : 'false'}</span>
				<span data-testid="dialog-attachments-kind">{attachmentsKind}</span>
				<span data-testid="dialog-description-max-length">{descriptionMaxLength}</span>
				<span data-testid="dialog-saving">{saving ? 'saving' : 'idle'}</span>
				<button
					onClick={() =>
						onStagedFilesChange?.([
							...(stagedFiles ?? []),
							{ id: 'a', file: new File(['x'], 'factura.pdf'), fileName: 'factura.pdf' },
						])
					}
				>
					Adjuntar
				</button>
				<button onClick={(e: any) => onSubmit(e)}>Guardar</button>
			</div>
		),
	})
);

function mockExpense(over: Partial<IncomeExpenseEntry> = {}): IncomeExpenseEntry {
	return {
		id: 10,
		date: '2026-04-01',
		voucher_number: '0001-00000456',
		voucher_type_id: 1,
		voucher_type_name: 'Factura A',
		work_id: 7,
		work_name: 'Obra Norte',
		party_id: null,
		party_name: 'Proveedor',
		category_id: 3,
		category_name: 'Materiales',
		description: 'Compra de cemento',
		net_amount: 413,
		iva_percent: 21,
		iva_amount: 87,
		total_amount: 500,
		payment_method_id: 2,
		payment_method_name: 'Transferencia',
		bank_account_id: 4,
		bank_account_name: 'Banco Nación - Cuenta principal',
		...over,
	};
}

describe('AddPaymentFromExpenseDialog', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(listPayments as jest.Mock).mockResolvedValue({ data: [], error: null });
		(listExpenses as jest.Mock).mockResolvedValue({ data: [], error: null });
		(listCategories as jest.Mock).mockResolvedValue({ data: [], error: null });
		(listWorks as jest.Mock).mockResolvedValue({ data: [], error: null });
		(listPaymentMethods as jest.Mock).mockResolvedValue({ data: [], error: null });
		(listBankAccounts as jest.Mock).mockResolvedValue({ data: [], error: null });
		(createPayment as jest.Mock).mockResolvedValue({ data: { id: 55 }, error: null });
		(uploadFilePayment as jest.Mock).mockResolvedValue({ data: { id: 1 }, error: null });
	});

	it('opens and prefills from the expense on mount', async () => {
		render(<AddPaymentFromExpenseDialog expense={mockExpense()} onClose={jest.fn()} />);

		await waitFor(() => expect(screen.getByTestId('dialog-open')).toHaveTextContent('open'));
		expect(screen.getByTestId('dialog-expense-id')).toHaveTextContent('10');
		expect(screen.getByTestId('dialog-amount')).toHaveTextContent('500');
		expect(screen.getByTestId('dialog-work-id')).toHaveTextContent('7');
		expect(screen.getByTestId('dialog-description')).toHaveTextContent('Compra de cemento');
		expect(screen.getByTestId('dialog-payment-method-id')).toHaveTextContent('2');
		expect(screen.getByTestId('dialog-bank-account-id')).toHaveTextContent('4');
		expect(screen.getByTestId('dialog-receipt-number')).toHaveTextContent('0001-00000456');
		expect(screen.getByTestId('dialog-hide-party')).toHaveTextContent('true');
		expect(screen.getByTestId('dialog-attachments-kind')).toHaveTextContent('payment');
		expect(screen.getByTestId('dialog-description-max-length')).toHaveTextContent('2000');
	});

	it('keeps a 1800-char description from the expense fully prefilled, uncut (usePayments allows up to 2000)', async () => {
		const longDescription = 'a'.repeat(1800);
		render(
			<AddPaymentFromExpenseDialog
				expense={mockExpense({ description: longDescription })}
				onClose={jest.fn()}
			/>
		);

		await waitFor(() => expect(screen.getByTestId('dialog-open')).toHaveTextContent('open'));

		expect(screen.getByTestId('dialog-description')).toHaveTextContent(longDescription);
		expect(screen.getByTestId('dialog-description-max-length')).toHaveTextContent('2000');
	});

	it('calls onClose after a successful save', async () => {
		const onClose = jest.fn();
		render(<AddPaymentFromExpenseDialog expense={mockExpense()} onClose={onClose} />);
		await waitFor(() => expect(screen.getByTestId('dialog-open')).toHaveTextContent('open'));

		fireEvent.click(screen.getByText('Guardar'));

		await waitFor(() => expect(createPayment).toHaveBeenCalled());
		await waitFor(() => expect(onClose).toHaveBeenCalled());
	});

	it('does not call onClose while the save is still in flight', async () => {
		let releaseCreate!: (value: any) => void;
		(createPayment as jest.Mock).mockImplementation(
			() => new Promise((resolve) => (releaseCreate = resolve))
		);
		const onClose = jest.fn();
		render(<AddPaymentFromExpenseDialog expense={mockExpense()} onClose={onClose} />);
		await waitFor(() => expect(screen.getByTestId('dialog-open')).toHaveTextContent('open'));

		fireEvent.click(screen.getByText('Guardar'));
		await waitFor(() => expect(screen.getByTestId('dialog-saving')).toHaveTextContent('saving'));

		expect(onClose).not.toHaveBeenCalled();

		releaseCreate({ data: { id: 55 }, error: null });
		await waitFor(() => expect(onClose).toHaveBeenCalled());
	});

	it('does not call onClose when the create fails with a generic error', async () => {
		(createPayment as jest.Mock).mockResolvedValue({ data: null, error: { message: 'boom' } });
		const onClose = jest.fn();
		render(<AddPaymentFromExpenseDialog expense={mockExpense()} onClose={onClose} />);
		await waitFor(() => expect(screen.getByTestId('dialog-open')).toHaveTextContent('open'));

		fireEvent.click(screen.getByText('Guardar'));

		await waitFor(() => expect(createPayment).toHaveBeenCalled());
		await waitFor(() => expect(screen.getByTestId('dialog-saving')).toHaveTextContent('idle'));
		expect(onClose).not.toHaveBeenCalled();
	});

	it('does not call onClose when the create succeeds without an id while a file is staged', async () => {
		(createPayment as jest.Mock).mockResolvedValue({ data: {}, error: null });
		const onClose = jest.fn();
		render(<AddPaymentFromExpenseDialog expense={mockExpense()} onClose={onClose} />);
		await waitFor(() => expect(screen.getByTestId('dialog-open')).toHaveTextContent('open'));

		fireEvent.click(screen.getByText('Adjuntar'));
		fireEvent.click(screen.getByText('Guardar'));

		await waitFor(() => expect(createPayment).toHaveBeenCalled());
		await waitFor(() => expect(screen.getByTestId('dialog-saving')).toHaveTextContent('idle'));
		expect(uploadFilePayment).not.toHaveBeenCalled();
		expect(onClose).not.toHaveBeenCalled();
	});
});
