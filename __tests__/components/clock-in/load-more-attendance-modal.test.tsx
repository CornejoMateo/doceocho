import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoadMoreAttendanceModal } from '@/components/business/clock-in/load-more-attendance-modal';
import {
	getUserAttendanceEntriesForMonth,
	getAttendanceEntriesForMonth,
} from '@/lib/attendance/attendance-entries';

jest.mock('@/lib/attendance/attendance-entries', () => ({
	getUserAttendanceEntriesForMonth: jest.fn(),
	getAttendanceEntriesForMonth: jest.fn(),
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

jest.mock('@/lib/error-translator', () => ({
	translateError: (e: any) => e?.message || 'Error desconocido',
}));

jest.mock('@/components/ui/spinner', () => ({
	Spinner: (props: any) => <div data-testid="spinner" {...props} />,
}));

jest.mock('@/components/ui/dialog', () => ({
	Dialog: ({ open, children }: any) => (open ? <div data-testid="dialog">{children}</div> : null),
	DialogContent: ({ children, className }: any) => (
		<div data-testid="dialog-content" className={className}>
			{children}
		</div>
	),
	DialogHeader: ({ children }: any) => <div>{children}</div>,
	DialogTitle: ({ children }: any) => <h2>{children}</h2>,
	DialogDescription: ({ children }: any) => <p>{children}</p>,
	DialogFooter: ({ children }: any) => <div data-testid="dialog-footer">{children}</div>,
}));

jest.mock('@/components/ui/select', () => ({
	Select: ({ children, value, onValueChange }: any) => (
		<select
			data-testid="select-native"
			value={value}
			onChange={(e) => onValueChange?.(e.target.value)}
		>
			{children}
		</select>
	),
	SelectTrigger: ({ children, id }: any) => <span data-testid={id}>{children}</span>,
	SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
	SelectContent: ({ children }: any) => <>{children}</>,
	SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
}));

jest.mock('@/components/ui/button', () => ({
	Button: ({ children, onClick, disabled, variant, type, ...props }: any) => (
		<button onClick={onClick} disabled={disabled} data-variant={variant} type={type} {...props}>
			{children}
		</button>
	),
}));

jest.mock('@/components/ui/label', () => ({
	Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>,
}));

jest.mock('@/utils/format-date', () => ({
	formatCreatedAt: (d: string) => d || 'N/A',
	getLocalDate: () => '2026-08-21',
}));

jest.mock('lucide-react', () => ({
	AlertTriangle: () => <span>warning-icon</span>,
	ChevronDown: ({ className }: any) => (
		<span data-testid="chevron" className={className}>
			chevron
		</span>
	),
}));

beforeEach(() => {
	(getUserAttendanceEntriesForMonth as jest.Mock).mockReset();
	(getAttendanceEntriesForMonth as jest.Mock).mockReset();
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

describe('LoadMoreAttendanceModal', () => {
	const defaultProps = {
		open: true,
		onOpenChange: jest.fn(),
		users: [],
		user: null,
	};

	it('does not render when closed', () => {
		render(<LoadMoreAttendanceModal {...defaultProps} open={false} />);
		expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
	});

	it('renders when open', () => {
		render(<LoadMoreAttendanceModal {...defaultProps} />);
		expect(screen.getByTestId('dialog')).toBeInTheDocument();
		expect(screen.getByText('Cargar más fichajes')).toBeInTheDocument();
	});

	it('shows year and month selects', () => {
		render(<LoadMoreAttendanceModal {...defaultProps} />);
		expect(screen.getByText('Año')).toBeInTheDocument();
		expect(screen.getByText('Mes')).toBeInTheDocument();
	});

	it('shows user select in admin mode', () => {
		render(<LoadMoreAttendanceModal {...defaultProps} />);
		expect(screen.getByText('Usuario')).toBeInTheDocument();
	});

	it('hides user select in user mode', () => {
		render(<LoadMoreAttendanceModal {...defaultProps} user={{ uid: 'user-1' } as any} />);
		expect(screen.queryByText('Usuario')).not.toBeInTheDocument();
	});

	it('"Cerrar" button has type="button"', () => {
		render(<LoadMoreAttendanceModal {...defaultProps} />);
		const closeBtn = screen.getByText('Cerrar');
		expect(closeBtn).toHaveAttribute('type', 'button');
	});

	it('"Cargar" button (not "Aceptar") has type="button"', () => {
		render(<LoadMoreAttendanceModal {...defaultProps} />);
		const loadBtn = screen.getByText('Cargar');
		expect(loadBtn).toHaveAttribute('type', 'button');
		expect(screen.queryByText('Aceptar')).not.toBeInTheDocument();
	});

	it('clicking Cargar shows spinner while loading', async () => {
		(getUserAttendanceEntriesForMonth as jest.Mock).mockReturnValue(new Promise(() => {}));
		render(<LoadMoreAttendanceModal {...defaultProps} user={{ uid: 'user-1' } as any} />);
		fireEvent.click(screen.getByText('Cargar'));
		expect(screen.getByTestId('spinner')).toBeInTheDocument();
	});

	it('shows results after successful load', async () => {
		(getUserAttendanceEntriesForMonth as jest.Mock).mockResolvedValue({
			data: sampleEntries,
			error: null,
		});
		render(<LoadMoreAttendanceModal {...defaultProps} user={{ uid: 'user-1' } as any} />);
		fireEvent.click(screen.getByText('Cargar'));
		await waitFor(() => {
			expect(screen.getByText('Mis registros')).toBeInTheDocument();
		});
		expect(screen.getByText('8h')).toBeInTheDocument();
	});

	it('shows error and Retry button when load fails', async () => {
		(getUserAttendanceEntriesForMonth as jest.Mock).mockResolvedValue({
			data: null,
			error: { message: 'DB error' },
		});
		render(<LoadMoreAttendanceModal {...defaultProps} user={{ uid: 'user-1' } as any} />);
		fireEvent.click(screen.getByText('Cargar'));
		await waitFor(() => {
			expect(screen.getByText('DB error')).toBeInTheDocument();
			expect(screen.getByText('Reintentar')).toBeInTheDocument();
		});
	});

	it('shows "No hay registros" when results are empty', async () => {
		(getUserAttendanceEntriesForMonth as jest.Mock).mockResolvedValue({
			data: [],
			error: null,
		});
		render(<LoadMoreAttendanceModal {...defaultProps} user={{ uid: 'user-1' } as any} />);
		fireEvent.click(screen.getByText('Cargar'));
		await waitFor(() => {
			expect(screen.getByText(/No hay registros de asistencia/)).toBeInTheDocument();
		});
	});

	it('chevron rotates when expanding', async () => {
		(getUserAttendanceEntriesForMonth as jest.Mock).mockResolvedValue({
			data: sampleEntries,
			error: null,
		});
		render(<LoadMoreAttendanceModal {...defaultProps} user={{ uid: 'user-1' } as any} />);
		fireEvent.click(screen.getByText('Cargar'));
		await waitFor(() => {
			expect(screen.getByText('Mis registros')).toBeInTheDocument();
		});
		const chevrons = screen.getAllByTestId('chevron');
		expect(chevrons.length).toBeGreaterThanOrEqual(1);
		fireEvent.click(screen.getByText('Mis registros'));
		await waitFor(() => {
			const expandedChevron = screen.getAllByTestId('chevron')[0];
			expect(expandedChevron.className).toContain('rotate-180');
		});
	});

	it('expanding shows individual entries', async () => {
		(getUserAttendanceEntriesForMonth as jest.Mock).mockResolvedValue({
			data: sampleEntries,
			error: null,
		});
		render(<LoadMoreAttendanceModal {...defaultProps} user={{ uid: 'user-1' } as any} />);
		fireEvent.click(screen.getByText('Cargar'));
		await waitFor(() => {
			expect(screen.getByText('Mis registros')).toBeInTheDocument();
		});
		fireEvent.click(screen.getByText('Mis registros'));
		await waitFor(() => {
			expect(screen.getByText('Entrada')).toBeInTheDocument();
			expect(screen.getByText('Salida')).toBeInTheDocument();
		});
	});

	it('admin mode loads data for all users', async () => {
		(getAttendanceEntriesForMonth as jest.Mock).mockResolvedValue({
			data: sampleEntries,
			error: null,
		});
		render(<LoadMoreAttendanceModal {...defaultProps} />);
		fireEvent.click(screen.getByText('Cargar'));
		await waitFor(() => {
			expect(getAttendanceEntriesForMonth).toHaveBeenCalled();
		});
	});

	it('type="button" on all footer buttons', () => {
		render(<LoadMoreAttendanceModal {...defaultProps} />);
		const footer = screen.getByTestId('dialog-footer');
		const buttons = footer.querySelectorAll('button');
		buttons.forEach((btn) => {
			expect(btn).toHaveAttribute('type', 'button');
		});
	});

	it('closing modal calls onOpenChange with false', () => {
		const onOpenChange = jest.fn();
		render(<LoadMoreAttendanceModal {...defaultProps} onOpenChange={onOpenChange} />);
		fireEvent.click(screen.getByText('Cerrar'));
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it('Retry reloads data', async () => {
		(getUserAttendanceEntriesForMonth as jest.Mock)
			.mockResolvedValueOnce({ data: null, error: { message: 'fail' } })
			.mockResolvedValueOnce({ data: sampleEntries, error: null });
		render(<LoadMoreAttendanceModal {...defaultProps} user={{ uid: 'user-1' } as any} />);
		fireEvent.click(screen.getByText('Cargar'));
		await waitFor(() => {
			expect(screen.getByText('Reintentar')).toBeInTheDocument();
		});
		fireEvent.click(screen.getByText('Reintentar'));
		await waitFor(() => {
			expect(screen.getByText('Mis registros')).toBeInTheDocument();
		});
	});

	it('shows year and month in selects', () => {
		render(<LoadMoreAttendanceModal {...defaultProps} />);
		expect(screen.getByText('2026')).toBeInTheDocument();
	});
});
