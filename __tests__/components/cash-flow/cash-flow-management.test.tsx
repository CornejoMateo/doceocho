import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CashFlowManagement } from '@/components/business/cash-flow/cash-flow-management';
import * as realtimeHook from '@/hooks/use-optimized-realtime';

jest.mock('@/lib/cash-flow/cash-flow');
jest.mock('@/hooks/use-optimized-realtime');
jest.mock('@/components/provider/auth-provider', () => ({
	useAuth: () => ({
		user: {
			role: 'Admin',
			views: jest.requireActual('@/helpers/permissions/views').getDefaultViews('Admin'),
		},
	}),
}));

jest.mock('@/components/business/cash-flow/balances-tab/checking-accounts-tab', () => ({
	CheckingAccountsTab: () => <div data-testid="checking-accounts-tab" />,
}));

jest.mock('@/components/business/cash-flow/summary/summary-tab', () => ({
	SummaryTab: () => <div data-testid="summary-tab" />,
}));

jest.mock('@/components/business/cash-flow/incomes-expenses/incomes-tab', () => ({
	IncomesTab: () => <div data-testid="incomes-tab" />,
}));

jest.mock('@/components/business/cash-flow/incomes-expenses/expenses-tab', () => ({
	ExpensesTab: () => <div data-testid="expenses-tab" />,
}));

jest.mock('@/components/business/cash-flow/collections-payments/collections-tab', () => ({
	CollectionsTab: () => <div data-testid="collections-tab" />,
}));

jest.mock('@/components/business/cash-flow/collections-payments/payments-tab', () => ({
	PaymentsTab: () => <div data-testid="payments-tab" />,
}));

jest.mock('@/components/ui/use-toast', () => ({
	useToast: () => ({ toast: jest.fn() }),
}));

describe('CashFlowManagement Component', () => {
	const mockRefreshCashBoxes = jest.fn();
	const mockRefreshBankAccounts = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('mounts the summary tab by default (no more "En desarrollo" placeholder)', () => {
		(realtimeHook.useOptimizedRealtime as jest.Mock).mockImplementation((key) => {
			if (key === 'cash_boxes') {
				return { data: [], loading: false, refresh: mockRefreshCashBoxes };
			}
			return { data: [], loading: false, refresh: mockRefreshBankAccounts };
		});

		render(<CashFlowManagement />);
		expect(screen.getByTestId('summary-tab')).toBeInTheDocument();
		expect(screen.queryByText('En desarrollo')).not.toBeInTheDocument();
	});

	it('mounts the checking accounts tab when its tab is selected', async () => {
		(realtimeHook.useOptimizedRealtime as jest.Mock).mockImplementation(() => ({
			data: [],
			loading: false,
			refresh: jest.fn(),
		}));

		render(<CashFlowManagement />);
		expect(screen.queryByTestId('checking-accounts-tab')).not.toBeInTheDocument();

		await userEvent.click(screen.getByRole('tab', { name: 'Cuentas corrientes' }));

		expect(await screen.findByTestId('checking-accounts-tab')).toBeInTheDocument();
		expect(screen.queryByText('Próximamente')).not.toBeInTheDocument();
	});

	it.each([
		['Ingresos', 'incomes-tab'],
		['Gastos', 'expenses-tab'],
		['Cobros', 'collections-tab'],
		['Pagos', 'payments-tab'],
	])('mounts the %s tab when its tab is selected', async (tabLabel, testId) => {
		(realtimeHook.useOptimizedRealtime as jest.Mock).mockImplementation(() => ({
			data: [],
			loading: false,
			refresh: jest.fn(),
		}));

		render(<CashFlowManagement />);
		expect(screen.queryByTestId(testId)).not.toBeInTheDocument();

		await userEvent.click(screen.getByRole('tab', { name: tabLabel }));

		expect(await screen.findByTestId(testId)).toBeInTheDocument();
	});
});
