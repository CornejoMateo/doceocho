import { render, screen } from '@testing-library/react';
import HomePage from '@/app/page';

const mockUseAuth = jest.fn();

jest.mock('@/components/provider/auth-provider', () => ({
	useAuth: () => mockUseAuth(),
}));

jest.mock('@/components/layout/dashboard-layout', () => ({
	DashboardLayout: ({ children }: any) => <div data-testid="layout">{children}</div>,
}));

jest.mock('@/components/layout/dashboard-home', () => ({
	DashboardHome: () => <div data-testid="dashboard-home" />,
}));

describe('app/page (home)', () => {
	test('a taller user granted the panel sees it instead of being sent away', () => {
		mockUseAuth.mockReturnValue({
			user: { role: 'Taller', views: ['panel', 'clients'] },
			loading: false,
		});

		render(<HomePage />);

		expect(screen.getByTestId('dashboard-home')).toBeInTheDocument();
	});

	test('without the panel only the layout renders, so it can redirect by views', () => {
		mockUseAuth.mockReturnValue({
			user: { role: 'Admin', views: ['clients'] },
			loading: false,
		});

		render(<HomePage />);

		expect(screen.getByTestId('layout')).toBeInTheDocument();
		expect(screen.queryByTestId('dashboard-home')).not.toBeInTheDocument();
	});
});
