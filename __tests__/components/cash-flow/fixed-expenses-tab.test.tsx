import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { FixedExpensesTab } from '@/components/business/cash-flow/fixed-expenses-tab';
import {
	listFixedExpenses,
	createFixedExpense,
	deactivateFixedExpense,
} from '@/lib/fixed-expenses/fixed-expenses';
import {
	deleteFixedExpensePayment,
	markFixedExpensePaid,
	unmarkFixedExpensePaid,
	listFixedExpensePayments,
	updateFixedExpensePayment,
} from '@/lib/fixed-expenses/fixed-expense-payments';
import { listCategories } from '@/lib/categories/categories';
import { listPaymentMethods } from '@/lib/payment-methods/payment-methods';
import { listActiveBankAccounts } from '@/lib/cash-flow/cash-flow';
import { getLocalDate } from '@/utils/format-date';

const mockToast = jest.fn();

jest.mock('@/components/ui/use-toast', () => ({
	useToast: () => ({ toast: mockToast }),
}));

jest.mock('@/lib/fixed-expenses/fixed-expenses', () => ({
	listFixedExpenses: jest.fn(),
	createFixedExpense: jest.fn(),
	updateFixedExpense: jest.fn(),
	deactivateFixedExpense: jest.fn(),
	reactivateFixedExpense: jest.fn(),
}));

jest.mock('@/lib/fixed-expenses/fixed-expense-payments', () => ({
	markFixedExpensePaid: jest.fn(),
	unmarkFixedExpensePaid: jest.fn(),
	listFixedExpensePayments: jest.fn(),
	updateFixedExpensePayment: jest.fn(),
	deleteFixedExpensePayment: jest.fn(),
}));

jest.mock('@/lib/categories/categories', () => ({
	listCategories: jest.fn(),
}));

jest.mock('@/lib/payment-methods/payment-methods', () => ({
	listPaymentMethods: jest.fn(),
}));

jest.mock('@/lib/cash-flow/cash-flow', () => ({
	listActiveBankAccounts: jest.fn(),
}));

jest.mock('@/lib/error-translator', () => ({
	translateError: jest.fn(),
}));

jest.mock('@/components/ui/select', () => ({
	Select: ({ children, onValueChange }: any) => (
		<select data-testid="select-native" onChange={(e) => onValueChange?.(e.target.value)}>
			{children}
		</select>
	),
	SelectTrigger: ({ children }: any) => <>{children}</>,
	SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
	SelectContent: ({ children }: any) => <>{children}</>,
	SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
}));

const CATEGORY = {
	id: 10,
	created_at: '2026-10-09T00:00:00Z',
	name: 'Alquiler oficina',
	kind: 'fixed_expense' as const,
	is_active: true,
};

const EXPENSE = {
	id: 1,
	created_at: '2026-10-09T00:00:00Z',
	category_id: 10,
	kind: 'fixed_expense' as const,
	amount: 50000,
	description: 'Alquiler mensual',
	is_active: true,
	is_paid: false,
	category_name: 'Alquiler oficina',
};

const PAID_EXPENSE = { ...EXPENSE, is_paid: true };

const PAYMENT_METHOD = {
	id: 7,
	created_at: '2026-10-09T00:00:00Z',
	name: 'Efectivo',
	is_active: true,
};

const PAYMENT = {
	id: 20,
	created_at: '2026-10-09T00:00:00Z',
	fixed_expense_id: 1,
	paid_date: '2026-10-05',
	period: '2026-10-01',
	net_amount: 50000,
	iva_percent: 0,
	iva_amount: 0,
	total_amount: 50000,
	payment_method_id: 7,
	bank_account_id: null,
	description: 'Alquiler mensual',
	category_id: 10,
	category_name: 'Alquiler oficina',
	payment_method_name: 'Efectivo',
	bank_account_label: null,
};

const desktop = async () => within(await screen.findByTestId('fixed-expenses-desktop'));
const paymentsDesktop = async () =>
	within(await screen.findByTestId('fixed-expense-payments-desktop'));

