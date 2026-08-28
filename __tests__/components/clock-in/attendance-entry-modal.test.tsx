import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AttendanceEntryModal } from '@/components/business/clock-in/attendance-entry-modal';
import {
	createAdminAttendanceEntry,
	updateAttendanceEntry,
	AttendanceEntryWithDate,
} from '@/lib/attendance/attendance-entries';
import { toast } from '@/components/ui/use-toast';

jest.mock('@/lib/attendance/attendance-entries', () => ({
	createAdminAttendanceEntry: jest.fn(),
	updateAttendanceEntry: jest.fn(),
}));

jest.mock('@/components/ui/use-toast', () => ({
	toast: jest.fn(),
}));

jest.mock('@/lib/error-translator', () => ({
	translateError: (e: any) => e?.message || 'Error desconocido',
}));

jest.mock('@/utils/format-date', () => ({
	formatCreatedAt: (d: string) => d || 'N/A',
	getLocalDate: () => '2026-08-21',
}));

jest.mock('@/components/ui/label', () => ({
	Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>,
}));

jest.mock('@/components/ui/dialog', () => ({
	Dialog: ({ open, onOpenChange, children }: any) =>
		open ? (
			<div data-testid="dialog" data-onopenchange={onOpenChange}>
				{children}
			</div>
		) : null,
	DialogContent: ({ children, className, showCloseButton }: any) => (
		<div data-testid="dialog-content" data-show-close={showCloseButton} className={className}>
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
	Button: ({ children, onClick, disabled, variant, ...props }: any) => (
		<button onClick={onClick} disabled={disabled} data-variant={variant} {...props}>
			{children}
		</button>
	),
}));

beforeEach(() => {
	(createAdminAttendanceEntry as jest.Mock).mockReset();
	(updateAttendanceEntry as jest.Mock).mockReset();
	(toast as jest.Mock).mockReset();
});

const mockEntry: AttendanceEntryWithDate = {
	id: 1,
	attendance_id: 10,
	type: 'regular_in',
	entry_time: '2026-08-21T14:30:00.000Z',
	latitude: 0,
	longitude: 0,
	description: 'Test entry',
	attendance_date: '2026-08-21',
	user_id: 'user-1',
	user_name: 'Juan Pérez',
};

const mockUsers = [
	{
		id: 1,
		uid_user: 'user-1',
		username: 'juan',
		name: 'Juan',
		last_name: 'Pérez',
		role: 'Taller' as const,
	},
	{
		id: 2,
		uid_user: 'user-2',
		username: 'admin',
		name: 'Admin',
		last_name: 'User',
		role: 'Admin' as const,
	},
];

describe('AttendanceEntryModal', () => {
	const mockOnOpenChange = jest.fn();
	const mockOnUpdate = jest.fn();

	beforeEach(() => {
		mockOnOpenChange.mockReset();
		mockOnUpdate.mockReset();
	});

	describe('Creation mode', () => {
		it('does not render when closed', () => {
			render(
				<AttendanceEntryModal
					entry={null}
					open={false}
					onOpenChange={mockOnOpenChange}
					onUpdate={mockOnUpdate}
				/>
			);
			expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
		});

		it('renders in creation mode', () => {
			render(
				<AttendanceEntryModal
					entry={null}
					userId="user-1"
					open={true}
					onOpenChange={mockOnOpenChange}
					onUpdate={mockOnUpdate}
				/>
			);
			expect(screen.getByText('Crear Registro de Asistencia')).toBeInTheDocument();
			expect(screen.getByText('Crear')).toBeInTheDocument();
		});

		it('shows employee name when provided', () => {
			render(
				<AttendanceEntryModal
					entry={null}
					userId="user-1"
					userName="Juan Pérez"
					open={true}
					onOpenChange={mockOnOpenChange}
					onUpdate={mockOnUpdate}
				/>
			);
			expect(screen.getByText('Empleado: Juan Pérez')).toBeInTheDocument();
		});

		it('shows employee select when showUserSelect is true', () => {
			render(
				<AttendanceEntryModal
					entry={null}
					open={true}
					onOpenChange={mockOnOpenChange}
					onUpdate={mockOnUpdate}
					showUserSelect={true}
					users={mockUsers}
				/>
			);
			expect(screen.getByText('Empleado')).toBeInTheDocument();
		});

		it('filters only users with role Taller in the select', () => {
			render(
				<AttendanceEntryModal
					entry={null}
					open={true}
					onOpenChange={mockOnOpenChange}
					onUpdate={mockOnUpdate}
					showUserSelect={true}
					users={mockUsers}
				/>
			);
			expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
			expect(screen.queryByText('Admin User')).not.toBeInTheDocument();
		});

		it('shows error toast if no employee is selected in admin mode', async () => {
			render(
				<AttendanceEntryModal
					entry={null}
					open={true}
					onOpenChange={mockOnOpenChange}
					onUpdate={mockOnUpdate}
					showUserSelect={true}
					users={mockUsers}
				/>
			);
			fireEvent.click(screen.getByText('Crear'));
			await waitFor(() => {
				expect(toast).toHaveBeenCalledWith(
					expect.objectContaining({
						title: 'Error',
						description: 'Debes seleccionar un empleado',
						variant: 'destructive',
					})
				);
			});
		});

		it('validates time format', async () => {
			render(
				<AttendanceEntryModal
					entry={null}
					userId="user-1"
					open={true}
					onOpenChange={mockOnOpenChange}
					onUpdate={mockOnUpdate}
				/>
			);
			const timeInput = screen.getByLabelText('Hora');
			fireEvent.change(timeInput, { target: { value: 'invalid' } });
			fireEvent.click(screen.getByText('Crear'));
			await waitFor(() => {
				expect(toast).toHaveBeenCalledWith(
					expect.objectContaining({
						title: 'Error de validación',
						description: 'La hora debe tener formato HH:MM',
						variant: 'destructive',
					})
				);
			});
		});

		it('creates the attendance entry correctly', async () => {
			(createAdminAttendanceEntry as jest.Mock).mockResolvedValue({ data: {}, error: null });
			render(
				<AttendanceEntryModal
					entry={null}
					userId="user-1"
					open={true}
					onOpenChange={mockOnOpenChange}
					onUpdate={mockOnUpdate}
				/>
			);
			fireEvent.click(screen.getByText('Crear'));
			await waitFor(() => {
				expect(createAdminAttendanceEntry).toHaveBeenCalledWith(
					'user-1',
					expect.any(String),
					expect.any(String),
					null
				);
			});
		});

		it('shows success toast when creating an entry', async () => {
			(createAdminAttendanceEntry as jest.Mock).mockResolvedValue({ data: {}, error: null });
			render(
				<AttendanceEntryModal
					entry={null}
					userId="user-1"
					open={true}
					onOpenChange={mockOnOpenChange}
					onUpdate={mockOnUpdate}
				/>
			);
			fireEvent.click(screen.getByText('Crear'));
			await waitFor(() => {
				expect(toast).toHaveBeenCalledWith(
					expect.objectContaining({
						title: 'Registro creado',
					})
				);
			});
		});

		it('closes the modal and calls onUpdate after creating', async () => {
			(createAdminAttendanceEntry as jest.Mock).mockResolvedValue({ data: {}, error: null });
			render(
				<AttendanceEntryModal
					entry={null}
					userId="user-1"
					open={true}
					onOpenChange={mockOnOpenChange}
					onUpdate={mockOnUpdate}
				/>
			);
			fireEvent.click(screen.getByText('Crear'));
			await waitFor(() => {
				expect(mockOnOpenChange).toHaveBeenCalledWith(false);
				expect(mockOnUpdate).toHaveBeenCalled();
			});
		});

		it('shows error toast when createAdminAttendanceEntry fails', async () => {
			(createAdminAttendanceEntry as jest.Mock).mockResolvedValue({
				data: null,
				error: { message: 'DB error' },
			});
			render(
				<AttendanceEntryModal
					entry={null}
					userId="user-1"
					open={true}
					onOpenChange={mockOnOpenChange}
					onUpdate={mockOnUpdate}
				/>
			);
			fireEvent.click(screen.getByText('Crear'));
			await waitFor(() => {
				expect(toast).toHaveBeenCalledWith(
					expect.objectContaining({
						title: 'Error al crear registro',
						variant: 'destructive',
					})
				);
			});
		});

		it('shows "Guardando..." while saving', async () => {
			(createAdminAttendanceEntry as jest.Mock).mockReturnValue(new Promise(() => {}));
			render(
				<AttendanceEntryModal
					entry={null}
					userId="user-1"
					open={true}
					onOpenChange={mockOnOpenChange}
					onUpdate={mockOnUpdate}
				/>
			);
			fireEvent.click(screen.getByText('Crear'));
			await waitFor(() => {
				expect(screen.getByText('Guardando...')).toBeInTheDocument();
			});
		});
	});

	describe('Edit entry', () => {
		it('renderiza en modo edición', () => {
			render(
				<AttendanceEntryModal
					entry={mockEntry}
					open={true}
					onOpenChange={mockOnOpenChange}
					onUpdate={mockOnUpdate}
				/>
			);
			expect(screen.getByText('Editar Registro de Asistencia')).toBeInTheDocument();
			expect(screen.getByText('Guardar')).toBeInTheDocument();
		});

		it('shows the employee name from the entry', () => {
			render(
				<AttendanceEntryModal
					entry={mockEntry}
					open={true}
					onOpenChange={mockOnOpenChange}
					onUpdate={mockOnUpdate}
				/>
			);
			expect(screen.getByText('Empleado: Juan Pérez')).toBeInTheDocument();
		});

		it('shows the date of the entry (not editable)', () => {
			render(
				<AttendanceEntryModal
					entry={mockEntry}
					open={true}
					onOpenChange={mockOnOpenChange}
					onUpdate={mockOnUpdate}
				/>
			);
			expect(screen.getByText(/Fecha:/)).toBeInTheDocument();
			expect(screen.queryByLabelText('Fecha')).not.toBeInTheDocument();
		});

		it('populates the fields with the values from the entry', () => {
			render(
				<AttendanceEntryModal
					entry={mockEntry}
					open={true}
					onOpenChange={mockOnOpenChange}
					onUpdate={mockOnUpdate}
				/>
			);
			expect(screen.getByLabelText('Hora')).toBeInTheDocument();
			expect(screen.getByLabelText('Descripción (opcional)')).toHaveValue('Test entry');
		});

		it('updates the attendance entry correctly', async () => {
			(updateAttendanceEntry as jest.Mock).mockResolvedValue({ data: {}, error: null });
			render(
				<AttendanceEntryModal
					entry={mockEntry}
					open={true}
					onOpenChange={mockOnOpenChange}
					onUpdate={mockOnUpdate}
				/>
			);
			fireEvent.click(screen.getByText('Guardar'));
			await waitFor(() => {
				expect(updateAttendanceEntry).toHaveBeenCalledWith(
					1,
					expect.objectContaining({
						type: 'regular_in',
						entry_time: expect.any(String),
						description: 'Test entry',
					})
				);
			});
		});

		it('shows success toast when updating an entry', async () => {
			(updateAttendanceEntry as jest.Mock).mockResolvedValue({ data: {}, error: null });
			render(
				<AttendanceEntryModal
					entry={mockEntry}
					open={true}
					onOpenChange={mockOnOpenChange}
					onUpdate={mockOnUpdate}
				/>
			);
			fireEvent.click(screen.getByText('Guardar'));
			await waitFor(() => {
				expect(toast).toHaveBeenCalledWith(
					expect.objectContaining({
						title: 'Registro actualizado',
					})
				);
			});
		});

		it('shows error toast when updateAttendanceEntry fails', async () => {
			(updateAttendanceEntry as jest.Mock).mockResolvedValue({
				data: null,
				error: { message: 'Update failed' },
			});
			render(
				<AttendanceEntryModal
					entry={mockEntry}
					open={true}
					onOpenChange={mockOnOpenChange}
					onUpdate={mockOnUpdate}
				/>
			);
			fireEvent.click(screen.getByText('Guardar'));
			await waitFor(() => {
				expect(toast).toHaveBeenCalledWith(
					expect.objectContaining({
						title: 'Error al actualizar registro',
						variant: 'destructive',
					})
				);
			});
		});
	});

	describe('Dirty state and close confirmation', () => {
		it('no muestra confirmación al cerrar sin cambios', () => {
			render(
				<AttendanceEntryModal
					entry={null}
					userId="user-1"
					open={true}
					onOpenChange={mockOnOpenChange}
					onUpdate={mockOnUpdate}
				/>
			);
			fireEvent.click(screen.getByText('Cancelar'));
			expect(mockOnOpenChange).toHaveBeenCalledWith(false);
		});

		it('shows confirmation when trying to close with changes', () => {
			render(
				<AttendanceEntryModal
					entry={null}
					userId="user-1"
					open={true}
					onOpenChange={mockOnOpenChange}
					onUpdate={mockOnUpdate}
				/>
			);
			fireEvent.change(screen.getByLabelText('Hora'), { target: { value: '15:00' } });
			fireEvent.click(screen.getByText('Cancelar'));
			expect(screen.getByText('Cambios sin guardar')).toBeInTheDocument();
			expect(mockOnOpenChange).not.toHaveBeenCalled();
		});

		it('closes the modal when confirming the close', () => {
			render(
				<AttendanceEntryModal
					entry={null}
					userId="user-1"
					open={true}
					onOpenChange={mockOnOpenChange}
					onUpdate={mockOnUpdate}
				/>
			);
			fireEvent.change(screen.getByLabelText('Hora'), { target: { value: '15:00' } });
			fireEvent.click(screen.getByText('Cancelar'));
			expect(screen.getByText('Cambios sin guardar')).toBeInTheDocument();
			const cancelButtons = screen.getAllByText('Cancelar');
			fireEvent.click(cancelButtons[cancelButtons.length - 1]);
			expect(screen.queryByText('Cambios sin guardar')).not.toBeInTheDocument();
			expect(mockOnOpenChange).not.toHaveBeenCalled();
		});

		it('closes the modal when confirming the close', () => {
			render(
				<AttendanceEntryModal
					entry={null}
					userId="user-1"
					open={true}
					onOpenChange={mockOnOpenChange}
					onUpdate={mockOnUpdate}
				/>
			);
			fireEvent.change(screen.getByLabelText('Hora'), { target: { value: '15:00' } });
			fireEvent.click(screen.getByText('Cancelar'));
			fireEvent.click(screen.getByText('Cerrar sin guardar'));
			expect(mockOnOpenChange).toHaveBeenCalledWith(false);
		});

		it('marks as dirty when changing the entry type', () => {
			render(
				<AttendanceEntryModal
					entry={null}
					userId="user-1"
					open={true}
					onOpenChange={mockOnOpenChange}
					onUpdate={mockOnUpdate}
				/>
			);
			const select = screen.getByTestId('select-native');
			fireEvent.change(select, { target: { value: 'regular_out' } });
			fireEvent.click(screen.getByText('Cancelar'));
			expect(screen.getByText('Cambios sin guardar')).toBeInTheDocument();
		});

		it('marks as dirty when changing the description', () => {
			render(
				<AttendanceEntryModal
					entry={null}
					userId="user-1"
					open={true}
					onOpenChange={mockOnOpenChange}
					onUpdate={mockOnUpdate}
				/>
			);
			fireEvent.change(screen.getByLabelText('Descripción (opcional)'), {
				target: { value: 'test' },
			});
			fireEvent.click(screen.getByText('Cancelar'));
			expect(screen.getByText('Cambios sin guardar')).toBeInTheDocument();
		});

		it('resets the dirty state when saving successfully', async () => {
			(createAdminAttendanceEntry as jest.Mock).mockResolvedValue({ data: {}, error: null });
			render(
				<AttendanceEntryModal
					entry={null}
					userId="user-1"
					open={true}
					onOpenChange={mockOnOpenChange}
					onUpdate={mockOnUpdate}
				/>
			);
			fireEvent.change(screen.getByLabelText('Hora'), { target: { value: '15:00' } });
			fireEvent.click(screen.getByText('Crear'));
			await waitFor(() => {
				expect(mockOnOpenChange).toHaveBeenCalledWith(false);
			});
		});
	});

	describe('type="button"', () => {
		it('has type="button" attribute', () => {
			render(
				<AttendanceEntryModal
					entry={null}
					userId="user-1"
					open={true}
					onOpenChange={mockOnOpenChange}
					onUpdate={mockOnUpdate}
				/>
			);
			const buttons = screen.getAllByRole('button');
			buttons.forEach((btn) => {
				expect(btn).toHaveAttribute('type', 'button');
			});
		});
	});
});
