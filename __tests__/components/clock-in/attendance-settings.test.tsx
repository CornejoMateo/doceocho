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

	it('no renderiza cuando está cerrado', () => {
		render(<AttendanceSettings open={false} onOpenChange={mockOnOpenChange} />);
		expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
	});

	it('renderiza cuando está abierto', () => {
		(getAttendanceSettings as jest.Mock).mockResolvedValue({ data: null, error: null });
		render(<AttendanceSettings open={true} onOpenChange={mockOnOpenChange} />);
		expect(screen.getByTestId('dialog')).toBeInTheDocument();
		expect(screen.getByText('Configuración de Asistencia')).toBeInTheDocument();
	});

	it('muestra spinner mientras carga la configuración', () => {
		(getAttendanceSettings as jest.Mock).mockReturnValue(new Promise(() => {}));
		render(<AttendanceSettings open={true} onOpenChange={mockOnOpenChange} />);
		expect(screen.getByTestId('spinner')).toBeInTheDocument();
	});

	it('oculta spinner y muestra formulario después de cargar', async () => {
		(getAttendanceSettings as jest.Mock).mockResolvedValue({ data: null, error: null });
		render(<AttendanceSettings open={true} onOpenChange={mockOnOpenChange} />);
		await waitFor(() => {
			expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
		});
		expect(screen.getByText('Radio de Ubicación')).toBeInTheDocument();
		expect(screen.getByText('Precios por Hora')).toBeInTheDocument();
		expect(screen.getByText('Ubicación Objetivo')).toBeInTheDocument();
	});

	it('carga valores de la DB en los inputs', async () => {
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
		expect(screen.getByLabelText('Precio por hora normal')).toHaveValue(1500);
		expect(screen.getByLabelText('Precio por hora extra')).toHaveValue(2000);
		expect(screen.getByLabelText('Latitud')).toHaveValue(-33);
		expect(screen.getByLabelText('Longitud')).toHaveValue(-64);
	});

	it('usa valores por defecto cuando la DB no tiene datos', async () => {
		(getAttendanceSettings as jest.Mock).mockResolvedValue({ data: null, error: null });
		render(<AttendanceSettings open={true} onOpenChange={mockOnOpenChange} />);
		await waitFor(() => {
			expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
		});
		expect(screen.getByLabelText(/Radio en metros/)).toHaveValue(50);
	});

	it('muestra botón Guardar', async () => {
		(getAttendanceSettings as jest.Mock).mockResolvedValue({ data: null, error: null });
		render(<AttendanceSettings open={true} onOpenChange={mockOnOpenChange} />);
		await waitFor(() => {
			expect(screen.getByText('Guardar')).toBeInTheDocument();
		});
	});

	it('guarda correctamente con valores válidos', async () => {
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

	it('muestra toast de éxito al guardar', async () => {
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

	it('cierra el dialog después de guardar exitosamente', async () => {
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

	it('muestra toast de error cuando updateAttendanceSettings falla', async () => {
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

	it('muestra "Guardando..." mientras guarda', async () => {
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

	it('valida radio mínimo', async () => {
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

	it('no llama a updateAttendanceSettings si la validación falla', async () => {
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
