import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AttendanceSettings } from '@/components/business/clock-in/attendance-settings';
import {
	getAttendanceSettings,
	updateAttendanceSettings,
} from '@/lib/attendance/attendance-settings';
import { toast } from '@/components/ui/use-toast';

jest.mock('@/lib/attendance/attendance-settings', () => ({
	getAttendanceSettings: jest.fn(),
	updateAttendanceSettings: jest.fn(),
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

jest.mock('@/components/ui/label', () => ({
	Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>,
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
	DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/card', () => ({
	Card: ({ children, ...props }: any) => (
		<div data-testid="card" {...props}>
			{children}
		</div>
	),
	CardHeader: ({ children }: any) => <div>{children}</div>,
	CardTitle: ({ children }: any) => <h3>{children}</h3>,
	CardDescription: ({ children }: any) => <p>{children}</p>,
	CardContent: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/business/clock-in/coordinates-help-dialog', () => ({
	CoordinatesHelpDialog: () => <div data-testid="coordinates-help-dialog" />,
}));

jest.mock('lucide-react', () => ({
	HelpCircleIcon: () => <span>?</span>,
}));

beforeEach(() => {
	(getAttendanceSettings as jest.Mock).mockReset();
	(updateAttendanceSettings as jest.Mock).mockReset();
	(toast as jest.Mock).mockReset();
});

describe('AttendanceSettings', () => {
	const mockOnOpenChange = jest.fn();

	it('does not render when closed', () => {
		render(<AttendanceSettings open={false} onOpenChange={mockOnOpenChange} />);
		expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
	});

	it('renders when open', () => {
		(getAttendanceSettings as jest.Mock).mockResolvedValue({ data: null, error: null });
		render(<AttendanceSettings open={true} onOpenChange={mockOnOpenChange} />);
		expect(screen.getByTestId('dialog')).toBeInTheDocument();
		expect(screen.getByText('Configuración de Asistencia')).toBeInTheDocument();
	});

	it('shows spinner while loading settings', () => {
		(getAttendanceSettings as jest.Mock).mockReturnValue(new Promise(() => {}));
		render(<AttendanceSettings open={true} onOpenChange={mockOnOpenChange} />);
		expect(screen.getByTestId('spinner')).toBeInTheDocument();
	});

	it('hides spinner and shows form after loading', async () => {
		(getAttendanceSettings as jest.Mock).mockResolvedValue({ data: null, error: null });
		render(<AttendanceSettings open={true} onOpenChange={mockOnOpenChange} />);
		await waitFor(() => {
			expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
		});
		expect(screen.getByText('Radio de Ubicación')).toBeInTheDocument();
		expect(screen.getByText('Precios por Hora')).toBeInTheDocument();
		expect(screen.getByText('Ubicación Objetivo')).toBeInTheDocument();
	});

	it('loads values from the database into the inputs', async () => {
		(getAttendanceSettings as jest.Mock).mockResolvedValue({
			data: {
				square_meters: 100,
				price_hour: 1500,
				price_hour_overtime: 2000,
				target_latitude: -33.0,
				target_longitude: -64.0,
			},
			error: null,
		});
		render(<AttendanceSettings open={true} onOpenChange={mockOnOpenChange} />);
		await waitFor(() => {
			expect(screen.getByLabelText(/Radio en metros/)).toHaveValue(100);
		});
		expect(screen.getByLabelText('Precio por hora normal')).toHaveValue('1.500');
		expect(screen.getByLabelText('Precio por hora extra')).toHaveValue('2.000');
		expect(screen.getByLabelText('Latitud')).toHaveValue(-33);
		expect(screen.getByLabelText('Longitud')).toHaveValue(-64);
	});

	it('uses default values when the DB has no data', async () => {
		(getAttendanceSettings as jest.Mock).mockResolvedValue({ data: null, error: null });
		render(<AttendanceSettings open={true} onOpenChange={mockOnOpenChange} />);
		await waitFor(() => {
			expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
		});
		expect(screen.getByLabelText(/Radio en metros/)).toHaveValue(50);
	});

	it('shows "Guardar" button', async () => {
		(getAttendanceSettings as jest.Mock).mockResolvedValue({ data: null, error: null });
		render(<AttendanceSettings open={true} onOpenChange={mockOnOpenChange} />);
		await waitFor(() => {
			expect(screen.getByText('Guardar')).toBeInTheDocument();
		});
	});

	it('saves correctly with valid values', async () => {
		(getAttendanceSettings as jest.Mock).mockResolvedValue({ data: null, error: null });
		(updateAttendanceSettings as jest.Mock).mockResolvedValue({ data: {}, error: null });
		render(<AttendanceSettings open={true} onOpenChange={mockOnOpenChange} />);
		await waitFor(() => {
			expect(screen.getByText('Guardar')).toBeInTheDocument();
		});

		fireEvent.click(screen.getByText('Guardar'));

		await waitFor(() => {
			expect(updateAttendanceSettings).toHaveBeenCalledWith({
				square_meters: 50,
				price_hour: 0,
				price_hour_overtime: 0,
				target_latitude: expect.any(Number),
				target_longitude: expect.any(Number),
			});
		});
	});

	it('shows success toast when saving successfully', async () => {
		(getAttendanceSettings as jest.Mock).mockResolvedValue({ data: null, error: null });
		(updateAttendanceSettings as jest.Mock).mockResolvedValue({ data: {}, error: null });
		render(<AttendanceSettings open={true} onOpenChange={mockOnOpenChange} />);
		await waitFor(() => {
			expect(screen.getByText('Guardar')).toBeInTheDocument();
		});

		fireEvent.click(screen.getByText('Guardar'));

		await waitFor(() => {
			expect(toast).toHaveBeenCalledWith(
				expect.objectContaining({
					title: 'Configuración guardada',
				})
			);
		});
	});

	it('closes the dialog after saving successfully', async () => {
		(getAttendanceSettings as jest.Mock).mockResolvedValue({ data: null, error: null });
		(updateAttendanceSettings as jest.Mock).mockResolvedValue({ data: {}, error: null });
		render(<AttendanceSettings open={true} onOpenChange={mockOnOpenChange} />);
		await waitFor(() => {
			expect(screen.getByText('Guardar')).toBeInTheDocument();
		});

		fireEvent.click(screen.getByText('Guardar'));

		await waitFor(() => {
			expect(mockOnOpenChange).toHaveBeenCalledWith(false);
		});
	});

	it('shows error toast when updateAttendanceSettings fails', async () => {
		(getAttendanceSettings as jest.Mock).mockResolvedValue({ data: null, error: null });
		(updateAttendanceSettings as jest.Mock).mockResolvedValue({
			data: null,
			error: { message: 'DB error' },
		});
		render(<AttendanceSettings open={true} onOpenChange={mockOnOpenChange} />);
		await waitFor(() => {
			expect(screen.getByText('Guardar')).toBeInTheDocument();
		});

		fireEvent.click(screen.getByText('Guardar'));

		await waitFor(() => {
			expect(toast).toHaveBeenCalledWith(
				expect.objectContaining({
					variant: 'destructive',
				})
			);
		});
	});

	it('shows "Guardando..." while saving', async () => {
		(getAttendanceSettings as jest.Mock).mockResolvedValue({ data: null, error: null });
		(updateAttendanceSettings as jest.Mock).mockReturnValue(new Promise(() => {}));
		render(<AttendanceSettings open={true} onOpenChange={mockOnOpenChange} />);
		await waitFor(() => {
			expect(screen.getByText('Guardar')).toBeInTheDocument();
		});

		fireEvent.click(screen.getByText('Guardar'));

		await waitFor(() => {
			expect(screen.getByText('Guardando...')).toBeInTheDocument();
		});
	});

	it('validates minimum radio', async () => {
		(getAttendanceSettings as jest.Mock).mockResolvedValue({ data: null, error: null });
		render(<AttendanceSettings open={true} onOpenChange={mockOnOpenChange} />);
		await waitFor(() => {
			expect(screen.getByLabelText(/Radio en metros/)).toBeInTheDocument();
		});

		fireEvent.change(screen.getByLabelText(/Radio en metros/), {
			target: { value: '10' },
		});
		fireEvent.click(screen.getByText('Guardar'));

		await waitFor(() => {
			expect(toast).toHaveBeenCalledWith(
				expect.objectContaining({
					variant: 'destructive',
					description: expect.stringContaining('al menos'),
				})
			);
		});
	});

	it('does not call updateAttendanceSettings if validation fails', async () => {
		(getAttendanceSettings as jest.Mock).mockResolvedValue({ data: null, error: null });
		render(<AttendanceSettings open={true} onOpenChange={mockOnOpenChange} />);
		await waitFor(() => {
			expect(screen.getByLabelText(/Radio en metros/)).toBeInTheDocument();
		});

		fireEvent.change(screen.getByLabelText(/Radio en metros/), {
			target: { value: '5' },
		});
		fireEvent.click(screen.getByText('Guardar'));

		await waitFor(() => {
			expect(toast).toHaveBeenCalled();
		});
		expect(updateAttendanceSettings).not.toHaveBeenCalled();
	});
});
