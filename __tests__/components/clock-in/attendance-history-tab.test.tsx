import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AttendanceHistoryTab } from '@/components/business/clock-in/attendance-history-tab';
import { useAuth } from '@/components/provider/auth-provider';

jest.mock('@/components/provider/auth-provider', () => ({
	useAuth: jest.fn(),
}));

jest.mock('@/components/ui/button', () => ({
	Button: ({ children, onClick, disabled, variant, type, ...props }: any) => (
		<button
			onClick={onClick}
			disabled={disabled}
			data-variant={variant}
			type={type}
			data-testid={props['data-testid']}
			{...props}
		>
			{children}
		</button>
	),
}));

jest.mock('@/components/business/clock-in/attendance-history', () => ({
	AttendanceHistory: () => <div data-testid="attendance-history" />,
}));

jest.mock('@/components/business/clock-in/admin-attendance-history', () => ({
	AdminAttendanceHistory: require('react').forwardRef((props: any, ref: any) => (
		<div data-testid="admin-attendance-history" />
	)),
}));

jest.mock('@/components/business/clock-in/attendance-settings', () => ({
	AttendanceSettings: ({ open }: any) => (open ? <div data-testid="attendance-settings" /> : null),
}));

jest.mock('@/components/business/clock-in/attendance-entry-modal', () => ({
	AttendanceEntryModal: ({ open }: any) =>
		open ? <div data-testid="attendance-entry-modal" /> : null,
}));

jest.mock('@/components/business/clock-in/settlements/settlements-modal', () => ({
	SettlementsModal: ({ open }: any) => (open ? <div data-testid="settlements-modal" /> : null),
}));

jest.mock('lucide-react', () => ({
	Settings: () => <span>SettingsIcon</span>,
}));

const mockUseAuth = useAuth as jest.Mock;

function setupAuth(role: string) {
	mockUseAuth.mockReturnValue({
		user: {
			uid: 'user-1',
			username: 'testuser',
			name: 'Test',
			last_name: 'User',
			role,
		},
		loading: false,
		signIn: jest.fn(),
		signOutUser: jest.fn(),
	});
}

beforeEach(() => {
	jest.clearAllMocks();
});

describe('AttendanceHistoryTab', () => {
	describe('Admin view', () => {
		beforeEach(() => setupAuth('Admin'));

		it('renders Configuración but not Crear registro nor Liquidaciones (Superadmin only)', () => {
			render(<AttendanceHistoryTab />);

			expect(screen.queryByText('Crear registro')).not.toBeInTheDocument();
			expect(screen.queryByText('Liquidaciones')).not.toBeInTheDocument();
			expect(screen.getByText('Configuración')).toBeInTheDocument();
		});

		it('renders AdminAttendanceHistory', () => {
			render(<AttendanceHistoryTab />);

			expect(screen.getByTestId('admin-attendance-history')).toBeInTheDocument();
		});

		it('all admin buttons have type="button"', () => {
			render(<AttendanceHistoryTab />);

			expect(screen.getByText('Configuración')).toHaveAttribute('type', 'button');
		});

		it('does not render Taller own history', () => {
			render(<AttendanceHistoryTab />);

			expect(screen.queryByTestId('attendance-history')).not.toBeInTheDocument();
		});

		it('does not render SettlementsModal', () => {
			render(<AttendanceHistoryTab />);

			expect(screen.queryByTestId('settlements-modal')).not.toBeInTheDocument();
		});

		it('opens AttendanceSettings when clicking Configuración', () => {
			render(<AttendanceHistoryTab />);

			fireEvent.click(screen.getByText('Configuración'));

			expect(screen.getByTestId('attendance-settings')).toBeInTheDocument();
		});
	});

	describe('Superadmin view', () => {
		beforeEach(() => setupAuth('Superadmin'));

		it('renders Crear registro plus the rest of the admin buttons', () => {
			render(<AttendanceHistoryTab />);

			expect(screen.getByText('Crear registro')).toBeInTheDocument();
			expect(screen.getByText('Liquidaciones')).toBeInTheDocument();
			expect(screen.getByText('Configuración')).toBeInTheDocument();
		});

		it('renders AdminAttendanceHistory', () => {
			render(<AttendanceHistoryTab />);

			expect(screen.getByTestId('admin-attendance-history')).toBeInTheDocument();
		});

		it('opens AttendanceEntryModal when clicking Crear registro', () => {
			render(<AttendanceHistoryTab />);

			fireEvent.click(screen.getByText('Crear registro'));

			expect(screen.getByTestId('attendance-entry-modal')).toBeInTheDocument();
		});

		it('opens SettlementsModal when clicking Liquidaciones', () => {
			render(<AttendanceHistoryTab />);

			fireEvent.click(screen.getByText('Liquidaciones'));

			expect(screen.getByTestId('settlements-modal')).toBeInTheDocument();
		});
	});

	describe('Taller view', () => {
		beforeEach(() => setupAuth('Taller'));

		it('renders own AttendanceHistory', () => {
			render(<AttendanceHistoryTab />);

			expect(screen.getByTestId('attendance-history')).toBeInTheDocument();
		});

		it('does not render admin buttons or AdminAttendanceHistory', () => {
			render(<AttendanceHistoryTab />);

			expect(screen.queryByText('Crear registro')).not.toBeInTheDocument();
			expect(screen.queryByTestId('admin-attendance-history')).not.toBeInTheDocument();
		});
	});

	describe('No user', () => {
		it('renders nothing role-specific when user is null', async () => {
			mockUseAuth.mockReturnValue({
				user: null,
				loading: false,
				signIn: jest.fn(),
				signOutUser: jest.fn(),
			});

			render(<AttendanceHistoryTab />);

			expect(screen.queryByText('Crear registro')).not.toBeInTheDocument();
			expect(screen.queryByTestId('attendance-history')).not.toBeInTheDocument();
		});
	});
});
