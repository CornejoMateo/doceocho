import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CashFlowManagement } from '@/components/business/cash-flow/cash-flow-management';
import * as realtimeHook from '@/hooks/use-optimized-realtime';

jest.mock('@/lib/cash-flow/cash-flow');
jest.mock('@/hooks/use-optimized-realtime');
jest.mock('@/components/provider/auth-provider', () => ({
	useAuth: () => ({ user: { role: 'Admin' } }),
}));

jest.mock('@/components/business/cash-flow/checking-accounts-tab', () => ({
	CheckingAccountsTab: () => <div data-testid="checking-accounts-tab" />,
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

	it('shows the "En desarrollo" placeholder in the summary tab', () => {
		(realtimeHook.useOptimizedRealtime as jest.Mock).mockImplementation((key) => {
			if (key === 'cash_boxes') {
				return { data: [], loading: false, refresh: mockRefreshCashBoxes };
			}
			return { data: [], loading: false, refresh: mockRefreshBankAccounts };
		});

		render(<CashFlowManagement />);
		expect(screen.getByText('En desarrollo')).toBeInTheDocument();
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
});
