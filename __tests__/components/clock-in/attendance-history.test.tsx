import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AttendanceHistory } from '@/components/business/clock-in/attendance-history';
import { getUserAttendanceEntriesForMonth } from '@/lib/attendance/attendance-entries';

jest.mock('@/lib/attendance/attendance-entries', () => ({
	getUserAttendanceEntriesForMonth: jest.fn(),
	getEntriesByPeriod: jest.requireActual('@/lib/attendance/attendance-entries').getEntriesByPeriod,
}));

jest.mock('@/components/provider/auth-provider', () => ({
	useAuth: () => ({ user: { uid: 'user-1' } }),
}));

jest.mock('@/utils/format-date', () => ({
	formatCreatedAt: (d: string) => d || 'N/A',
	getLocalDate: () => '2026-08-21',
}));

jest.mock('@/lib/error-translator', () => ({
	translateError: (e: any) => e?.message || 'Error desconocido',
}));

jest.mock('@/components/ui/spinner', () => ({
	Spinner: (props: any) => <div data-testid="spinner" {...props} />,
}));

jest.mock('@/components/ui/button', () => ({
	Button: ({ children, onClick, disabled, variant, type, ...props }: any) => (
		<button onClick={onClick} disabled={disabled} data-variant={variant} type={type} {...props}>
			{children}
		</button>
	),
}));

jest.mock('@/components/ui/card', () => ({
	Card: ({ children, ...props }: any) => (
		<div data-testid="card" {...props}>
			{children}
		</div>
	),
	CardHeader: ({ children }: any) => <div>{children}</div>,
	CardTitle: ({ children }: any) => <h3>{children}</h3>,
	CardContent: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/business/clock-in/load-more-attendance-modal', () => ({
	LoadMoreAttendanceModal: () => <div data-testid="load-more-modal" />,
}));

beforeEach(() => {
	(getUserAttendanceEntriesForMonth as jest.Mock).mockReset();
});

