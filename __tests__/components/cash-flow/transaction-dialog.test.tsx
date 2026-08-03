import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TransactionDialog } from '@/components/business/cash-flow/transaction-dialog';
import { createTransaction } from '@/lib/cash-flow/cash-flow';
import { translateError } from '@/lib/error-translator';
import { toast } from '@/components/ui/use-toast';

jest.mock('@/components/ui/use-toast', () => ({
	toast: jest.fn(),
}));

jest.mock('@/lib/cash-flow/cash-flow', () => ({
	createTransaction: jest.fn(),
}));

jest.mock('@/lib/error-translator', () => ({
	translateError: jest.fn(),
}));

jest.mock('@/utils/formats-money', () => ({
	formatNumber: (v: string) => v,
	parseArsToNumber: (v: string) => (v === '' ? NaN : Number(v)),
}));

jest.mock('@/constants/balances/payment_methods', () => ({
	PAYMENT_METHODS: [
		{ value: 'cash', label: 'Efectivo' },
		{ value: 'bank_transfer', label: 'Transferencia' },
	],
}));

jest.mock('@/constants/cashflow/cashflow', () => ({
	EXPENSES_CATEGORIES: [
		{ value: 'insumos', label: 'Insumos' },
		{ value: 'servicios', label: 'Servicios' },
	],
}));

const mockBankAccounts = [
	{
		id: 1,
		name: 'Cuenta Principal',
		bank: 'Santander',
		account_number: '123456',
		account_type: 'checking',
		is_active: true,
	},
];

function renderDialog(overrides = {}) {
	const props = {
		open: true,
		onOpenChange: jest.fn(),
		type: 'income' as 'income' | 'expense',
		cashBoxId: 1,
		bankAccounts: mockBankAccounts as any,
		onTransactionCreated: jest.fn(),
		...overrides,
	};
	const utils = render(<TransactionDialog {...props} />);
	return { ...props, ...utils };
}

function selectCategory(label: string) {
	fireEvent.click(screen.getByText(/Selecciona un método de pago|Selecciona una categoría/));
	fireEvent.click(screen.getByRole('option', { name: label }));
}

