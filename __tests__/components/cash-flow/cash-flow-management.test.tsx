import { render, screen } from '@testing-library/react';
import { CashFlowManagement } from '@/components/business/cash-flow/cash-flow-management';
import * as realtimeHook from '@/hooks/use-optimized-realtime';

jest.mock('@/lib/cash-flow/cash-flow');
jest.mock('@/hooks/use-optimized-realtime');
jest.mock('@/components/ui/use-toast', () => ({
	useToast: () => ({ toast: jest.fn() }),
}));

describe('CashFlowManagement Component', () => {
	const mockRefreshCashBoxes = jest.fn();
	const mockRefreshBankAccounts = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('shows the initial loading state of the cash boxes', () => {
		(realtimeHook.useOptimizedRealtime as jest.Mock).mockImplementation((key) => {
			if (key === 'cash_boxes') {
				return { data: [], loading: true, refresh: mockRefreshCashBoxes };
			}
			return { data: [], loading: false, refresh: mockRefreshBankAccounts };
		});

		render(<CashFlowManagement />);
		expect(screen.getByText('Cargando...')).toBeInTheDocument();
	});

	it('shows the button to create a cash box when there is no open cash box', async () => {
		(realtimeHook.useOptimizedRealtime as jest.Mock).mockImplementation((key) => {
			if (key === 'cash_boxes') {
				return { data: [], loading: false, refresh: mockRefreshCashBoxes };
			}
			return { data: [], loading: false, refresh: mockRefreshBankAccounts };
		});

		render(<CashFlowManagement />);

		expect(screen.getByText('No hay caja abierta')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Crear Caja/i })).toBeInTheDocument();
	});

	it('shows the information of the current cash box, income/expense buttons and transactions when there is an open cash box', async () => {
		const mockOpenCashBox = {
			id: 1,
			opening_balance: 1000,
			is_closed: false,
			created_at: '2026-03-01T10:00:00Z',
		};

		const mockTransactions = [
			{
				id: 101,
				cash_box_id: 1,
				type: 'income',
				amount: 500,
				description: 'Venta de prueba',
				category: 'cash',
			},
		];

		(realtimeHook.useOptimizedRealtime as jest.Mock).mockImplementation((key) => {
			if (key === 'cash_boxes') {
				return { data: [mockOpenCashBox], loading: false, refresh: mockRefreshCashBoxes };
			}
			if (key === 'transactions_box') {
				return { data: mockTransactions, loading: false, refresh: jest.fn() };
			}
			return { data: [], loading: false, refresh: mockRefreshBankAccounts };
		});

		render(<CashFlowManagement />);

		expect(screen.getByRole('button', { name: /Registrar Ingreso/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Registrar Egreso/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Cerrar Caja/i })).toBeInTheDocument();
	});
});
