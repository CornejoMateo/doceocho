import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ClockIn } from '@/components/business/clock-in/clock-in';
import { useAuth } from '@/components/provider/auth-provider';
import { useOptimizedRealtime } from '@/hooks/use-optimized-realtime';
import { getAttendanceSettings } from '@/lib/attendance/attendance-settings';
import { getAttendanceStatus } from '@/lib/attendance/attendance-entries';
import { getCurrentLocation } from '@/helpers/attendance/geolocation';
import { isWithinRadius } from '@/helpers/attendance/distance';
import { toast } from '@/components/ui/use-toast';

jest.mock('@/components/provider/auth-provider', () => ({
	useAuth: jest.fn(),
}));

jest.mock('@/hooks/use-optimized-realtime', () => ({
	useOptimizedRealtime: jest.fn(),
}));

jest.mock('@/lib/attendance/attendance-settings', () => ({
	getAttendanceSettings: jest.fn(),
}));

jest.mock('@/lib/attendance/attendance-entries', () => ({
	getAttendanceStatus: jest.fn(),
}));

jest.mock('@/helpers/attendance/geolocation', () => ({
	getCurrentLocation: jest.fn(),
}));

jest.mock('@/helpers/attendance/distance', () => ({
	isWithinRadius: jest.fn(),
}));

jest.mock('@/components/ui/use-toast', () => ({
	toast: jest.fn(() => ({
		id: '1',
		dismiss: jest.fn(),
		update: jest.fn(),
	})),
}));

jest.mock('@/lib/error-translator', () => ({
	translateError: (e: any) => e?.message || 'Error desconocido',
}));

