import { render, screen, fireEvent } from '@testing-library/react';
import { BalanceCard } from '@/components/business/balances/balance-card';

jest.mock('@/utils/formats-money', () => ({
	formatCurrency: (v: any) => `$${v || 0}`,
	formatCurrencyUSD: (v: any) => `USD ${v || 0}`,
}));

const mockSummary = {
	type: 'A favor del cliente',
	effectiveBudgetArs: 100000,
	effectiveBudgetUsd: 5000,
	budgetUsd: 5000,
	budgetArsCurrent: 100000,
	totalPaidUsd: 2000,
	remainingArs: 50000,
	remainingUsd: 2500,
	progressPercentage: 50,
	budgetArsInitial: 100000,
	totalPaidArs: 50000,
	totalExtraArs: 0,
	totalExtraUsd: 0,
};

const baseBalance = {
	id: 1,
	client_id: 5,
	balance_amount_ars: 100000,
	balance_amount_usd: 5000,
	contract_date_usd: 950,
	usd_current: 1000,
	totalPaid: 50000,
	totalPaidUSD: 2000,
	budget: {
		id: 10,
		amount_ars: 100000,
		amount_usd: 5000,
		folder_budget: {
			id: 20,
			work: { address: 'Calle 123', locality: 'Springfield' },
		},
	},
};

describe('BalanceCard', () => {
	const onCardClick = jest.fn();
	const onDollarUpdate = jest.fn();
	const onDeleteClick = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders work locality and address', () => {
		render(
			<BalanceCard
				balance={baseBalance as any}
				summary={mockSummary as any}
				onCardClick={onCardClick}
				onDollarUpdate={onDollarUpdate}
				onDeleteClick={onDeleteClick}
			/>
		);

		expect(screen.getByText('Springfield')).toBeInTheDocument();
		expect(screen.getByText('Calle 123')).toBeInTheDocument();
	});

	it('renders budget, delivered, and remaining amounts', () => {
		render(
			<BalanceCard
				balance={baseBalance as any}
				summary={mockSummary as any}
				onCardClick={onCardClick}
				onDollarUpdate={onDollarUpdate}
				onDeleteClick={onDeleteClick}
			/>
		);

		expect(screen.getByText('$100000')).toBeInTheDocument();
		expect(screen.getByText('USD 5000')).toBeInTheDocument();
		expect(screen.getAllByText('$50000')).toHaveLength(2);
		expect(screen.getByText('USD 2000')).toBeInTheDocument();
	});

	it('renders progress bar when budgetArsCurrent > 0', () => {
		render(
			<BalanceCard
				balance={baseBalance as any}
				summary={mockSummary as any}
				onCardClick={onCardClick}
				onDollarUpdate={onDollarUpdate}
				onDeleteClick={onDeleteClick}
			/>
		);

		expect(screen.getByText('Progreso')).toBeInTheDocument();
		expect(screen.getByText('50%')).toBeInTheDocument();
	});

	it('calls onCardClick when card is clicked', () => {
		render(
			<BalanceCard
				balance={baseBalance as any}
				summary={mockSummary as any}
				onCardClick={onCardClick}
				onDollarUpdate={onDollarUpdate}
				onDeleteClick={onDeleteClick}
			/>
		);

		fireEvent.click(screen.getByText('Springfield').closest('.cursor-pointer')!);
		expect(onCardClick).toHaveBeenCalled();
	});

	it('shows note icon when balance has notes', () => {
		const balanceWithNotes = {
			...baseBalance,
			notes: 'Some notes',
		};

		const { container } = render(
			<BalanceCard
				balance={balanceWithNotes as any}
				summary={mockSummary as any}
				onCardClick={onCardClick}
				onDollarUpdate={onDollarUpdate}
				onDeleteClick={onDeleteClick}
			/>
		);

		const noteIcon = container.querySelector('.text-yellow-600');
		expect(noteIcon).toBeInTheDocument();
	});

	it('shows "Sin obra asignada" when balance has budget no work', () => {
		const balanceNoWork = {
			...baseBalance,
			budget: { ...baseBalance.budget, folder_budget: { id: 20 } },
		};

		render(
			<BalanceCard
				balance={balanceNoWork as any}
				summary={mockSummary as any}
				onCardClick={onCardClick}
				onDollarUpdate={onDollarUpdate}
				onDeleteClick={onDeleteClick}
			/>
		);

		expect(screen.getByText('Sin obra asignada')).toBeInTheDocument();
	});
});
