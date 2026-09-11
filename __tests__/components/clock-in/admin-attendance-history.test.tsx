import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { createRef } from 'react';
import { AdminAttendanceHistory } from '@/components/business/clock-in/admin-attendance-history';
import {
	getAttendanceEntriesForMonth,
	deleteAttendanceEntry,
} from '@/lib/attendance/attendance-entries';
import { toast } from '@/components/ui/use-toast';

jest.mock('@/lib/attendance/attendance-entries', () => ({
	getAttendanceEntriesForMonth: jest.fn(),
	deleteAttendanceEntry: jest.fn(),
	getEntriesByPeriod: jest.requireActual('@/lib/attendance/attendance-entries').getEntriesByPeriod,
	mapAttendanceEntries: (data: any[]) =>
		data.map((entry: any) => ({
			...entry,
			attendance_date: entry.attendance_date || '2026-08-21',
			user_id: entry.user_id || 'user-1',
			user_name: entry.user_name || 'Test User',
		})),
}));

jest.mock('@/lib/attendance/attendance', () => ({
	...jest.requireActual('@/lib/attendance/attendance'),
	getUserAttendanceSummaries: (entries: any[]) => {
		const map: Record<string, any> = {};
		entries.forEach((e: any) => {
			if (!map[e.user_id]) {
				map[e.user_id] = {
					user_id: e.user_id,
					user_name: e.user_name || 'Test User',
					total_hours: 8,
					entries: [],
				};
			}
			map[e.user_id].entries.push(e);
		});
		return Object.values(map);
	},
}));