jest.mock('@/lib/users/users', () => ({
	listUsers: jest.fn().mockResolvedValue({ data: [], error: null }),
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

jest.mock('@/components/ui/spinner', () => ({
	Spinner: (props: any) => <div data-testid="spinner" {...props} />,
}));

jest.mock('@/components/ui/card', () => ({
	Card: ({ children, ...props }: any) => (
		<div data-testid="card" {...props}>
			{children}
		</div>
	),
	CardContent: ({ children }: any) => <div>{children}</div>,
	CardDescription: ({ children }: any) => <p>{children}</p>,
	CardHeader: ({ children }: any) => <div>{children}</div>,
	CardTitle: ({ children }: any) => <h3>{children}</h3>,
}));

jest.mock('@/components/ui/tabs', () => {
	const { createContext, useContext, useState } = require('react');
	const TabsContext = createContext({
		value: '',
		setValue: (_value: string) => {},
	});
	const Tabs = ({ children, defaultValue }: any) => {
		const [value, setValue] = useState(defaultValue);
		return (
			<TabsContext.Provider value={{ value, setValue }}>
				<div data-testid="tabs" data-default-value={defaultValue}>
					{children}
				</div>
			</TabsContext.Provider>
		);
	};
	const TabsList = ({ children }: any) => <div role="tablist">{children}</div>;
	const TabsTrigger = ({ children, value, onClick, ...props }: any) => {
		const { setValue } = useContext(TabsContext);
		return (
			<button
				role="tab"
				data-value={value}
				onClick={(event: any) => {
					setValue(value);
					onClick?.(event);
				}}
				{...props}
			>
				{children}
			</button>
		);
	};
	const TabsContent = ({ children, value }: any) => {
		const { value: activeValue } = useContext(TabsContext);
		return activeValue === value ? (
			<div data-testid={`tabs-content-${value}`}>{children}</div>
		) : null;
	};
	return { Tabs, TabsList, TabsTrigger, TabsContent };
});

jest.mock('@/components/business/clock-in/attendance-history', () => ({
	AttendanceHistory: () => <div data-testid="attendance-history" />,
}));

jest.mock('@/components/business/modules/module-management', () => ({
	ModuleManagement: () => <div data-testid="module-management" />,
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

jest.mock('@/components/business/clock-in/attendance-qr-code', () => ({
	__esModule: true,
	default: () => <div data-testid="attendance-qr-code" />,
}));

jest.mock('@/components/business/clock-in/attendance-qr-scanner', () => ({
	__esModule: true,
	default: ({ onClose, onScan }: any) => (
		<div data-testid="qr-scanner">
			<button onClick={onClose}>Close Scanner</button>
			<button onClick={() => onScan('test-token')}>Simulate Scan</button>
		</div>
	),
}));

jest.mock('lucide-react', () => ({
	Settings: () => <span>SettingsIcon</span>,
}));

jest.mock('next/navigation', () => ({
	useRouter: () => ({
		push: jest.fn(),
		replace: jest.fn(),
		back: jest.fn(),
	}),
}));

const mockUseAuth = useAuth as jest.Mock;
const mockUseOptimizedRealtime = useOptimizedRealtime as jest.Mock;
const mockGetAttendanceSettings = getAttendanceSettings as jest.Mock;
const mockGetAttendanceStatus = getAttendanceStatus as jest.Mock;
const mockGetCurrentLocation = getCurrentLocation as jest.Mock;
const mockIsWithinRadius = isWithinRadius as jest.Mock;
const mockToast = toast as jest.Mock;

function setupAuth(role: string = 'Taller') {
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

function setupRealtime() {
	mockUseOptimizedRealtime.mockReturnValue({
		data: [],
		loading: false,
		error: null,
		refresh: jest.fn(),
		invalidateCache: jest.fn(),
	});
}

function setupDefaults(overrides?: {
	role?: string;
	status?: { regularOpen: boolean; overtimeOpen: boolean };
}) {
	setupAuth(overrides?.role ?? 'Taller');
	setupRealtime();
	mockGetAttendanceSettings.mockResolvedValue({
		data: { square_meters: 50, target_latitude: -34.6, target_longitude: -58.4 },
		error: null,
	});
	mockGetAttendanceStatus.mockResolvedValue({
		data: overrides?.status ?? { regularOpen: false, overtimeOpen: false },
		error: null,
	});
	mockGetCurrentLocation.mockResolvedValue({ latitude: -34.6, longitude: -58.4 });
	mockIsWithinRadius.mockReturnValue(true);
	mockToast.mockReturnValue({
		id: '1',
		dismiss: jest.fn(),
		update: jest.fn(),
	});
}

beforeEach(() => {
	jest.clearAllMocks();
});

describe('ClockIn', () => {
	describe('Loading state', () => {
		it('shows spinner while loading settings and status', () => {
			setupDefaults();
			mockGetAttendanceSettings.mockReturnValue(new Promise(() => {}));

			render(<ClockIn />);

			expect(screen.getAllByTestId('spinner').length).toBeGreaterThan(0);
		});

		it('hides spinner after init completes', async () => {
			setupDefaults();

			render(<ClockIn />);

			await waitFor(() => {
				expect(screen.queryAllByTestId('spinner').length).toBe(0);
			});
		});
	});

	describe('Admin view', () => {
		beforeEach(() => setupDefaults({ role: 'Admin' }));

		it('renders admin buttons after loading', async () => {
			render(<ClockIn />);

			await waitFor(() => {
				expect(screen.getByText('Crear registro')).toBeInTheDocument();
			});

			expect(screen.getByText('Liquidaciones')).toBeInTheDocument();
			expect(screen.getByText('Configuración')).toBeInTheDocument();
		});

		it('renders AdminAttendanceHistory', async () => {
			render(<ClockIn />);

			await waitFor(() => {
				expect(screen.getByTestId('admin-attendance-history')).toBeInTheDocument();
			});
		});

		it('all admin buttons have type="button"', async () => {
			render(<ClockIn />);

			await waitFor(() => {
				expect(screen.getByText('Crear registro')).toBeInTheDocument();
			});

			expect(screen.getByText('Crear registro')).toHaveAttribute('type', 'button');
			expect(screen.getByText('Liquidaciones')).toHaveAttribute('type', 'button');
			expect(screen.getByText('Configuración')).toHaveAttribute('type', 'button');
		});

		it('does not render Taller or QR sections', async () => {
			render(<ClockIn />);

			await waitFor(() => {
				expect(screen.getByText('Crear registro')).toBeInTheDocument();
			});

			expect(screen.queryByText('Registrar entrada')).not.toBeInTheDocument();
			expect(screen.queryByTestId('attendance-qr-code')).not.toBeInTheDocument();
		});
	});

	describe('Taller view', () => {
		beforeEach(() => setupDefaults());

		it('renders clock-in buttons when not clocked in', async () => {
			render(<ClockIn />);

			await waitFor(() => {
				expect(screen.getByText('Registrar entrada')).toBeInTheDocument();
			});

			expect(screen.getByText('Registrar entrada (horas extras)')).toBeInTheDocument();
		});

		it('renders AttendanceHistory', async () => {
			render(<ClockIn />);

			await waitFor(() => {
				expect(screen.getByTestId('attendance-history')).toBeInTheDocument();
			});
		});

		it('shows "Registrar salida" when clocked in', async () => {
			mockGetAttendanceStatus.mockResolvedValue({
				data: { regularOpen: true, overtimeOpen: false },
				error: null,
			});

			render(<ClockIn />);

			await waitFor(() => {
				expect(screen.getByText('Registrar salida')).toBeInTheDocument();
			});

			expect(screen.queryByText('Registrar entrada')).not.toBeInTheDocument();
		});

		it('shows "Registrar salida (horas extras)" when clocked in overtime', async () => {
			mockGetAttendanceStatus.mockResolvedValue({
				data: { regularOpen: false, overtimeOpen: true },
				error: null,
			});

			render(<ClockIn />);

			await waitFor(() => {
				expect(screen.getByText('Registrar salida (horas extras)')).toBeInTheDocument();
			});

			expect(screen.queryByText('Registrar entrada')).not.toBeInTheDocument();
		});

		it('all Taller buttons have type="button"', async () => {
			render(<ClockIn />);

			await waitFor(() => {
				expect(screen.getByText('Registrar entrada')).toBeInTheDocument();
			});

			expect(screen.getByText('Registrar entrada')).toHaveAttribute('type', 'button');
			expect(screen.getByText('Registrar entrada (horas extras)')).toHaveAttribute(
				'type',
				'button'
			);
		});

		it('does not render Admin or QR sections', async () => {
			render(<ClockIn />);

			await waitFor(() => {
				expect(screen.getByText('Registrar entrada')).toBeInTheDocument();
			});

			expect(screen.queryByText('Crear registro')).not.toBeInTheDocument();
			expect(screen.queryByTestId('attendance-qr-code')).not.toBeInTheDocument();
		});

		it('opens scanner when clicking clock-in button', async () => {
			render(<ClockIn />);

			await waitFor(() => {
				expect(screen.getByText('Registrar entrada')).toBeInTheDocument();
			});

			fireEvent.click(screen.getByText('Registrar entrada'));

			await waitFor(() => {
				expect(screen.getByTestId('qr-scanner')).toBeInTheDocument();
			});
		});

		it('shows spinner and disables buttons during validation', async () => {
			render(<ClockIn />);

			await waitFor(() => {
				expect(screen.getByText('Registrar entrada')).toBeInTheDocument();
			});

			fireEvent.click(screen.getByText('Registrar entrada'));

			expect(screen.getByText('Registrar entrada')).toBeDisabled();
			expect(screen.getByText('Registrar entrada (horas extras)')).toBeDisabled();
		});

		it('shows error toast when location is outside radius', async () => {
			mockIsWithinRadius.mockReturnValue(false);

			render(<ClockIn />);

			await waitFor(() => {
				expect(screen.getByText('Registrar entrada')).toBeInTheDocument();
			});

			fireEvent.click(screen.getByText('Registrar entrada'));

			await waitFor(() => {
				expect(mockToast).toHaveBeenCalledWith(
					expect.objectContaining({
						title: 'Error',
						variant: 'destructive',
					})
				);
			});
		});
	});

	describe('QR view', () => {
		beforeEach(() => {
			setupDefaults({ role: 'QR' });
		});

		it('renders QR code card', async () => {
			render(<ClockIn />);

			await waitFor(() => {
				expect(screen.getByTestId('attendance-qr-code')).toBeInTheDocument();
			});
		});

		it('renders QR card title and description', async () => {
			render(<ClockIn />);

			await waitFor(() => {
				expect(screen.getByText('QR de fichaje')).toBeInTheDocument();
			});

			expect(screen.getByText(/Escaneá este código/)).toBeInTheDocument();
		});
	});

	describe('Scanner flow', () => {
		beforeEach(() => setupDefaults());

		it('closes scanner and clears pending action on close', async () => {
			render(<ClockIn />);

			await waitFor(() => {
				expect(screen.getByText('Registrar entrada')).toBeInTheDocument();
			});

			fireEvent.click(screen.getByText('Registrar entrada'));

			await waitFor(() => {
				expect(screen.getByTestId('qr-scanner')).toBeInTheDocument();
			});

			fireEvent.click(screen.getByText('Close Scanner'));

			await waitFor(() => {
				expect(screen.queryByTestId('qr-scanner')).not.toBeInTheDocument();
			});
		});

		it('calls fetch on successful scan', async () => {
			global.fetch = jest.fn().mockResolvedValue({
				ok: true,
				json: jest.fn().mockResolvedValue({}),
			});

			render(<ClockIn />);

			await waitFor(() => {
				expect(screen.getByText('Registrar entrada')).toBeInTheDocument();
			});

			fireEvent.click(screen.getByText('Registrar entrada'));

			await waitFor(() => {
				expect(screen.getByTestId('qr-scanner')).toBeInTheDocument();
			});

			fireEvent.click(screen.getByText('Simulate Scan'));

			await waitFor(() => {
				expect(global.fetch).toHaveBeenCalledWith(
					'/api/attendance/register-attendance',
					expect.objectContaining({ method: 'POST' })
				);
			});

			(global.fetch as jest.Mock).mockRestore();
		});

		it('dismisses loading toast and shows success toast on successful register', async () => {
			const mockDismiss = jest.fn();
			mockToast.mockReturnValue({
				id: '1',
				dismiss: mockDismiss,
				update: jest.fn(),
			});

			global.fetch = jest.fn().mockResolvedValue({
				ok: true,
				json: jest.fn().mockResolvedValue({}),
			});

			render(<ClockIn />);

			await waitFor(() => {
				expect(screen.getByText('Registrar entrada')).toBeInTheDocument();
			});

			fireEvent.click(screen.getByText('Registrar entrada'));

			await waitFor(() => {
				expect(screen.getByTestId('qr-scanner')).toBeInTheDocument();
			});

			fireEvent.click(screen.getByText('Simulate Scan'));

			await waitFor(() => {
				expect(mockDismiss).toHaveBeenCalled();
				expect(mockToast).toHaveBeenCalledWith(
					expect.objectContaining({
						title: 'Fichaje registrado',
					})
				);
			});

			(global.fetch as jest.Mock).mockRestore();
		});

		it('shows error toast with fallback message when server returns non-JSON error', async () => {
			const jsonReject = jest.fn().mockRejectedValue(new Error('Not JSON'));
			global.fetch = jest.fn().mockResolvedValue({
				ok: false,
				json: jsonReject,
			});

			render(<ClockIn />);

			await waitFor(() => {
				expect(screen.getByText('Registrar entrada')).toBeInTheDocument();
			});

			fireEvent.click(screen.getByText('Registrar entrada'));

			await waitFor(() => {
				expect(screen.getByTestId('qr-scanner')).toBeInTheDocument();
			});

			fireEvent.click(screen.getByText('Simulate Scan'));

			await waitFor(() => {
				expect(mockToast).toHaveBeenCalledWith(
					expect.objectContaining({
						title: 'Error al registrar fichaje',
						variant: 'destructive',
					})
				);
			});

			(global.fetch as jest.Mock).mockRestore();
		});

		it('shows error toast when server returns JSON with message', async () => {
			global.fetch = jest.fn().mockResolvedValue({
				ok: false,
				json: jest.fn().mockResolvedValue({ message: 'Token inválido' }),
			});

			render(<ClockIn />);

			await waitFor(() => {
				expect(screen.getByText('Registrar entrada')).toBeInTheDocument();
			});

			fireEvent.click(screen.getByText('Registrar entrada'));

			await waitFor(() => {
				expect(screen.getByTestId('qr-scanner')).toBeInTheDocument();
			});

			fireEvent.click(screen.getByText('Simulate Scan'));

			await waitFor(() => {
				expect(mockToast).toHaveBeenCalledWith(
					expect.objectContaining({
						title: 'Error al registrar fichaje',
						description: 'Token inválido',
						variant: 'destructive',
					})
				);
			});

			(global.fetch as jest.Mock).mockRestore();
		});
	});

	describe('No user', () => {
		it('shows no Taller or QR content when user is null', () => {
			mockUseAuth.mockReturnValue({
				user: null,
				loading: false,
				signIn: jest.fn(),
				signOutUser: jest.fn(),
			});
			setupRealtime();
			mockGetAttendanceSettings.mockResolvedValue({ data: null, error: null });
			mockGetAttendanceStatus.mockResolvedValue({ data: null, error: null });

			render(<ClockIn />);

			expect(screen.queryByText('Registrar entrada')).not.toBeInTheDocument();
			expect(screen.queryByTestId('attendance-qr-code')).not.toBeInTheDocument();
		});
	});

	describe('Modal controls', () => {
		beforeEach(() => setupDefaults({ role: 'Admin' }));

		it('opens CreateEntryModal when clicking Crear registro', async () => {
			render(<ClockIn />);

			await waitFor(() => {
				expect(screen.getByText('Crear registro')).toBeInTheDocument();
			});

			fireEvent.click(screen.getByText('Crear registro'));

			expect(screen.getByTestId('attendance-entry-modal')).toBeInTheDocument();
		});

		it('opens SettlementsModal when clicking Liquidaciones', async () => {
			render(<ClockIn />);

			await waitFor(() => {
				expect(screen.getByText('Liquidaciones')).toBeInTheDocument();
			});

			fireEvent.click(screen.getByText('Liquidaciones'));

			expect(screen.getByTestId('settlements-modal')).toBeInTheDocument();
		});

		it('opens AttendanceSettings when clicking Configuración', async () => {
			render(<ClockIn />);

			await waitFor(() => {
				expect(screen.getByText('Configuración')).toBeInTheDocument();
			});

			fireEvent.click(screen.getByText('Configuración'));

			expect(screen.getByTestId('attendance-settings')).toBeInTheDocument();
		});
	});

	describe('Module tab', () => {
		beforeEach(() => setupDefaults());

		it('shows module management only after switching to the module tab', async () => {
			render(<ClockIn />);

			await waitFor(() => {
				expect(screen.getByText('Registrar entrada')).toBeInTheDocument();
			});

			expect(screen.queryByTestId('module-management')).not.toBeInTheDocument();

			fireEvent.click(screen.getByText('Por módulo'));

			expect(screen.getByTestId('module-management')).toBeInTheDocument();
			expect(screen.queryByText('Registrar entrada')).not.toBeInTheDocument();
		});
	});

	describe('Tab switching', () => {
		beforeEach(() => setupDefaults());

		it('renders both tab triggers', () => {
			render(<ClockIn />);

			expect(screen.getByText('Por hora')).toBeInTheDocument();
			expect(screen.getByText('Por módulo')).toBeInTheDocument();
		});

		it('switches back and forth between tabs', async () => {
			render(<ClockIn />);

			await waitFor(() => {
				expect(screen.getByText('Registrar entrada')).toBeInTheDocument();
			});

			fireEvent.click(screen.getByText('Por módulo'));

			expect(screen.getByTestId('module-management')).toBeInTheDocument();
			expect(screen.queryByText('Registrar entrada')).not.toBeInTheDocument();

			fireEvent.click(screen.getByText('Por hora'));

			await waitFor(() => {
				expect(screen.getByText('Registrar entrada')).toBeInTheDocument();
			});
			expect(screen.queryByTestId('module-management')).not.toBeInTheDocument();
		});
	});
});
