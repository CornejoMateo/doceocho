import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CashBoxHistory } from '@/components/business/cash-flow/cash-box-history';
import * as cashFlowLib from '@/lib/cash-flow/cash-flow';

// Mock dependencies
jest.mock('@/lib/cash-flow/cash-flow');
jest.mock('@/components/ui/use-toast', () => ({
	toast: jest.fn(),
}));

describe('CashBoxHistory Component', () => {
	const mockOnRefresh = jest.fn();

	const mockClosedBoxes = [
		{
			id: 1,
			opening_balance: 1000,
			closing_balance: 1500,
			is_closed: true,
			closed_at: '2026-03-01T20:00:00Z',
			created_at: '2026-03-01T08:00:00Z',
			notes: null,
		},
	];

	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('renders loading state correctly', () => {
		render(<CashBoxHistory cashBoxes={[]} loading={true} onRefresh={mockOnRefresh} />);

		expect(screen.getByText('Cargando historial...')).toBeInTheDocument();
	});

	test('renders empty state when there are no closed cash boxes', () => {
		const openBoxes = [
			{
				id: 2,
				opening_balance: 500,
				closing_balance: null,
				is_closed: false,
				closed_at: null,
				created_at: '2026-03-02T08:00:00Z',
				notes: null,
			},
		];

		render(<CashBoxHistory cashBoxes={openBoxes} loading={false} onRefresh={mockOnRefresh} />);

		expect(screen.getByText('No hay cajas cerradas en el historial')).toBeInTheDocument();
	});

	test('renders list of closed cash boxes and triggers refresh action', async () => {
		const user = userEvent.setup();

		render(
			<CashBoxHistory cashBoxes={mockClosedBoxes} loading={false} onRefresh={mockOnRefresh} />
		);

		expect(screen.getByText('Historial de Cajas')).toBeInTheDocument();

		const refreshButton = screen.getByRole('button', { name: /Actualizar/i });
		await user.click(refreshButton);

		expect(mockOnRefresh).toHaveBeenCalledTimes(1);
	});

	test('loads and displays cash box transactions when expanding a closed box', async () => {
		const user = userEvent.setup();
		const mockTransactionsData = {
			transactions: [
				{
					id: 101,
					type: 'income',
					amount: 500,
					description: 'Client payment',
					category: 'cash',
					created_at: '2026-03-01T10:00:00Z',
				},
			],
		};

		(cashFlowLib.getCashBoxWithTransactions as jest.Mock).mockResolvedValue({
			data: mockTransactionsData,
			error: null,
		});

		render(
			<CashBoxHistory cashBoxes={mockClosedBoxes} loading={false} onRefresh={mockOnRefresh} />
		);

		const viewButton = screen.getByRole('button', { name: /Ver movimientos/i });
		await user.click(viewButton);

		await waitFor(() => {
			expect(cashFlowLib.getCashBoxWithTransactions).toHaveBeenCalledWith(1);
		});

		await waitFor(() => {
			expect(screen.getByText('Client payment')).toBeInTheDocument();
		});
	});
});
