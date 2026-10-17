import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ClockIn } from '@/components/business/clock-in/clock-in';
import { useAuth } from '@/components/provider/auth-provider';
import { getAttendanceSettings } from '@/lib/attendance/attendance-settings';
import { getAttendanceStatus } from '@/lib/attendance/attendance-entries';
import { getCurrentLocation } from '@/helpers/attendance/geolocation';
import { isWithinRadius } from '@/helpers/attendance/distance';
import { toast } from '@/components/ui/use-toast';

jest.mock('@/components/provider/auth-provider', () => ({
	useAuth: jest.fn(),
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

jest.mock('next/navigation', () => ({
	useRouter: () => ({
		push: jest.fn(),
		replace: jest.fn(),
		back: jest.fn(),
	}),
}));

const mockUseAuth = useAuth as jest.Mock;
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

function setupDefaults(overrides?: {
	role?: string;
	status?: { regularOpen: boolean; overtimeOpen: boolean };
}) {
	setupAuth(overrides?.role ?? 'Taller');
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

		it('renders clock-in buttons after loading, same as Taller', async () => {
			render(<ClockIn />);

			await waitFor(() => {
				expect(screen.getByText('Registrar entrada')).toBeInTheDocument();
			});

			expect(screen.getByText('Registrar entrada (horas extras)')).toBeInTheDocument();
		});

		it('does not render QR card', async () => {
			render(<ClockIn />);

			await waitFor(() => {
				expect(screen.getByText('Registrar entrada')).toBeInTheDocument();
			});

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

		it('does not render QR section', async () => {
			render(<ClockIn />);

			await waitFor(() => {
				expect(screen.getByText('Registrar entrada')).toBeInTheDocument();
			});

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

		it('does not render clock-in buttons', async () => {
			render(<ClockIn />);

			await waitFor(() => {
				expect(screen.getByTestId('attendance-qr-code')).toBeInTheDocument();
			});

			expect(screen.queryByText('Registrar entrada')).not.toBeInTheDocument();
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
		it('shows no clock or QR content when user is null', () => {
			mockUseAuth.mockReturnValue({
				user: null,
				loading: false,
				signIn: jest.fn(),
				signOutUser: jest.fn(),
			});
			mockGetAttendanceSettings.mockResolvedValue({ data: null, error: null });
			mockGetAttendanceStatus.mockResolvedValue({ data: null, error: null });

			render(<ClockIn />);

			expect(screen.queryByText('Registrar entrada')).not.toBeInTheDocument();
			expect(screen.queryByTestId('attendance-qr-code')).not.toBeInTheDocument();
		});
	});
});
