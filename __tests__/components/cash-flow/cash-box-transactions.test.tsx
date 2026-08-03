import { render, screen, fireEvent } from '@testing-library/react';
import { CashBoxTransactions } from '@/components/business/cash-flow/cash-box-transactions';

jest.mock('@/utils/formats-money', () => ({
	formatCurrency: (v: number) => `$${v}`,
}));

jest.mock('@/utils/format-date', () => ({
	formatCreatedAt: (v: string) => `fecha-caja:${v}`,
	formatCreatedAtChat: (v: string) => `fecha-chat:${v}`,
}));

jest.mock('@/constants/balances/payment_methods', () => ({
	getPaymentMethodLabel: (v: string) => `metodo:${v}`,
}));

jest.mock('@/constants/cashflow/cashflow', () => ({
	getExpenseCategoryLabel: (v: string) => `categoria:${v}`,
}));

const incomeTransaction = {
	id: 1,
	created_at: '2024-06-15T10:00:00Z',
	cash_box_id: 1,
	type: 'income' as const,
	amount: 50000,
	category: 'ventas',
	description: 'Venta de mercadería',
	bank_account_id: null,
	bank_account: null,
};

const expenseTransaction = {
	id: 2,
	created_at: '2024-06-16T15:30:00Z',
	cash_box_id: 1,
	type: 'expense' as const,
	amount: 15000,
	category: 'insumos',
	description: 'Compra de insumos',
	bank_account_id: 7,
	bank_account: { id: 7, name: 'Cuenta Principal', bank: 'Santander' },
};

function renderComponent(overrides = {}) {
	const props = {
		transactions: [incomeTransaction, expenseTransaction] as any,
		cashBoxCreatedAt: '2024-06-01T00:00:00Z',
		onDeleteTransaction: jest.fn(),
		...overrides,
	};
	render(<CashBoxTransactions {...props} />);
	return props;
}

describe('CashBoxTransactions', () => {
	it('renders the section title and the cash box creation date', () => {
		renderComponent();

		expect(screen.getByText('Movimientos correspondientes a la caja actual')).toBeInTheDocument();
		expect(screen.getByText('Caja del fecha-caja:2024-06-01T00:00:00Z')).toBeInTheDocument();
	});

	it('shows the empty state when there are no transactions', () => {
		renderComponent({ transactions: [] });

		expect(
			screen.getByText(
				'No hay movimientos registrados para la caja actual. Agrega ingresos o egresos para verlos aquí.'
			)
		).toBeInTheDocument();
	});

	it('does not show the empty state when there are transactions', () => {
		renderComponent();

		expect(screen.queryByText(/No hay movimientos registrados/)).not.toBeInTheDocument();
	});

	it('renders income transaction with payment method label, "+" sign, and no bank account suffix', () => {
		renderComponent({ transactions: [incomeTransaction] });

		expect(screen.getByText(/metodo:ventas/)).toBeInTheDocument();
		expect(screen.queryByText(/categoria:ventas/)).not.toBeInTheDocument();
		expect(screen.getByText('Venta de mercadería')).toBeInTheDocument();
		expect(screen.getByText('+$50000')).toBeInTheDocument();
		expect(screen.getByText('fecha-chat:2024-06-15T10:00:00Z')).toBeInTheDocument();
	});

	it('renders expense transaction with expense category label, "-" sign, and bank account suffix', () => {
		renderComponent({ transactions: [expenseTransaction] });

		expect(screen.getByText(/categoria:insumos/)).toBeInTheDocument();
		expect(screen.queryByText(/metodo:insumos/)).not.toBeInTheDocument();
		expect(screen.getByText('Compra de insumos')).toBeInTheDocument();
		expect(screen.getByText('-$15000')).toBeInTheDocument();
		expect(screen.getByText(/\(Santander - Cuenta Principal\)/)).toBeInTheDocument();
	});

	it('does not render bank account details when there is none', () => {
		renderComponent({ transactions: [incomeTransaction] });

		expect(screen.queryByText(/Santander/)).not.toBeInTheDocument();
	});

	it('renders no description text when description is null', () => {
		renderComponent({
			transactions: [{ ...incomeTransaction, description: null }],
		});

		expect(screen.queryByText('null')).not.toBeInTheDocument();
		expect(screen.queryByText('undefined')).not.toBeInTheDocument();
	});

	it('renders no category label when category is empty', () => {
		renderComponent({
			transactions: [{ ...incomeTransaction, category: '' }],
		});

		expect(screen.queryByText(/metodo:/)).not.toBeInTheDocument();
	});

	it('coerces string amounts before formatting', () => {
		renderComponent({
			transactions: [{ ...incomeTransaction, amount: '50000' as any }],
		});

		expect(screen.getByText('+$50000')).toBeInTheDocument();
	});

	it('calls onDeleteTransaction with the correct transaction when its delete button is clicked', () => {
		const onDeleteTransaction = jest.fn();
		renderComponent({ onDeleteTransaction });

		const deleteButtons = screen.getAllByRole('button');
		fireEvent.click(deleteButtons[1]);

		expect(onDeleteTransaction).toHaveBeenCalledWith(expenseTransaction);
	});

	it('renders one delete button per transaction', () => {
		renderComponent();

		expect(screen.getAllByRole('button')).toHaveLength(2);
	});
});
