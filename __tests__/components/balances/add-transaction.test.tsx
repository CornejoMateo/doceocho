import { render, screen, fireEvent } from '@testing-library/react';
import { AddTransactionSection } from '@/components/business/balances/transactions/add-transaction';
import { useOptimizedRealtime } from '@/hooks/use-optimized-realtime';
import { listActiveBankAccounts } from '@/lib/cash-flow/cash-flow';

jest.mock('@/hooks/use-optimized-realtime', () => ({
	useOptimizedRealtime: jest.fn(),
}));

jest.mock('@/lib/cash-flow/cash-flow', () => ({
	listActiveBankAccounts: jest.fn(),
}));

const mockBankAccounts = [
	{
		id: 1,
		name: 'Cuenta Principal',
		bank: 'Santander',
		account_number: '123456',
		account_type: 'Checking',
		is_active: true,
	},
	{
		id: 2,
		name: 'Cuenta Secundaria',
		bank: 'BBVA',
		account_number: '789012',
		account_type: 'Savings',
		is_active: true,
	},
];

const mockPaymentMethodOptions = [
	{ id: 1, created_at: '2024-01-01', name: 'Efectivo', is_active: true },
	{ id: 2, created_at: '2024-01-01', name: 'Transferencia Bancaria', is_active: true },
];

const mockCategoryOptions = [
	{ id: 1, created_at: '2024-01-01', name: 'Alquiler', kind: 'collection', is_active: true },
	{ id: 2, created_at: '2024-01-01', name: 'Materiales', kind: 'collection', is_active: true },
];

const defaultProps = {
	addingMode: null as 'transaction' | null,
	transactionDate: new Date('2024-06-15'),
	onTransactionDateChange: jest.fn(),
	transactionAmount: '',
	onTransactionAmountChange: jest.fn(),
	notes: '',
	onNotesChange: jest.fn(),
	paymentMethodId: '',
	onPaymentMethodIdChange: jest.fn(),
	paymentMethodOptions: mockPaymentMethodOptions,
	bankAccountId: '',
	onBankAccountIdChange: jest.fn(),
	receiptNumber: '',
	onReceiptNumberChange: jest.fn(),
	categoryId: '',
	onCategoryIdChange: jest.fn(),
	categoryOptions: mockCategoryOptions as any,
	onCancel: jest.fn(),
	onSave: jest.fn(),
	onStartAddTransaction: jest.fn(),
	saveDisabled: false,
	editingTransaction: undefined,
	selectedFiles: [],
	onFilesSelect: jest.fn(),
	onRemoveFile: jest.fn(),
};