jest.mock('@/components/ui/use-toast', () => ({
	toast: jest.fn(),
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

jest.mock('@/components/ui/alert-dialog', () => ({
	AlertDialog: ({ open, children }: any) =>
		open ? <div data-testid="alert-dialog">{children}</div> : null,
	AlertDialogContent: ({ children }: any) => <div>{children}</div>,
	AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
	AlertDialogTitle: ({ children }: any) => <h4>{children}</h4>,
	AlertDialogDescription: ({ children }: any) => <p>{children}</p>,
	AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
	AlertDialogCancel: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
	AlertDialogAction: ({ children, onClick, className }: any) => (
		<button onClick={onClick} className={className}>
			{children}
		</button>
	),
}));

jest.mock('@/components/business/clock-in/load-more-attendance-modal', () => ({
	LoadMoreAttendanceModal: () => <div data-testid="load-more-modal" />,
}));

jest.mock('@/components/business/clock-in/attendance-entry-modal', () => ({
	AttendanceEntryModal: () => <div data-testid="entry-modal" />,
}));

jest.mock('@/utils/format-date', () => ({
	formatCreatedAt: (d: string) => d || 'N/A',
	getLocalDate: () => '2026-08-21',
}));

jest.mock('lucide-react', () => ({
	Pencil: () => <span>edit-icon</span>,
	Trash2: () => <span>delete-icon</span>,
	AlertTriangle: () => <span>warning-icon</span>,
}));

beforeEach(() => {
	(getAttendanceEntriesForMonth as jest.Mock).mockReset();
	(deleteAttendanceEntry as jest.Mock).mockReset();
	(toast as jest.Mock).mockReset();
});

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
		user_name: 'Juan Pérez',
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
		user_name: 'Juan Pérez',
	},
];

describe('AdminAttendanceHistory', () => {
	it('show button "Ver historial de empleados"', () => {
		render(<AdminAttendanceHistory />);
		expect(screen.getByText('Ver historial de empleados')).toBeInTheDocument();
	});

	it('type="button" to "Ver historial de empleados"', () => {
		render(<AdminAttendanceHistory />);
		expect(screen.getByText('Ver historial de empleados')).toHaveAttribute('type', 'button');
	});

	it('shows spinner and "Cargando historial..." when expanding', async () => {
		(getAttendanceEntriesForMonth as jest.Mock).mockReturnValue(new Promise(() => {}));
		render(<AdminAttendanceHistory />);
		fireEvent.click(screen.getByText('Ver historial de empleados'));
		expect(screen.getByText('Cargando historial...')).toBeInTheDocument();
		expect(screen.getByTestId('spinner')).toBeInTheDocument();
	});

	it('shows user summary after loading', async () => {
		(getAttendanceEntriesForMonth as jest.Mock).mockResolvedValue({
			data: sampleEntries,
			error: null,
		});
		render(<AdminAttendanceHistory />);
		fireEvent.click(screen.getByText('Ver historial de empleados'));
		await waitFor(() => {
			expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
		});
	});

	it('shows worked hours in the summary', async () => {
		(getAttendanceEntriesForMonth as jest.Mock).mockResolvedValue({
			data: sampleEntries,
			error: null,
		});
		render(<AdminAttendanceHistory />);
		fireEvent.click(screen.getByText('Ver historial de empleados'));
		await waitFor(() => {
			expect(screen.getByText('8h')).toBeInTheDocument();
		});
	});

	it('shows error and Retry button when load fails', async () => {
		(getAttendanceEntriesForMonth as jest.Mock).mockResolvedValue({
			data: null,
			error: { message: 'DB error' },
		});
		render(<AdminAttendanceHistory />);
		fireEvent.click(screen.getByText('Ver historial de empleados'));
		await waitFor(() => {
			expect(screen.getByText('DB error')).toBeInTheDocument();
			expect(screen.getByText('Reintentar')).toBeInTheDocument();
		});
	});

	it('Retry calls loadHistory again', async () => {
		(getAttendanceEntriesForMonth as jest.Mock)
			.mockResolvedValueOnce({ data: null, error: { message: 'fail' } })
			.mockResolvedValueOnce({ data: sampleEntries, error: null });
		render(<AdminAttendanceHistory />);
		fireEvent.click(screen.getByText('Ver historial de empleados'));
		await waitFor(() => {
			expect(screen.getByText('Reintentar')).toBeInTheDocument();
		});
		fireEvent.click(screen.getByText('Reintentar'));
		await waitFor(() => {
			expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
		});
	});

	it('expanding user shows individual entries', async () => {
		(getAttendanceEntriesForMonth as jest.Mock).mockResolvedValue({
			data: sampleEntries,
			error: null,
		});
		render(<AdminAttendanceHistory />);
		fireEvent.click(screen.getByText('Ver historial de empleados'));
		await waitFor(() => {
			expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
		});
		fireEvent.click(screen.getByText('Juan Pérez'));
		await waitFor(() => {
			expect(screen.getAllByText('Entrada').length).toBeGreaterThanOrEqual(1);
		});
	});

	it('shows edit and delete buttons on entries', async () => {
		(getAttendanceEntriesForMonth as jest.Mock).mockResolvedValue({
			data: sampleEntries,
			error: null,
		});
		render(<AdminAttendanceHistory />);
		fireEvent.click(screen.getByText('Ver historial de empleados'));
		await waitFor(() => {
			expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
		});
		fireEvent.click(screen.getByText('Juan Pérez'));
		await waitFor(() => {
			expect(screen.getAllByText('edit-icon').length).toBeGreaterThanOrEqual(1);
			expect(screen.getAllByText('delete-icon').length).toBeGreaterThanOrEqual(1);
		});
	});

	it('clicking delete opens confirmation dialog', async () => {
		(getAttendanceEntriesForMonth as jest.Mock).mockResolvedValue({
			data: sampleEntries,
			error: null,
		});
		render(<AdminAttendanceHistory />);
		fireEvent.click(screen.getByText('Ver historial de empleados'));
		await waitFor(() => {
			expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
		});
		fireEvent.click(screen.getByText('Juan Pérez'));
		await waitFor(() => {
			expect(screen.getAllByText('delete-icon').length).toBeGreaterThanOrEqual(1);
		});
		const deleteButtons = screen.getAllByText('delete-icon');
		fireEvent.click(deleteButtons[0]);
		await waitFor(() => {
			expect(screen.getByText('¿Eliminar registro?')).toBeInTheDocument();
		});
	});

	it('confirmation dialog shows entry type', async () => {
		(getAttendanceEntriesForMonth as jest.Mock).mockResolvedValue({
			data: sampleEntries,
			error: null,
		});
		render(<AdminAttendanceHistory />);
		fireEvent.click(screen.getByText('Ver historial de empleados'));
		await waitFor(() => {
			expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
		});
		fireEvent.click(screen.getByText('Juan Pérez'));
		await waitFor(() => {
			expect(screen.getAllByText('delete-icon').length).toBeGreaterThanOrEqual(1);
		});
		const deleteButtons = screen.getAllByText('delete-icon');
		fireEvent.click(deleteButtons[0]);
		await waitFor(() => {
			expect(screen.getByTestId('alert-dialog')).toBeInTheDocument();
			const dialog = screen.getByTestId('alert-dialog');
			expect(dialog.querySelector('.font-medium')).toBeTruthy();
		});
	});

	it('confirming deletion calls deleteAttendanceEntry and shows toast', async () => {
		(getAttendanceEntriesForMonth as jest.Mock).mockResolvedValue({
			data: sampleEntries,
			error: null,
		});
		(deleteAttendanceEntry as jest.Mock).mockResolvedValue({ error: null });
		render(<AdminAttendanceHistory />);
		fireEvent.click(screen.getByText('Ver historial de empleados'));
		await waitFor(() => {
			expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
		});
		fireEvent.click(screen.getByText('Juan Pérez'));
		await waitFor(() => {
			expect(screen.getAllByText('delete-icon').length).toBeGreaterThanOrEqual(1);
		});
		const deleteButtons = screen.getAllByText('delete-icon');
		fireEvent.click(deleteButtons[0]);
		await waitFor(() => {
			expect(screen.getByText('¿Eliminar registro?')).toBeInTheDocument();
		});
		await act(async () => {
			fireEvent.click(screen.getByText('Eliminar'));
		});
		expect(deleteAttendanceEntry).toHaveBeenCalledWith(1);
		expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Registro eliminado' }));
	});

	it('type="button" on all buttons', async () => {
		(getAttendanceEntriesForMonth as jest.Mock).mockResolvedValue({
			data: sampleEntries,
			error: null,
		});
		render(<AdminAttendanceHistory />);
		fireEvent.click(screen.getByText('Ver historial de empleados'));
		await waitFor(() => {
			expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
		});
		const buttons = screen.getAllByRole('button');
		buttons.forEach((btn) => {
			expect(btn).toHaveAttribute('type', 'button');
		});
	});

	it('shows "Fecha" label on date input when Mes actual is active', async () => {
		(getAttendanceEntriesForMonth as jest.Mock).mockResolvedValue({
			data: sampleEntries,
			error: null,
		});
		render(<AdminAttendanceHistory />);
		fireEvent.click(screen.getByText('Ver historial de empleados'));
		await waitFor(() => {
			expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
		});
		fireEvent.click(screen.getByText('Mes actual'));
		expect(screen.getByText('Filtrar por fecha')).toBeInTheDocument();
	});

	it('toggle Hide hides the history', async () => {
		(getAttendanceEntriesForMonth as jest.Mock).mockResolvedValue({
			data: sampleEntries,
			error: null,
		});
		render(<AdminAttendanceHistory />);
		fireEvent.click(screen.getByText('Ver historial de empleados'));
		await waitFor(() => {
			expect(screen.getByText('Historial de Empleados')).toBeInTheDocument();
		});
		fireEvent.click(screen.getByText('Ocultar'));
		expect(screen.getByText('Ver historial de empleados')).toBeInTheDocument();
	});

	it('exposes loadHistory via ref', async () => {
		const ref = createRef<any>();
		(getAttendanceEntriesForMonth as jest.Mock).mockResolvedValue({
			data: sampleEntries,
			error: null,
		});
		render(<AdminAttendanceHistory ref={ref} />);
		await act(async () => {
			ref.current.loadHistory();
		});
		await waitFor(() => {
			expect(getAttendanceEntriesForMonth).toHaveBeenCalled();
		});
	});

	it('shows "No hay registros" when summaries is empty', async () => {
		(getAttendanceEntriesForMonth as jest.Mock).mockResolvedValue({
			data: [],
			error: null,
		});
		render(<AdminAttendanceHistory />);
		fireEvent.click(screen.getByText('Ver historial de empleados'));
		await waitFor(() => {
			expect(screen.getByText(/No hay registros de asistencia/)).toBeInTheDocument();
		});
	});
});