describe('TransactionDialog', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(createTransaction as jest.Mock).mockResolvedValue({ data: {}, error: null });
	});

	it('renders income copy when type is "income"', () => {
		renderDialog({ type: 'income' });

		expect(screen.getByText('Registrar Ingreso')).toBeInTheDocument();
		expect(screen.getByText('Registra un nuevo ingreso a la caja actual')).toBeInTheDocument();
		expect(screen.getByText('Método de pago')).toBeInTheDocument();
	});

	it('renders expense copy when type is "expense"', () => {
		renderDialog({ type: 'expense' });

		expect(screen.getByText('Registrar Egreso')).toBeInTheDocument();
		expect(screen.getByText('Registra un nuevo egreso de la caja actual')).toBeInTheDocument();
		expect(screen.getByText('Categoría')).toBeInTheDocument();
	});

	it('shows PAYMENT_METHODS options for income', () => {
		renderDialog({ type: 'income' });

		fireEvent.click(screen.getByText('Selecciona un método de pago'));

		expect(screen.getByRole('option', { name: 'Efectivo' })).toBeInTheDocument();
		expect(screen.getByRole('option', { name: 'Transferencia' })).toBeInTheDocument();
	});

	it('shows EXPENSES_CATEGORIES options for expense', () => {
		renderDialog({ type: 'expense' });

		fireEvent.click(screen.getByText('Selecciona una categoría'));

		expect(screen.getByRole('option', { name: 'Insumos' })).toBeInTheDocument();
		expect(screen.getByRole('option', { name: 'Servicios' })).toBeInTheDocument();
	});

	it('does not show the bank account select by default', () => {
		renderDialog();

		expect(screen.queryByText('Cuenta Bancaria')).not.toBeInTheDocument();
	});

	it('shows the bank account select when category is "bank_transfer"', () => {
		renderDialog({ type: 'income' });

		selectCategory('Transferencia');

		expect(screen.getByText('Cuenta Bancaria')).toBeInTheDocument();
		expect(screen.getByText('Santander - Cuenta Principal (123456)')).toBeInTheDocument();
	});

	it('silently does nothing when the amount parses to a non-positive number', async () => {
		renderDialog();

		fireEvent.change(screen.getByLabelText('Monto'), { target: { value: '0' } });
		selectCategory('Efectivo');

		fireEvent.click(screen.getByText('Guardar'));

		expect(toast).toHaveBeenCalledWith(
			expect.objectContaining({
				variant: 'destructive',
				title: 'Error',
				description: 'Por favor ingresa un monto válido.',
			})
		);
		expect(createTransaction).not.toHaveBeenCalled();
	});

	it('creates an income transaction with the correct payload and resets the form', async () => {
		const onTransactionCreated = jest.fn();
		renderDialog({ type: 'income', cashBoxId: 42, onTransactionCreated });

		fireEvent.change(screen.getByLabelText('Monto'), { target: { value: '50000' } });
		selectCategory('Efectivo');
		fireEvent.change(screen.getByLabelText('Descripción (opcional)'), {
			target: { value: 'Venta del día' },
		});

		fireEvent.click(screen.getByText('Guardar'));

		await waitFor(() => {
			expect(createTransaction).toHaveBeenCalledWith({
				cash_box_id: 42,
				type: 'income',
				amount: 50000,
				category: 'cash',
				description: 'Venta del día',
				bank_account_id: null,
			});
		});

		expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Ingreso registrado' }));
		expect(onTransactionCreated).toHaveBeenCalled();
		expect(screen.getByLabelText('Monto')).toHaveValue('');
	});

	it('creates an expense transaction with null description when left empty', async () => {
		renderDialog({ type: 'expense' });

		fireEvent.change(screen.getByLabelText('Monto'), { target: { value: '15000' } });
		selectCategory('Insumos');

		fireEvent.click(screen.getByText('Guardar'));

		await waitFor(() => {
			expect(createTransaction).toHaveBeenCalledWith(
				expect.objectContaining({ type: 'expense', category: 'insumos', description: null })
			);
		});

		expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Egreso registrado' }));
	});

	it('includes bank_account_id only when category is bank_transfer and an account is selected', async () => {
		renderDialog({ type: 'income' });

		fireEvent.change(screen.getByLabelText('Monto'), { target: { value: '20000' } });
		selectCategory('Transferencia');

		fireEvent.click(screen.getByText('Selecciona una cuenta'));
		fireEvent.click(screen.getByRole('option', { name: 'Santander - Cuenta Principal (123456)' }));

		fireEvent.click(screen.getByText('Guardar'));

		await waitFor(() => {
			expect(createTransaction).toHaveBeenCalledWith(
				expect.objectContaining({ category: 'bank_transfer', bank_account_id: 1 })
			);
		});
	});

	it('sends bank_account_id as null when category is bank_transfer but no account was chosen', async () => {
		renderDialog({ type: 'income' });

		fireEvent.change(screen.getByLabelText('Monto'), { target: { value: '20000' } });
		selectCategory('Transferencia');

		fireEvent.click(screen.getByText('Guardar'));

		await waitFor(() => {
			expect(createTransaction).toHaveBeenCalledWith(
				expect.objectContaining({ bank_account_id: null })
			);
		});
	});

	it('shows an error toast and does not call onTransactionCreated when the API call fails', async () => {
		(createTransaction as jest.Mock).mockResolvedValue({
			data: null,
			error: { message: 'db error' },
		});
		(translateError as jest.Mock).mockReturnValue('No se pudo registrar');
		const onTransactionCreated = jest.fn();
		renderDialog({ onTransactionCreated });

		fireEvent.change(screen.getByLabelText('Monto'), { target: { value: '10000' } });
		selectCategory('Efectivo');
		fireEvent.click(screen.getByText('Guardar'));

		await waitFor(() => {
			expect(toast).toHaveBeenCalledWith(
				expect.objectContaining({
					variant: 'destructive',
					title: 'Error',
					description: 'No se pudo registrar',
				})
			);
		});
		expect(onTransactionCreated).not.toHaveBeenCalled();
	});

	it('falls back to a default error message when translateError returns nothing', async () => {
		(createTransaction as jest.Mock).mockResolvedValue({
			data: null,
			error: { message: 'db error' },
		});
		(translateError as jest.Mock).mockReturnValue(undefined);
		renderDialog();

		fireEvent.change(screen.getByLabelText('Monto'), { target: { value: '10000' } });
		selectCategory('Efectivo');
		fireEvent.click(screen.getByText('Guardar'));

		await waitFor(() => {
			expect(toast).toHaveBeenCalledWith(
				expect.objectContaining({
					description: 'No se pudo registrar la transacción.',
				})
			);
		});
	});

	it('shows "Guardando..." and disables the submit button while submitting', async () => {
		let resolvePromise: (value: any) => void;
		(createTransaction as jest.Mock).mockReturnValue(
			new Promise((resolve) => {
				resolvePromise = resolve;
			})
		);
		renderDialog();

		fireEvent.change(screen.getByLabelText('Monto'), { target: { value: '10000' } });
		selectCategory('Efectivo');
		fireEvent.click(screen.getByText('Guardar'));

		expect(await screen.findByText('Guardando...')).toBeDisabled();

		resolvePromise!({ data: {}, error: null });

		await waitFor(() => {
			expect(screen.queryByText('Guardando...')).not.toBeInTheDocument();
		});
	});

	it('calls onOpenChange(false) and resets the form when cancel is clicked', () => {
		const onOpenChange = jest.fn();
		renderDialog({ onOpenChange });

		fireEvent.change(screen.getByLabelText('Monto'), { target: { value: '5000' } });
		fireEvent.click(screen.getByText('Cancelar'));

		expect(onOpenChange).toHaveBeenCalledWith(false);
	});
});