describe('AddTransactionSection', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(listActiveBankAccounts as jest.Mock).mockResolvedValue({ data: [], error: null });
		(useOptimizedRealtime as jest.Mock).mockReturnValue({
			data: [],
			loading: false,
			refresh: jest.fn(),
		});
	});

	it('renders add buttons when no mode is active', () => {
		render(<AddTransactionSection {...defaultProps} />);

		expect(screen.getByText('Agregar transacción')).toBeInTheDocument();
	});

	it('calls onStartAddTransaction when transaction button is clicked', () => {
		const onStartAddTransaction = jest.fn();
		render(
			<AddTransactionSection {...defaultProps} onStartAddTransaction={onStartAddTransaction} />
		);

		fireEvent.click(screen.getByText('Agregar transacción'));
		expect(onStartAddTransaction).toHaveBeenCalled();
	});

	it('renders form when adding a transaction', () => {
		render(<AddTransactionSection {...defaultProps} addingMode="transaction" />);

		expect(screen.getByText('Nueva transacción')).toBeInTheDocument();
		expect(screen.getByText('Guardar')).toBeInTheDocument();
		expect(screen.getByText('Cancelar')).toBeInTheDocument();
	});

	it('renders "Editar transacción" when editing', () => {
		render(
			<AddTransactionSection
				{...defaultProps}
				addingMode="transaction"
				editingTransaction={{ id: 1 } as any}
			/>
		);

		expect(screen.getByText('Editar transacción')).toBeInTheDocument();
		expect(screen.getByText('Actualizar')).toBeInTheDocument();
	});

	it('calls onSave when save button is clicked', () => {
		const onSave = jest.fn();
		render(<AddTransactionSection {...defaultProps} addingMode="transaction" onSave={onSave} />);

		fireEvent.click(screen.getByText('Guardar'));
		expect(onSave).toHaveBeenCalled();
	});

	it('does not call onSave when disabled and clicked', () => {
		const onSave = jest.fn();
		render(
			<AddTransactionSection
				{...defaultProps}
				addingMode="transaction"
				saveDisabled
				onSave={onSave}
			/>
		);

		fireEvent.click(screen.getByText('Guardando...'));
		expect(onSave).not.toHaveBeenCalled();
	});

	it('calls onCancel when cancel button is clicked', () => {
		const onCancel = jest.fn();
		render(
			<AddTransactionSection {...defaultProps} addingMode="transaction" onCancel={onCancel} />
		);

		fireEvent.click(screen.getByText('Cancelar'));
		expect(onCancel).toHaveBeenCalled();
	});

	it('disables save button when saveDisabled is true', () => {
		render(
			<AddTransactionSection {...defaultProps} addingMode="transaction" saveDisabled={true} />
		);

		expect(screen.getByText('Guardando...')).toBeDisabled();
	});

	it('shows payment method select for transactions', () => {
		render(<AddTransactionSection {...defaultProps} addingMode="transaction" />);

		expect(screen.getByText('Método de pago')).toBeInTheDocument();
	});

	it('shows selected files', () => {
		const files = [new File([''], 'test.pdf'), new File([''], 'image.jpg')];
		render(
			<AddTransactionSection {...defaultProps} addingMode="transaction" selectedFiles={files} />
		);

		expect(screen.getByText('test.pdf')).toBeInTheDocument();
		expect(screen.getByText('image.jpg')).toBeInTheDocument();
	});

	it('calls onRemoveFile when file remove button is clicked', () => {
		const onRemoveFile = jest.fn();
		const files = [new File([''], 'test.pdf')];
		render(
			<AddTransactionSection
				{...defaultProps}
				addingMode="transaction"
				selectedFiles={files}
				onRemoveFile={onRemoveFile}
			/>
		);

		const removeButton = screen.getByRole('button', { name: 'Eliminar test.pdf' });
		fireEvent.click(removeButton);
		expect(onRemoveFile).toHaveBeenCalledWith(0);
	});

	it('calls onFilesSelect when files are chosen via the file input', () => {
		const onFilesSelect = jest.fn();
		render(
			<AddTransactionSection
				{...defaultProps}
				addingMode="transaction"
				onFilesSelect={onFilesSelect}
			/>
		);

		const file = new File(['contenido'], 'nuevo.pdf', { type: 'application/pdf' });
		const input = document.getElementById('transaction-file') as HTMLInputElement;

		fireEvent.change(input, { target: { files: [file] } });

		expect(onFilesSelect).toHaveBeenCalledWith([file]);
	});

	it('calls onTransactionAmountChange when amount input changes', () => {
		const onTransactionAmountChange = jest.fn();
		render(
			<AddTransactionSection
				{...defaultProps}
				addingMode="transaction"
				onTransactionAmountChange={onTransactionAmountChange}
			/>
		);

		const amountInput = screen.getByLabelText('Monto en pesos');
		fireEvent.change(amountInput, { target: { value: '500' } });
		expect(onTransactionAmountChange).toHaveBeenCalledWith('500');
	});

	it('calls onNotesChange when notes input changes', () => {
		const onNotesChange = jest.fn();
		render(
			<AddTransactionSection
				{...defaultProps}
				addingMode="transaction"
				onNotesChange={onNotesChange}
			/>
		);

		const notesInput = screen.getByLabelText('Observaciones');
		fireEvent.change(notesInput, { target: { value: 'Pago de proveedor' } });
		expect(onNotesChange).toHaveBeenCalledWith('Pago de proveedor');
	});

	describe('payment method selection', () => {
		it('renders payment method options from props', () => {
			render(<AddTransactionSection {...defaultProps} addingMode="transaction" />);

			fireEvent.click(screen.getByText('Seleccionar método'));

			expect(screen.getByText('Efectivo')).toBeInTheDocument();
			expect(screen.getByText('Transferencia Bancaria')).toBeInTheDocument();
		});

		it('calls onPaymentMethodIdChange when a method is selected', () => {
			const onPaymentMethodIdChange = jest.fn();
			render(
				<AddTransactionSection
					{...defaultProps}
					addingMode="transaction"
					onPaymentMethodIdChange={onPaymentMethodIdChange}
				/>
			);

			fireEvent.click(screen.getByText('Seleccionar método'));
			fireEvent.click(screen.getByText('Efectivo'));

			expect(onPaymentMethodIdChange).toHaveBeenCalledWith('1');
		});

		it('marks inactive methods in the label', () => {
			render(
				<AddTransactionSection
					{...defaultProps}
					addingMode="transaction"
					paymentMethodOptions={[
						{ id: 3, created_at: '2024-01-01', name: 'Cheque físico', is_active: false },
					]}
				/>
			);

			fireEvent.click(screen.getByText('Seleccionar método'));

			expect(screen.getByText('Cheque físico (inactivo)')).toBeInTheDocument();
		});
	});

	it('calls onReceiptNumberChange when receipt number input changes', () => {
		const onReceiptNumberChange = jest.fn();
		render(
			<AddTransactionSection
				{...defaultProps}
				addingMode="transaction"
				onReceiptNumberChange={onReceiptNumberChange}
			/>
		);

		const receiptInput = screen.getByLabelText('N° comprobante/recibo');
		fireEvent.change(receiptInput, { target: { value: 'A-0001' } });
		expect(onReceiptNumberChange).toHaveBeenCalledWith('A-0001');
	});

	describe('category selection', () => {
		it('renders category options from props', () => {
			render(<AddTransactionSection {...defaultProps} addingMode="transaction" />);

			fireEvent.click(screen.getByText('Sin categoría'));

			expect(screen.getByText('Alquiler')).toBeInTheDocument();
			expect(screen.getByText('Materiales')).toBeInTheDocument();
		});

		it('calls onCategoryIdChange when a category is selected', () => {
			const onCategoryIdChange = jest.fn();
			render(
				<AddTransactionSection
					{...defaultProps}
					addingMode="transaction"
					onCategoryIdChange={onCategoryIdChange}
				/>
			);

			fireEvent.click(screen.getByText('Sin categoría'));
			fireEvent.click(screen.getByText('Alquiler'));

			expect(onCategoryIdChange).toHaveBeenCalledWith('1');
		});

		it('calls onCategoryIdChange with empty string when "Sin categoría" is selected', () => {
			const onCategoryIdChange = jest.fn();
			render(
				<AddTransactionSection
					{...defaultProps}
					addingMode="transaction"
					categoryId="1"
					onCategoryIdChange={onCategoryIdChange}
				/>
			);

			fireEvent.click(screen.getByText('Alquiler'));
			fireEvent.click(screen.getByText('Sin categoría'));

			expect(onCategoryIdChange).toHaveBeenCalledWith('');
		});

		it('marks inactive categories in the label', () => {
			render(
				<AddTransactionSection
					{...defaultProps}
					addingMode="transaction"
					categoryOptions={
						[
							{
								id: 3,
								created_at: '2024-01-01',
								name: 'Categoría vieja',
								kind: 'collection',
								is_active: false,
							},
						] as any
					}
				/>
			);

			fireEvent.click(screen.getByText('Sin categoría'));

			expect(screen.getByText('Categoría vieja (inactivo)')).toBeInTheDocument();
		});
	});

	describe('bank account selection', () => {
		it('is always visible regardless of the selected payment method', () => {
			render(
				<AddTransactionSection {...defaultProps} addingMode="transaction" paymentMethodId="1" />
			);

			expect(screen.getByText('Cuenta Bancaria (opcional)')).toBeInTheDocument();
		});

		it('renders bank account options from the realtime hook data', () => {
			(useOptimizedRealtime as jest.Mock).mockReturnValue({
				data: mockBankAccounts,
				loading: false,
				refresh: jest.fn(),
			});

			render(<AddTransactionSection {...defaultProps} addingMode="transaction" />);

			fireEvent.click(screen.getByText('Sin cuenta'));

			expect(screen.getByText('Santander - Cuenta Principal (123456)')).toBeInTheDocument();
			expect(screen.getByText('BBVA - Cuenta Secundaria (789012)')).toBeInTheDocument();
		});

		it('calls onBankAccountIdChange when a bank account is selected', () => {
			const onBankAccountIdChange = jest.fn();
			(useOptimizedRealtime as jest.Mock).mockReturnValue({
				data: mockBankAccounts,
				loading: false,
				refresh: jest.fn(),
			});

			render(
				<AddTransactionSection
					{...defaultProps}
					addingMode="transaction"
					onBankAccountIdChange={onBankAccountIdChange}
				/>
			);

			fireEvent.click(screen.getByText('Sin cuenta'));
			fireEvent.click(screen.getByText('Santander - Cuenta Principal (123456)'));

			expect(onBankAccountIdChange).toHaveBeenCalledWith('1');
		});

		it('calls onBankAccountIdChange with empty string when "Sin cuenta" is selected', () => {
			const onBankAccountIdChange = jest.fn();
			(useOptimizedRealtime as jest.Mock).mockReturnValue({
				data: mockBankAccounts,
				loading: false,
				refresh: jest.fn(),
			});

			render(
				<AddTransactionSection
					{...defaultProps}
					addingMode="transaction"
					bankAccountId="1"
					onBankAccountIdChange={onBankAccountIdChange}
				/>
			);

			fireEvent.click(screen.getByText('Santander - Cuenta Principal (123456)'));
			fireEvent.click(screen.getByText('Sin cuenta'));

			expect(onBankAccountIdChange).toHaveBeenCalledWith('');
		});
	});
});
