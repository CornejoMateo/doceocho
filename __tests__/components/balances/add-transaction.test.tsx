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

const defaultProps = {
	addingMode: null as 'transaction' | 'extra' | null,
	transactionDate: new Date('2024-06-15'),
	onTransactionDateChange: jest.fn(),
	transactionAmount: '',
	onTransactionAmountChange: jest.fn(),
	usdAmount: '',
	onUsdAmountChange: jest.fn(),
	quoteUsd: '',
	onQuoteUsdChange: jest.fn(),
	notes: '',
	onNotesChange: jest.fn(),
	paymentMethod: '',
	onPaymentMethodChange: jest.fn(),
	bankAccountId: '',
	onBankAccountIdChange: jest.fn(),
	onCancel: jest.fn(),
	onSave: jest.fn(),
	onStartAddTransaction: jest.fn(),
	onStartAddExtra: jest.fn(),
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
		expect(screen.getByText('Agregar monto extra')).toBeInTheDocument();
	});

	it('calls onStartAddTransaction when transaction button is clicked', () => {
		const onStartAddTransaction = jest.fn();
		render(
			<AddTransactionSection {...defaultProps} onStartAddTransaction={onStartAddTransaction} />
		);

		fireEvent.click(screen.getByText('Agregar transacción'));
		expect(onStartAddTransaction).toHaveBeenCalled();
	});

	it('calls onStartAddExtra when extra button is clicked', () => {
		const onStartAddExtra = jest.fn();
		render(<AddTransactionSection {...defaultProps} onStartAddExtra={onStartAddExtra} />);

		fireEvent.click(screen.getByText('Agregar monto extra'));
		expect(onStartAddExtra).toHaveBeenCalled();
	});

	it('renders form when adding a transaction', () => {
		render(<AddTransactionSection {...defaultProps} addingMode="transaction" />);

		expect(screen.getByText('Nueva transacción')).toBeInTheDocument();
		expect(screen.getByText('Guardar')).toBeInTheDocument();
		expect(screen.getByText('Cancelar')).toBeInTheDocument();
	});

	it('renders form when adding an extra amount', () => {
		render(<AddTransactionSection {...defaultProps} addingMode="extra" />);

		expect(screen.getByText('Nuevo monto extra')).toBeInTheDocument();
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

		fireEvent.click(screen.getByText('Guardar'));
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

		expect(screen.getByText('Guardar')).toBeDisabled();
	});

	it('shows payment method select only for transactions (not extras)', () => {
		const { rerender } = render(
			<AddTransactionSection {...defaultProps} addingMode="transaction" />
		);

		expect(screen.getByText('Método de pago')).toBeInTheDocument();

		rerender(<AddTransactionSection {...defaultProps} addingMode="extra" />);

		expect(screen.queryByText('Método de pago')).not.toBeInTheDocument();
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

	it('calls onUsdAmountChange when usd input changes', () => {
		const onUsdAmountChange = jest.fn();
		render(
			<AddTransactionSection
				{...defaultProps}
				addingMode="transaction"
				onUsdAmountChange={onUsdAmountChange}
			/>
		);

		const usdInput = screen.getByLabelText('Monto en USD');
		fireEvent.change(usdInput, { target: { value: '100' } });
		expect(onUsdAmountChange).toHaveBeenCalledWith('100');
	});

	it('calls onQuoteUsdChange when quote input changes', () => {
		const onQuoteUsdChange = jest.fn();
		render(
			<AddTransactionSection
				{...defaultProps}
				addingMode="transaction"
				onQuoteUsdChange={onQuoteUsdChange}
			/>
		);

		const quoteInput = screen.getByLabelText('Cotización USD');
		fireEvent.change(quoteInput, { target: { value: '1000' } });
		expect(onQuoteUsdChange).toHaveBeenCalledWith('1.000');
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

	describe('bank account selection', () => {
		it('does not show bank account select when payment method is not bank_transfer', () => {
			render(
				<AddTransactionSection {...defaultProps} addingMode="transaction" paymentMethod="cash" />
			);

			expect(screen.queryByText('Cuenta Bancaria')).not.toBeInTheDocument();
		});

		it('shows bank account select when payment method is bank_transfer', () => {
			(useOptimizedRealtime as jest.Mock).mockReturnValue({
				data: mockBankAccounts,
				loading: false,
				refresh: jest.fn(),
			});

			render(
				<AddTransactionSection
					{...defaultProps}
					addingMode="transaction"
					paymentMethod="bank_transfer"
				/>
			);

			expect(screen.getByText('Cuenta Bancaria')).toBeInTheDocument();
		});

		it('does not show bank account select in extra mode even with bank_transfer', () => {
			render(
				<AddTransactionSection {...defaultProps} addingMode="extra" paymentMethod="bank_transfer" />
			);

			expect(screen.queryByText('Cuenta Bancaria')).not.toBeInTheDocument();
		});

		it('renders bank account options from the realtime hook data', () => {
			(useOptimizedRealtime as jest.Mock).mockReturnValue({
				data: mockBankAccounts,
				loading: false,
				refresh: jest.fn(),
			});

			render(
				<AddTransactionSection
					{...defaultProps}
					addingMode="transaction"
					paymentMethod="bank_transfer"
				/>
			);

			fireEvent.click(screen.getByText('Selecciona una cuenta'));

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
					paymentMethod="bank_transfer"
					onBankAccountIdChange={onBankAccountIdChange}
				/>
			);

			fireEvent.click(screen.getByText('Selecciona una cuenta'));
			fireEvent.click(screen.getByText('Santander - Cuenta Principal (123456)'));

			expect(onBankAccountIdChange).toHaveBeenCalledWith('1');
		});
	});
});
