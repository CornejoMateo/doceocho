import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { DashboardHome } from '@/components/layout/dashboard-home';
import { useLoadEvents } from '@/hooks/calendar/use-load-events';
import { getClientsCount, getClientsThisWeek } from '@/lib/clients/clients';
import { getWorksInProgressCount, getWorksThisWeek, getWorksByIds } from '@/lib/works/works';
import { getSoldBudgetsCount } from '@/lib/reports/budgets/methods';
import { useRouter } from 'next/navigation';
import { useOptimizedRealtime } from '@/hooks/use-optimized-realtime';

jest.mock('@/hooks/calendar/use-load-events', () => ({
	useLoadEvents: jest.fn(),
}));

jest.mock('@/lib/clients/clients', () => ({
	getClientsCount: jest.fn(),
	getClientsThisWeek: jest.fn(),
}));

jest.mock('@/lib/works/works', () => ({
	getWorksInProgressCount: jest.fn(),
	getWorksThisWeek: jest.fn(),
	getWorksByIds: jest.fn(),
}));

jest.mock('@/lib/reports/budgets/methods', () => ({
	getSoldBudgetsCount: jest.fn(),
}));

jest.mock('@/hooks/use-optimized-realtime', () => ({
	useOptimizedRealtime: jest.fn(),
}));

jest.mock('next/navigation', () => ({
	useRouter: jest.fn(),
}));

jest.mock('@/components/ui/card', () => ({
	Card: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

function setup() {
	(useLoadEvents as jest.Mock).mockReturnValue({ events: [], isLoading: false });
	(getClientsCount as jest.Mock).mockResolvedValue({ data: 10, error: null });
	(getWorksInProgressCount as jest.Mock).mockResolvedValue({ data: 5, error: null });
	(getSoldBudgetsCount as jest.Mock).mockResolvedValue({ data: 8, error: null });
	(useRouter as jest.Mock).mockReturnValue({ push: jest.fn() });
	(useOptimizedRealtime as jest.Mock).mockReturnValue({
		data: [],
		loading: false,
		error: null,
		refresh: jest.fn(),
		invalidateCache: jest.fn(),
	});
	(getClientsThisWeek as jest.Mock).mockResolvedValue({ data: [], error: null });
	(getWorksThisWeek as jest.Mock).mockResolvedValue({ data: [], error: null });
	(getWorksByIds as jest.Mock).mockResolvedValue({ data: [], error: null });

	render(<DashboardHome />);
}

describe('DashboardHome', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders the welcome title', () => {
		setup();
		expect(screen.getByText('Bienvenido al Sistema de Gestión')).toBeInTheDocument();
	});

	it('handles metrics fetch errors gracefully', async () => {
		(getClientsCount as jest.Mock).mockResolvedValue({ data: null, error: 'Error' });
		(getWorksInProgressCount as jest.Mock).mockResolvedValue({ data: null, error: 'Error' });
		(getSoldBudgetsCount as jest.Mock).mockResolvedValue({ data: null, error: 'Error' });

		setup();

		await waitFor(() => {
			expect(screen.getByText('Bienvenido al Sistema de Gestión')).toBeInTheDocument();
		});
	});
});
