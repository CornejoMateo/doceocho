import { render, screen, fireEvent } from '@testing-library/react';
import { AddTransactionSection } from '@/components/business/balances/transactions/add-transaction';

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
});
