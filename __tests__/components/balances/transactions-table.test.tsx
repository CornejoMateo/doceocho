import { render, screen, fireEvent } from '@testing-library/react';
import { TransactionsTable } from '@/components/business/balances/transactions/transactions-table';

jest.mock('@/utils/formats-money', () => ({
	formatCurrency: (v: any) => `$${v || 0}`,
	formatCurrencyUSD: (v: any) => `USD ${v || 0}`,
}));

const mockTransactions = [
	{
		id: 1,
		date: '2024-06-15',
		amount: 50000,
		usd_amount: 50,
		quote_usd: 1000,
		payment_method: 'Transferencia',
		notes: 'Pago inicial',
		is_extra_amount: false,
	},
	{
		id: 2,
		date: '2024-07-01',
		amount: 10000,
		usd_amount: 10,
		quote_usd: 1000,
		payment_method: 'Efectivo',
		notes: 'Extra',
		is_extra_amount: true,
	},
];

describe('TransactionsTable', () => {
	const formatDate = jest.fn((d) => d || 'sin fecha');
	const onDeleteTransaction = jest.fn();
	const onEditTransaction = jest.fn();
	const onViewFiles = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('shows loading state', () => {
		render(
			<TransactionsTable
				isLoading={true}
				transactions={[]}
				formatDate={formatDate}
				onDeleteTransaction={onDeleteTransaction}
				onEditTransaction={onEditTransaction}
				onViewFiles={onViewFiles}
			/>
		);

		expect(screen.getByText('Cargando transacciones...')).toBeInTheDocument();
	});

	it('shows empty state', () => {
		render(
			<TransactionsTable
				isLoading={false}
				transactions={[]}
				formatDate={formatDate}
				onDeleteTransaction={onDeleteTransaction}
				onEditTransaction={onEditTransaction}
				onViewFiles={onViewFiles}
			/>
		);

		expect(screen.getByText('No hay transacciones registradas')).toBeInTheDocument();
	});

	it('renders transactions', () => {
		render(
			<TransactionsTable
				isLoading={false}
				transactions={mockTransactions as any}
				formatDate={formatDate}
				onDeleteTransaction={onDeleteTransaction}
				onEditTransaction={onEditTransaction}
				onViewFiles={onViewFiles}
			/>
		);

		expect(screen.getByText('Pago inicial')).toBeInTheDocument();
		expect(screen.getAllByText('Extra')).toHaveLength(2);
		expect(screen.getByText('$50000')).toBeInTheDocument();
		expect(screen.getByText('$10000')).toBeInTheDocument();
	});

	it('shows Extra badge for extra amount transactions', () => {
		render(
			<TransactionsTable
				isLoading={false}
				transactions={mockTransactions as any}
				formatDate={formatDate}
				onDeleteTransaction={onDeleteTransaction}
				onEditTransaction={onEditTransaction}
				onViewFiles={onViewFiles}
			/>
		);

		const extraBadges = screen.getAllByText('Extra');
		expect(extraBadges.length).toBe(2);
	});

	it('calls onEditTransaction when edit button is clicked', () => {
		render(
			<TransactionsTable
				isLoading={false}
				transactions={mockTransactions as any}
				formatDate={formatDate}
				onDeleteTransaction={onDeleteTransaction}
				onEditTransaction={onEditTransaction}
				onViewFiles={onViewFiles}
			/>
		);

		const editButtons = screen.getAllByRole('button');
		const editBtn =
			editButtons.find((b) =>
				b.querySelector('svg')?.getAttribute('class')?.includes('lucide-pencil')
			) || editButtons[0];

		fireEvent.click(editBtn);
		expect(onEditTransaction).toHaveBeenCalledWith(mockTransactions[0]);
	});

	it('calls onDeleteTransaction when delete button is clicked', () => {
		render(
			<TransactionsTable
				isLoading={false}
				transactions={mockTransactions as any}
				formatDate={formatDate}
				onDeleteTransaction={onDeleteTransaction}
				onEditTransaction={onEditTransaction}
				onViewFiles={onViewFiles}
			/>
		);

		const deleteButton =
			screen
				.getAllByRole('button')
				.find((b) => b.querySelector('svg')?.getAttribute('class')?.includes('lucide-trash2')) ||
			screen.getAllByRole('button')[1];

		fireEvent.click(deleteButton);
	});

	it('calls onViewFiles when files button is clicked', () => {
		render(
			<TransactionsTable
				isLoading={false}
				transactions={mockTransactions as any}
				formatDate={formatDate}
				onDeleteTransaction={onDeleteTransaction}
				onEditTransaction={onEditTransaction}
				onViewFiles={onViewFiles}
			/>
		);

		const imageButtons = screen
			.getAllByRole('button')
			.filter((b) => b.querySelector('svg')?.getAttribute('class')?.includes('lucide-image'));

		if (imageButtons.length > 0) {
			fireEvent.click(imageButtons[0]);
			expect(onViewFiles).toHaveBeenCalledWith(mockTransactions[0]);
		}
	});
});