describe('AttendanceHistory', () => {
	const sampleEntries = [
		{
			id: 1,
			attendance_id: 10,
			type: 'regular_in',
			entry_time: '2026-08-21T10:00:00Z',
			latitude: -34.6,
			longitude: -58.4,
			description: null,
			attendance_date: '2026-08-21',
			user_id: 'user-1',
		},
		{
			id: 2,
			attendance_id: 10,
			type: 'regular_out',
			entry_time: '2026-08-21T18:00:00Z',
			latitude: -34.6,
			longitude: -58.4,
			description: null,
			attendance_date: '2026-08-21',
			user_id: 'user-1',
		},
	];

	it('shows "Ver historial de fichajes" button', () => {
		render(<AttendanceHistory />);
		expect(screen.getByText('Ver historial de fichajes')).toBeInTheDocument();
	});

	it('type="button" on "Ver historial de fichajes" button', () => {
		render(<AttendanceHistory />);
		expect(screen.getByText('Ver historial de fichajes')).toHaveAttribute('type', 'button');
	});

	it('shows "Cargando historial..." with spinner when expanding', async () => {
		(getUserAttendanceEntriesForMonth as jest.Mock).mockReturnValue(new Promise(() => {}));
		render(<AttendanceHistory />);
		fireEvent.click(screen.getByText('Ver historial de fichajes'));
		expect(screen.getByText('Cargando historial...')).toBeInTheDocument();
		expect(screen.getByTestId('spinner')).toBeInTheDocument();
	});

	it('shows entries after successful load', async () => {
		(getUserAttendanceEntriesForMonth as jest.Mock).mockResolvedValue({
			data: sampleEntries,
			error: null,
		});
		render(<AttendanceHistory />);
		fireEvent.click(screen.getByText('Ver historial de fichajes'));
		await waitFor(() => {
			expect(screen.getByText('Entrada')).toBeInTheDocument();
		});
		expect(screen.getByText('Salida')).toBeInTheDocument();
	});

	it('shows error message when load fails', async () => {
		(getUserAttendanceEntriesForMonth as jest.Mock).mockResolvedValue({
			data: null,
			error: { message: 'DB error' },
		});
		render(<AttendanceHistory />);
		fireEvent.click(screen.getByText('Ver historial de fichajes'));
		await waitFor(() => {
			expect(screen.getByText('DB error')).toBeInTheDocument();
		});
	});

	it('shows Retry button when there is an error', async () => {
		(getUserAttendanceEntriesForMonth as jest.Mock).mockResolvedValue({
			data: null,
			error: { message: 'fail' },
		});
		render(<AttendanceHistory />);
		fireEvent.click(screen.getByText('Ver historial de fichajes'));
		await waitFor(() => {
			expect(screen.getByText('Reintentar')).toBeInTheDocument();
		});
	});

	it('Retry calls loadHistory again', async () => {
		(getUserAttendanceEntriesForMonth as jest.Mock)
			.mockResolvedValueOnce({ data: null, error: { message: 'fail' } })
			.mockResolvedValueOnce({ data: sampleEntries, error: null });
		render(<AttendanceHistory />);
		fireEvent.click(screen.getByText('Ver historial de fichajes'));
		await waitFor(() => {
			expect(screen.getByText('Reintentar')).toBeInTheDocument();
		});
		fireEvent.click(screen.getByText('Reintentar'));
		await waitFor(() => {
			expect(screen.getByText('Entrada')).toBeInTheDocument();
		});
	});

	it('shows "No hay registros de fichaje" when there are no entries', async () => {
		(getUserAttendanceEntriesForMonth as jest.Mock).mockResolvedValue({
			data: [],
			error: null,
		});
		render(<AttendanceHistory />);
		fireEvent.click(screen.getByText('Ver historial de fichajes'));
		await waitFor(() => {
			expect(screen.getByText('No hay registros de fichaje')).toBeInTheDocument();
		});
	});

	it('toggle Hide hides the history', async () => {
		(getUserAttendanceEntriesForMonth as jest.Mock).mockResolvedValue({
			data: sampleEntries,
			error: null,
		});
		render(<AttendanceHistory />);
		fireEvent.click(screen.getByText('Ver historial de fichajes'));
		await waitFor(() => {
			expect(screen.getByText('Historial de Fichajes')).toBeInTheDocument();
		});
		fireEvent.click(screen.getByText('Ocultar'));
		expect(screen.getByText('Ver historial de fichajes')).toBeInTheDocument();
	});

	it('type="button" on all buttons', async () => {
		(getUserAttendanceEntriesForMonth as jest.Mock).mockResolvedValue({
			data: sampleEntries,
			error: null,
		});
		render(<AttendanceHistory />);
		fireEvent.click(screen.getByText('Ver historial de fichajes'));
		await waitFor(() => {
			expect(screen.getByText('Entrada')).toBeInTheDocument();
		});
		const buttons = screen.getAllByRole('button');
		buttons.forEach((btn) => {
			expect(btn).toHaveAttribute('type', 'button');
		});
	});

	it('switching to "Mes actual" shows entries from the month', async () => {
		const multiEntries = [
			{ ...sampleEntries[0], attendance_date: '2026-08-21' },
			{ ...sampleEntries[1], attendance_date: '2026-08-21' },
			{ ...sampleEntries[0], id: 3, attendance_date: '2026-08-01' },
			{ ...sampleEntries[1], id: 4, attendance_date: '2026-08-15' },
		];
		(getUserAttendanceEntriesForMonth as jest.Mock).mockResolvedValue({
			data: multiEntries,
			error: null,
		});
		render(<AttendanceHistory />);
		fireEvent.click(screen.getByText('Ver historial de fichajes'));
		await waitFor(() => {
			expect(screen.getByText('Entrada')).toBeInTheDocument();
		});
		fireEvent.click(screen.getByText('Mes actual'));
		await waitFor(() => {
			expect(screen.getAllByText('Entrada').length).toBeGreaterThanOrEqual(2);
		});
	});

	it('shows "Fecha" label on date input when Mes actual is active', async () => {
		(getUserAttendanceEntriesForMonth as jest.Mock).mockResolvedValue({
			data: sampleEntries,
			error: null,
		});
		render(<AttendanceHistory />);
		fireEvent.click(screen.getByText('Ver historial de fichajes'));
		await waitFor(() => {
			expect(screen.getByText('Entrada')).toBeInTheDocument();
		});
		fireEvent.click(screen.getByText('Mes actual'));
		expect(screen.getByText('Filtrar por fecha')).toBeInTheDocument();
	});

	it('type="button" on "Cargar más fichajes" button', async () => {
		(getUserAttendanceEntriesForMonth as jest.Mock).mockResolvedValue({
			data: sampleEntries,
			error: null,
		});
		render(<AttendanceHistory />);
		fireEvent.click(screen.getByText('Ver historial de fichajes'));
		await waitFor(() => {
			expect(screen.getByText('Entrada')).toBeInTheDocument();
		});
		const loadMoreBtn = screen.getByText('Cargar más fichajes');
		expect(loadMoreBtn).toHaveAttribute('type', 'button');
	});

	it('renders LoadMoreAttendanceModal', async () => {
		(getUserAttendanceEntriesForMonth as jest.Mock).mockResolvedValue({
			data: sampleEntries,
			error: null,
		});
		render(<AttendanceHistory />);
		fireEvent.click(screen.getByText('Ver historial de fichajes'));
		await waitFor(() => {
			expect(screen.getByTestId('load-more-modal')).toBeInTheDocument();
		});
	});

	it('shows generic error message when catch throws exception', async () => {
		(getUserAttendanceEntriesForMonth as jest.Mock).mockRejectedValue(new Error('Network fail'));
		render(<AttendanceHistory />);
		fireEvent.click(screen.getByText('Ver historial de fichajes'));
		await waitFor(() => {
			expect(screen.getByText('Network fail')).toBeInTheDocument();
		});
	});
});
