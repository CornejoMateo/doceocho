import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BalanceInformation } from '@/components/business/balances/balance-information';

jest.mock('@/components/ui/dialog', () => ({
	Dialog: ({ children, open }: any) => (open ? <div data-testid="dialog">{children}</div> : null),
	DialogContent: ({ children }: any) => <div>{children}</div>,
	DialogHeader: ({ children }: any) => <div>{children}</div>,
	DialogTitle: ({ children }: any) => <div>{children}</div>,
	DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
	Button: ({ children, onClick, disabled, ...props }: any) => (
		<button onClick={onClick} disabled={disabled} {...props}>
			{children}
		</button>
	),
}));

jest.mock('@/components/ui/input', () => ({
	Input: ({ value, onChange, placeholder, ...props }: any) => (
		<input value={value} onChange={onChange} placeholder={placeholder} {...props} />
	),
}));

jest.mock('@/lib/balances/balances', () => ({
	updateBalance: jest.fn(),
}));

jest.mock('@/components/ui/use-toast', () => ({
	toast: jest.fn(),
}));

jest.mock('@/lib/error-translator', () => ({
	translateError: (e: any) => `translated: ${e?.message || e}`,
}));

jest.mock('@/utils/formats-money', () => ({
	formatCurrency: (v: any) => `$${v || 0}`,
	formatCurrencyUSD: (v: any) => `USD ${v || 0}`,
	formatNumber: (v: string) => v,
	parseArsToNumber: (v: string) => Number(v.replace(/[^0-9]/g, '')),
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

describe('BalanceInformation', () => {
	const formatDate = jest.fn((d) => d || 'sin fecha');
	const onUpdated = jest.fn();

	const defaultProps = {
		balanceId: 1,
		work: { locality: 'Springfield', address: 'Calle 123', name: 'Obra Springfield' },
		budget: { number: 'BGT-001', type: 'COCINA' },
		startDate: '2024-06-01',
		contractDateUsd: 1000,
		usdCurrent: 1050,
		totalPaid: 50000,
		totalPaidUsd: 2000,
		totalExtraArs: 0,
		totalExtraUsd: 0,
		summary: mockSummary,
		formatDate,
		onUpdated,
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders work information', () => {
		render(<BalanceInformation {...defaultProps} />);

		expect(screen.getByText('Obra Springfield')).toBeInTheDocument();
	});

	it('renders "Sin obra asignada" when no work', () => {
		render(<BalanceInformation {...defaultProps} work={null} />);

		expect(screen.getByText('Sin obra asignada')).toBeInTheDocument();
	});

	it('renders budget type and number', () => {
		render(<BalanceInformation {...defaultProps} />);

		expect(screen.getByText('COCINA')).toBeInTheDocument();
		expect(screen.getByText('BGT-001')).toBeInTheDocument();
	});

	it('renders financial information', () => {
		render(<BalanceInformation {...defaultProps} />);

		expect(screen.getByText('$100000')).toBeInTheDocument();
		expect(screen.getByText('USD 5000')).toBeInTheDocument();
		expect(screen.getAllByText('$50000')).toHaveLength(2);
		expect(screen.getByText('USD 2000')).toBeInTheDocument();
	});

	it('renders USD values when contractDateUsd is provided', () => {
		render(<BalanceInformation {...defaultProps} />);

		expect(screen.getByText('$1000')).toBeInTheDocument();
		expect(screen.getByText('$1050')).toBeInTheDocument();
	});

	it('shows "Sin tipo" and "Sin número" when budget is null', () => {
		render(<BalanceInformation {...defaultProps} budget={null} />);

		expect(screen.getByText('Sin tipo')).toBeInTheDocument();
		expect(screen.getByText('Sin número')).toBeInTheDocument();
	});

	it('opens edit dialog when pencil button is clicked', () => {
		render(<BalanceInformation {...defaultProps} />);

		const pencilButton = screen.getByRole('button');
		fireEvent.click(pencilButton);

		expect(screen.getByText('Editar presupuesto actual')).toBeInTheDocument();
		expect(screen.getByText('Guardar')).toBeInTheDocument();
	});

	it('calls updateBalance when saving new values', async () => {
		const { updateBalance } = jest.requireMock('@/lib/balances/balances');
		updateBalance.mockResolvedValue({ error: null });

		render(<BalanceInformation {...defaultProps} />);

		const pencilButton = screen.getByRole('button');
		fireEvent.click(pencilButton);

		const arsInput = screen.getByDisplayValue('100.000');
		fireEvent.change(arsInput, { target: { value: '150000' } });

		const saveButton = screen.getByText('Guardar');
		fireEvent.click(saveButton);

		await waitFor(() => {
			expect(updateBalance).toHaveBeenCalledWith(1, {
				balance_amount_ars: 150000,
				balance_amount_usd: 5000,
			});
		});

		expect(onUpdated).toHaveBeenCalled();
	});

	it('shows error toast when update fails', async () => {
		const { updateBalance } = jest.requireMock('@/lib/balances/balances');
		const { toast } = jest.requireMock('@/components/ui/use-toast');
		updateBalance.mockResolvedValue({ error: new Error('Update failed') });

		render(<BalanceInformation {...defaultProps} />);

		const pencilButton = screen.getByRole('button');
		fireEvent.click(pencilButton);

		const saveButton = screen.getByText('Guardar');
		fireEvent.click(saveButton);

		await waitFor(() => {
			expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
		});
	});

	it('shows saving state while updating', async () => {
		const { updateBalance } = jest.requireMock('@/lib/balances/balances');
		let resolveUpdate: (value: any) => void;
		updateBalance.mockImplementation(
			() =>
				new Promise((resolve) => {
					resolveUpdate = resolve;
				})
		);

		render(<BalanceInformation {...defaultProps} />);

		const pencilButton = screen.getByRole('button');
		fireEvent.click(pencilButton);

		const saveButton = screen.getByText('Guardar');
		fireEvent.click(saveButton);

		expect(screen.getByText('Guardando...')).toBeInTheDocument();

		await act(async () => {
			resolveUpdate!({ error: null });
		});

		expect(screen.queryByText('Guardando...')).not.toBeInTheDocument();
	});
});