describe('FixedExpensesTab', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(listFixedExpenses as jest.Mock).mockResolvedValue({ data: [], error: null });
		(listCategories as jest.Mock).mockResolvedValue({ data: [CATEGORY], error: null });
		(createFixedExpense as jest.Mock).mockResolvedValue({ data: { id: 2 }, error: null });
		(deactivateFixedExpense as jest.Mock).mockResolvedValue({ data: { id: 1 }, error: null });
		(listPaymentMethods as jest.Mock).mockResolvedValue({ data: [PAYMENT_METHOD], error: null });
		(listActiveBankAccounts as jest.Mock).mockResolvedValue({ data: [], error: null });
		(listFixedExpensePayments as jest.Mock).mockResolvedValue({ data: [], error: null });
	});

	it('lists the fixed expenses fetched on mount', async () => {
		(listFixedExpenses as jest.Mock).mockResolvedValue({ data: [EXPENSE], error: null });

		render(<FixedExpensesTab />);

		const scope = await desktop();
		expect(await scope.findByText('Alquiler mensual')).toBeInTheDocument();
		expect(scope.getByText('Alquiler oficina')).toBeInTheDocument();
	});

	it('shows the empty state when there are no fixed expenses', async () => {
		render(<FixedExpensesTab />);

		expect(await screen.findByText('No hay costos fijos registrados')).toBeInTheDocument();
	});

	it('creates a fixed expense with the description trimmed before submitting', async () => {
		render(<FixedExpensesTab />);
		await waitFor(() => expect(listFixedExpenses).toHaveBeenCalled());

		fireEvent.click(screen.getByText('Nuevo costo fijo'));
		await screen.findByRole('option', { name: 'Alquiler oficina' });

		const formDialog = within(screen.getByRole('dialog'));
		fireEvent.change(formDialog.getByTestId('select-native'), { target: { value: '10' } });
		fireEvent.change(screen.getByLabelText('Concepto'), {
			target: { value: '  Alquiler mensual  ' },
		});
		fireEvent.change(screen.getByLabelText('Monto'), { target: { value: '50000' } });

		expect(screen.getByLabelText('Monto')).toHaveValue('50.000');

		fireEvent.submit(screen.getByLabelText('Concepto').closest('form')!);

		await waitFor(() => {
			expect(createFixedExpense).toHaveBeenCalledWith({
				category_id: 10,
				amount: 50000,
				description: 'Alquiler mensual',
			});
		});
	});

	it('prefills the amount input formatted when editing an existing fixed expense', async () => {
		(listFixedExpenses as jest.Mock).mockResolvedValue({ data: [EXPENSE], error: null });

		render(<FixedExpensesTab />);
		const scope = await desktop();
		await scope.findByText('Alquiler mensual');

		fireEvent.click(scope.getByRole('button', { name: 'Editar' }));

		expect(await screen.findByLabelText('Monto')).toHaveValue('50.000');
	});

	it('opens the payment form when toggling an expense to paid, without calling anything yet', async () => {
		(listFixedExpenses as jest.Mock).mockResolvedValue({ data: [EXPENSE], error: null });

		render(<FixedExpensesTab />);
		const scope = await desktop();
		await scope.findByText('Alquiler mensual');

		fireEvent.click(scope.getByRole('switch'));

		expect(await screen.findByRole('heading', { name: 'Registrar pago' })).toBeInTheDocument();
		expect(markFixedExpensePaid).not.toHaveBeenCalled();
	});

	it('submits the payment form with the parsed net, selected method and current month as period', async () => {
		(listFixedExpenses as jest.Mock).mockResolvedValue({ data: [EXPENSE], error: null });
		(markFixedExpensePaid as jest.Mock).mockResolvedValue({ data: { id: 1 }, error: null });

		render(<FixedExpensesTab />);
		const scope = await desktop();
		await scope.findByText('Alquiler mensual');

		fireEvent.click(scope.getByRole('switch'));
		await screen.findByRole('heading', { name: 'Registrar pago' });

		const dialog = within(screen.getByRole('dialog'));
		await dialog.findByRole('option', { name: 'Efectivo' });
		const selects = dialog.getAllByTestId('select-native');
		fireEvent.change(selects[1], { target: { value: '7' } });

		fireEvent.submit(dialog.getByLabelText('Neto').closest('form')!);

		const today = getLocalDate();
		await waitFor(() => {
			expect(markFixedExpensePaid).toHaveBeenCalledWith({
				fixed_expense_id: 1,
				paid_date: today,
				period: `${today.slice(0, 7)}-01`,
				net_amount: 50000,
				iva_percent: 0,
				payment_method_id: 7,
				bank_account_id: null,
			});
		});
	});

	it('does not call markFixedExpensePaid when the payment form is cancelled', async () => {
		(listFixedExpenses as jest.Mock).mockResolvedValue({ data: [EXPENSE], error: null });

		render(<FixedExpensesTab />);
		const scope = await desktop();
		await scope.findByText('Alquiler mensual');

		fireEvent.click(scope.getByRole('switch'));
		await screen.findByRole('heading', { name: 'Registrar pago' });

		const dialog = within(screen.getByRole('dialog'));
		fireEvent.click(dialog.getByText('Cancelar'));

		expect(markFixedExpensePaid).not.toHaveBeenCalled();
	});

	it('asks for confirmation before unmarking a paid fixed expense, then calls unmarkFixedExpensePaid', async () => {
		(listFixedExpenses as jest.Mock).mockResolvedValue({ data: [PAID_EXPENSE], error: null });
		(unmarkFixedExpensePaid as jest.Mock).mockResolvedValue({ data: { id: 1 }, error: null });

		render(<FixedExpensesTab />);
		const scope = await desktop();
		await scope.findByText('Alquiler mensual');

		fireEvent.click(scope.getByRole('switch'));

		const alertDialog = within(screen.getByRole('alertdialog'));
		expect(alertDialog.getByText('¿Desmarcar como pagado?')).toBeInTheDocument();
		expect(unmarkFixedExpensePaid).not.toHaveBeenCalled();

		fireEvent.click(alertDialog.getByText('Desmarcar'));

		await waitFor(() => {
			expect(unmarkFixedExpensePaid).toHaveBeenCalledWith(1);
		});
	});

	it('does not unmark a fixed expense when the confirmation is cancelled', async () => {
		(listFixedExpenses as jest.Mock).mockResolvedValue({ data: [PAID_EXPENSE], error: null });

		render(<FixedExpensesTab />);
		const scope = await desktop();
		await scope.findByText('Alquiler mensual');

		fireEvent.click(scope.getByRole('switch'));

		const alertDialog = within(screen.getByRole('alertdialog'));
		fireEvent.click(alertDialog.getByText('Cancelar'));

		expect(unmarkFixedExpensePaid).not.toHaveBeenCalled();
	});

	it('shows the segmented control with the fixed costs view selected by default', async () => {
		render(<FixedExpensesTab />);
		await waitFor(() => expect(listFixedExpenses).toHaveBeenCalled());

		const switcher = within(screen.getByRole('tablist', { name: 'Vista de costos fijos' }));
		expect(switcher.getByRole('tab', { name: 'Costos fijos' })).toHaveAttribute(
			'aria-selected',
			'true'
		);
		expect(switcher.getByRole('tab', { name: 'Pagos registrados' })).toHaveAttribute(
			'aria-selected',
			'false'
		);
	});

	it('switches to the registered payments view when its segmented control option is clicked', async () => {
		render(<FixedExpensesTab />);
		await waitFor(() => expect(listFixedExpenses).toHaveBeenCalled());

		fireEvent.click(screen.getByRole('tab', { name: 'Pagos registrados' }));

		expect(await screen.findByText('No hay pagos registrados')).toBeInTheDocument();
		expect(listFixedExpenses).toHaveBeenCalledTimes(1);
	});

	it('keeps a single shared year select visible across both views', async () => {
		render(<FixedExpensesTab />);
		await waitFor(() => expect(listFixedExpenses).toHaveBeenCalled());

		expect(screen.getByTestId('select-native')).toBeInTheDocument();

		fireEvent.click(screen.getByRole('tab', { name: 'Pagos registrados' }));

		expect(screen.getAllByTestId('select-native')).toHaveLength(1);
	});

	it('asks for confirmation before deactivating a fixed expense', async () => {
		(listFixedExpenses as jest.Mock).mockResolvedValue({ data: [EXPENSE], error: null });

		render(<FixedExpensesTab />);
		const scope = await desktop();
		await scope.findByText('Alquiler mensual');

		fireEvent.click(scope.getByRole('button', { name: 'Desactivar' }));

		const alertDialog = within(screen.getByRole('alertdialog'));
		expect(alertDialog.getByText('¿Desactivar costo fijo?')).toBeInTheDocument();
		expect(deactivateFixedExpense).not.toHaveBeenCalled();

		fireEvent.click(alertDialog.getByText('Desactivar'));

		await waitFor(() => {
			expect(deactivateFixedExpense).toHaveBeenCalledWith(1);
		});
	});

	it('prefills the edit form from a registered payment and submits the updated values', async () => {
		(listFixedExpensePayments as jest.Mock).mockResolvedValue({ data: [PAYMENT], error: null });
		(updateFixedExpensePayment as jest.Mock).mockResolvedValue({ data: { id: 20 }, error: null });

		render(<FixedExpensesTab />);
		await waitFor(() => expect(listFixedExpenses).toHaveBeenCalled());

		fireEvent.click(screen.getByRole('tab', { name: 'Pagos registrados' }));
		const paymentsScope = await paymentsDesktop();
		await paymentsScope.findByText('Alquiler mensual');

		fireEvent.click(paymentsScope.getByRole('button', { name: 'Editar pago' }));

		expect(await screen.findByRole('heading', { name: 'Editar pago' })).toBeInTheDocument();
		expect(screen.getByLabelText('Concepto')).toHaveValue('Alquiler mensual');
		expect(screen.getByLabelText('Neto')).toHaveValue('50.000');

		const dialog = within(screen.getByRole('dialog'));
		await dialog.findByRole('option', { name: 'Efectivo' });
		const selects = dialog.getAllByTestId('select-native');
		fireEvent.change(selects[1], { target: { value: '7' } });

		fireEvent.submit(dialog.getByLabelText('Neto').closest('form')!);

		await waitFor(() => {
			expect(updateFixedExpensePayment).toHaveBeenCalledWith({
				payment_id: 20,
				paid_date: '2026-10-05',
				period: '2026-10-01',
				net_amount: 50000,
				iva_percent: 0,
				payment_method_id: 7,
				bank_account_id: null,
			});
		});
	});

	it('asks for confirmation before deleting a payment, then calls deleteFixedExpensePayment', async () => {
		(listFixedExpensePayments as jest.Mock).mockResolvedValue({ data: [PAYMENT], error: null });
		(deleteFixedExpensePayment as jest.Mock).mockResolvedValue({ error: null });

		render(<FixedExpensesTab />);
		await waitFor(() => expect(listFixedExpenses).toHaveBeenCalled());

		fireEvent.click(screen.getByRole('tab', { name: 'Pagos registrados' }));
		const paymentsScope = await paymentsDesktop();
		await paymentsScope.findByText('Alquiler mensual');

		fireEvent.click(paymentsScope.getByRole('button', { name: 'Eliminar pago' }));

		const alertDialog = within(screen.getByRole('alertdialog'));
		expect(alertDialog.getByText('¿Eliminar pago?')).toBeInTheDocument();
		expect(deleteFixedExpensePayment).not.toHaveBeenCalled();

		fireEvent.click(alertDialog.getByText('Eliminar'));

		await waitFor(() => {
			expect(deleteFixedExpensePayment).toHaveBeenCalledWith(20);
		});
	});

	it('does not delete a payment when the confirmation is cancelled', async () => {
		(listFixedExpensePayments as jest.Mock).mockResolvedValue({ data: [PAYMENT], error: null });

		render(<FixedExpensesTab />);
		await waitFor(() => expect(listFixedExpenses).toHaveBeenCalled());

		fireEvent.click(screen.getByRole('tab', { name: 'Pagos registrados' }));
		const paymentsScope = await paymentsDesktop();
		await paymentsScope.findByText('Alquiler mensual');

		fireEvent.click(paymentsScope.getByRole('button', { name: 'Eliminar pago' }));

		const alertDialog = within(screen.getByRole('alertdialog'));
		fireEvent.click(alertDialog.getByText('Cancelar'));

		expect(deleteFixedExpensePayment).not.toHaveBeenCalled();
	});
});
