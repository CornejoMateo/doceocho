import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExpensesTab } from '@/components/business/cash-flow/incomes-expenses/expenses-tab';
import { useExpenses } from '@/hooks/expenses/use-expenses';
import type { IncomeExpenseEntry } from '@/hooks/income-expense/use-income-expense-tab';
import { listPayments, createPayment } from '@/lib/payments/payments';
import { uploadFilePayment } from '@/lib/payments/files-payments';
import { listExpenses } from '@/lib/expenses/expenses';
import { listCategories } from '@/lib/categories/categories';
import { listWorks } from '@/lib/works/works';
import { listPaymentMethods } from '@/lib/payment-methods/payment-methods';
import { listBankAccounts } from '@/lib/cash-flow/cash-flow';

jest.mock('@/hooks/expenses/use-expenses', () => ({
	useExpenses: jest.fn(),
}));

// Real usePayments + useCollectionPaymentTab run here; only the data-layer calls they make
// are mocked, so the "no fetch until clicked" assertion exercises the real wiring.
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

// Name must start with "mock" (case-insensitive): babel-plugin-jest-hoist only allows such
// out-of-scope references inside a jest.mock() factory.
function mockStubExpenseEntry(over: Partial<IncomeExpenseEntry> = {}): IncomeExpenseEntry {
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

jest.mock('@/components/business/cash-flow/incomes-expenses/income-expense-tab', () => ({
	IncomeExpenseTab: ({
		state,
		entityLabel,
		partyLabel,
		addLabel,
		emptyLabel,
		categoriesConfig,
		onAddPayment,
		cascadeDeleteWarning,
		lockPartyOnEdit,
	}: any) => (
		<div>
			<span data-testid="entity-label">{entityLabel}</span>
			<span data-testid="party-label">{partyLabel}</span>
			<span data-testid="add-label">{addLabel}</span>
			<span data-testid="empty-label">{emptyLabel}</span>
			<span data-testid="year">{state.year}</span>
			<span data-testid="cascade-delete-warning">{cascadeDeleteWarning ? 'true' : 'false'}</span>
			<span data-testid="lock-party-on-edit">{lockPartyOnEdit ? 'true' : 'false'}</span>
			{categoriesConfig}
			{onAddPayment && (
				<button onClick={() => onAddPayment(mockStubExpenseEntry())}>Agregar pago</button>
			)}
		</div>
	),
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
				<span data-testid="dialog-staged-count">{(stagedFiles ?? []).length}</span>
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

describe('ExpensesTab', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(useExpenses as jest.Mock).mockReturnValue({ year: 2026, fetchEntries: jest.fn() });
		(listPayments as jest.Mock).mockResolvedValue({ data: [], error: null });
		(listExpenses as jest.Mock).mockResolvedValue({ data: [], error: null });
		(listCategories as jest.Mock).mockResolvedValue({ data: [], error: null });
		(listWorks as jest.Mock).mockResolvedValue({ data: [], error: null });
		(listPaymentMethods as jest.Mock).mockResolvedValue({ data: [], error: null });
		(listBankAccounts as jest.Mock).mockResolvedValue({ data: [], error: null });
		(createPayment as jest.Mock).mockResolvedValue({ data: { id: 55 }, error: null });
		(uploadFilePayment as jest.Mock).mockResolvedValue({ data: { id: 1 }, error: null });
	});

	it('wires useExpenses state and expense-specific labels into IncomeExpenseTab', () => {
		render(<ExpensesTab categoriesConfig={<button>Configurar categorías</button>} />);

		expect(screen.getByTestId('entity-label')).toHaveTextContent('gasto');
		expect(screen.getByTestId('party-label')).toHaveTextContent('Proveedor');
		expect(screen.getByTestId('add-label')).toHaveTextContent('Nuevo gasto');
		expect(screen.getByTestId('empty-label')).toHaveTextContent('No hay gastos registrados');
		expect(screen.getByTestId('year')).toHaveTextContent('2026');
		expect(screen.getByText('Configurar categorías')).toBeInTheDocument();
	});

	it('enables cascadeDeleteWarning (Gastos-only; Ingresos never sets it)', () => {
		render(<ExpensesTab categoriesConfig={null} />);

		expect(screen.getByTestId('cascade-delete-warning')).toHaveTextContent('true');
	});

	it('enables lockPartyOnEdit (Gastos-only; Ingresos never sets it)', () => {
		render(<ExpensesTab categoriesConfig={null} />);

		expect(screen.getByTestId('lock-party-on-edit')).toHaveTextContent('true');
	});

	it('does not fetch the Payments domain when the Gastos tab mounts', () => {
		render(<ExpensesTab categoriesConfig={null} />);

		expect(screen.queryByTestId('payment-dialog')).not.toBeInTheDocument();
		expect(listPayments).not.toHaveBeenCalled();
		expect(listExpenses).not.toHaveBeenCalled();
		expect(listCategories).not.toHaveBeenCalled();
		expect(listWorks).not.toHaveBeenCalled();
		expect(listPaymentMethods).not.toHaveBeenCalled();
		expect(listBankAccounts).not.toHaveBeenCalled();
	});

	it('fetches the Payments domain and opens the dialog prefilled only after "Agregar pago" is clicked', async () => {
		render(<ExpensesTab categoriesConfig={null} />);

		fireEvent.click(screen.getByText('Agregar pago'));

		await waitFor(() => expect(screen.getByTestId('dialog-open')).toHaveTextContent('open'));
		expect(listPayments).toHaveBeenCalled();
		expect(listExpenses).toHaveBeenCalled();
		expect(listCategories).toHaveBeenCalled();
		expect(listWorks).toHaveBeenCalled();
		expect(listPaymentMethods).toHaveBeenCalled();
		expect(listBankAccounts).toHaveBeenCalled();

		expect(screen.getByTestId('dialog-expense-id')).toHaveTextContent('10');
		expect(screen.getByTestId('dialog-amount')).toHaveTextContent('500');
		expect(screen.getByTestId('dialog-work-id')).toHaveTextContent('7');
		expect(screen.getByTestId('dialog-description')).toHaveTextContent('Compra de cemento');
		expect(screen.getByTestId('dialog-payment-method-id')).toHaveTextContent('2');
		expect(screen.getByTestId('dialog-bank-account-id')).toHaveTextContent('4');
		expect(screen.getByTestId('dialog-receipt-number')).toHaveTextContent('0001-00000456');
		expect(screen.getByTestId('dialog-hide-party')).toHaveTextContent('true');
		expect(screen.getByTestId('dialog-attachments-kind')).toHaveTextContent('payment');
	});

	it('sends expense_id on save and unmounts the dialog (and its usePayments instance) after saving', async () => {
		render(<ExpensesTab categoriesConfig={null} />);

		fireEvent.click(screen.getByText('Agregar pago'));
		await waitFor(() => expect(screen.getByTestId('dialog-open')).toHaveTextContent('open'));

		fireEvent.click(screen.getByText('Guardar'));

		await waitFor(() =>
			expect(createPayment).toHaveBeenCalledWith(expect.objectContaining({ expense_id: 10 }))
		);
		await waitFor(() => expect(screen.queryByTestId('payment-dialog')).not.toBeInTheDocument());
	});

	it('uploads a staged file to the newly created payment id ("Agregar pago" from Gasto flow)', async () => {
		render(<ExpensesTab categoriesConfig={null} />);

		fireEvent.click(screen.getByText('Agregar pago'));
		await waitFor(() => expect(screen.getByTestId('dialog-open')).toHaveTextContent('open'));

		fireEvent.click(screen.getByText('Adjuntar'));
		expect(screen.getByTestId('dialog-staged-count')).toHaveTextContent('1');

		fireEvent.click(screen.getByText('Guardar'));

		await waitFor(() =>
			expect(uploadFilePayment).toHaveBeenCalledWith(55, expect.any(File), null, 'factura.pdf')
		);
		await waitFor(() => expect(screen.queryByTestId('payment-dialog')).not.toBeInTheDocument());
	});
});
