import { render, screen, fireEvent } from '@testing-library/react';
import { TransactionsTable } from '@/components/business/balances/transactions/transactions-table';

jest.mock('@/utils/formats-money', () => ({
	formatCurrency: (v: any) => `$${v || 0}`,
	formatCurrencyUSD: (v: any) => `USD ${v || 0}`,
}));

jest.mock('@/constants/balances/payment_methods', () => ({
	getPaymentMethodLabel: (v: string) =>
		({ bank_transfer: 'Transferencia bancaria', cash: 'Efectivo' })[v] || v,
}));

const mockTransactions = [
	{
		id: 1,
		date: '2024-06-15',
		amount: 50000,
		usd_amount: 50,
		quote_usd: 1000,
		payment_method: 'bank_transfer',
		notes: 'Pago inicial',
		is_extra_amount: false,
		bank_account_id: 7,
		bank_account: { id: 7, name: 'Cuenta Principal', bank: 'Santander' },
	},
	{
		id: 2,
		date: '2024-07-01',
		amount: 10000,
		usd_amount: 10,
		quote_usd: 1000,
		payment_method: 'cash',
		notes: 'Compra de insumos',
		is_extra_amount: true,
		bank_account_id: null,
		bank_account: null,
	},
];

function renderTable(overrides = {}) {
	const props = {
		isLoading: false,
		transactions: mockTransactions as any,
		formatDate: jest.fn((d) => d || 'sin fecha'),
		onDeleteTransaction: jest.fn(),
		onEditTransaction: jest.fn(),
		onViewFiles: jest.fn(),
		...overrides,
	};
	render(<TransactionsTable {...props} />);
	return props;
}

describe('TransactionsTable', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('shows loading state', () => {
		renderTable({ isLoading: true, transactions: [] });

		expect(screen.getByText('Cargando transacciones...')).toBeInTheDocument();
	});

	it('shows empty state', () => {
		renderTable({ transactions: [] });

		expect(screen.getByText('No hay transacciones registradas')).toBeInTheDocument();
	});

	it('renders transaction data (notes, amounts, payment method)', () => {
		renderTable();

		expect(screen.getByText('Pago inicial')).toBeInTheDocument();
		expect(screen.getByText('Compra de insumos')).toBeInTheDocument();
		expect(screen.getByText('$50000')).toBeInTheDocument();
		expect(screen.getByText('USD 50')).toBeInTheDocument();
		expect(screen.getByText('$10000')).toBeInTheDocument();
		expect(screen.getByText('Transferencia bancaria')).toBeInTheDocument();
		expect(screen.getByText('Efectivo')).toBeInTheDocument();
	});

	it('shows the Extra badge only for transactions marked as extra amount', () => {
		renderTable();

		// Solo la transacción #2 es extra, así que el badge debe aparecer una sola vez
		expect(screen.getAllByText('Extra')).toHaveLength(1);
	});

	it('shows bank account details when present', () => {
		renderTable();

		expect(screen.getByText('Cuenta Principal - Santander')).toBeInTheDocument();
	});

	it('does not show bank account details when transaction has no bank account', () => {
		renderTable({ transactions: [mockTransactions[1]] });

		expect(screen.queryByText(/Santander/)).not.toBeInTheDocument();
	});

	it('calls onEditTransaction with the correct transaction when edit is clicked', () => {
		const onEditTransaction = jest.fn();
		renderTable({ onEditTransaction });

		fireEvent.click(screen.getByRole('button', { name: 'Editar transacción del 2024-06-15' }));

		expect(onEditTransaction).toHaveBeenCalledWith(mockTransactions[0]);
	});

	it('calls onDeleteTransaction with the correct transaction when delete is clicked', () => {
		const onDeleteTransaction = jest.fn();
		renderTable({ onDeleteTransaction });

		fireEvent.click(screen.getByRole('button', { name: 'Eliminar transacción del 2024-07-01' }));

		expect(onDeleteTransaction).toHaveBeenCalledWith(mockTransactions[1]);
	});

	it('calls onViewFiles with the correct transaction when files button is clicked', () => {
		const onViewFiles = jest.fn();
		renderTable({ onViewFiles });

		const fileButtons = screen.getAllByRole('button', { name: 'Ver archivos' });
		fireEvent.click(fileButtons[0]);

		expect(onViewFiles).toHaveBeenCalledWith(mockTransactions[0]);
	});
});
