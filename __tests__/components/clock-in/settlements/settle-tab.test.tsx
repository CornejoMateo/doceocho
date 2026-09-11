import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LiquidarTab } from '@/components/business/clock-in/settlements/settle-tab';
import { getAttendanceSettings } from '@/lib/attendance/attendance-settings';
import { getAttendanceEntriesForMonth } from '@/lib/attendance/attendance-entries';
import { upsertMonthlySettlement } from '@/lib/attendance/settlements';
import { toast } from '@/components/ui/use-toast';
import { User } from '@/lib/users/users';

jest.mock('@/components/ui/select', () => ({
	Select: ({ children, onValueChange }: any) => (
		<select data-testid="select-native" onChange={(e) => onValueChange?.(e.target.value)}>
			{children}
		</select>
	),
	SelectTrigger: ({ children }: any) => <>{children}</>,
	SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
	SelectContent: ({ children }: any) => <>{children}</>,
	SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
}));

jest.mock('@/components/ui/button', () => ({
	Button: ({ children, onClick, disabled, ...props }: any) => (
		<button onClick={onClick} disabled={disabled} {...props}>
			{children}
		</button>
	),
}));

jest.mock('@/components/ui/input', () => ({
	Input: ({ value, onChange, id, ...props }: any) => (
		<input value={value ?? ''} onChange={onChange} id={id} {...props} />
	),
}));

jest.mock('@/components/ui/label', () => ({
	Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>,
}));

jest.mock('@/components/ui/use-toast', () => ({
	toast: jest.fn(),
}));

jest.mock('@/utils/formats-money', () => ({
	formatCurrency: (v: number) => `$${v}`,
	formatCurrencyWithoutSymbol: (v: number) => `${v}`,
	formatNumber: (v: string) => v,
	parseArsToNumber: (v: string) => Number(v) || 0,
}));

jest.mock('@/lib/attendance/attendance-settings', () => ({
	getAttendanceSettings: jest.fn(),
}));

jest.mock('@/lib/attendance/attendance-entries', () => ({
	getAttendanceEntriesForMonth: jest.fn(),
}));

jest.mock('@/lib/attendance/settlements', () => ({
	upsertMonthlySettlement: jest.fn(),
}));

jest.mock('@/lib/error-translator', () => ({
	translateError: (e: any) => e?.message || 'Error',
}));

const mockUsers: User[] = [
	{
		id: 1,
		uid_user: 'u1',
		name: 'Juan',
		last_name: 'Pérez',
		username: 'jperez',
		role: 'Taller',
	},
	{
		id: 2,
		uid_user: 'u2',
		name: 'María',
		last_name: 'García',
		username: 'mgarcia',
		role: 'Taller',
	},
	{ id: 3, uid_user: 'u3', name: 'Admin', last_name: 'User', username: 'admin', role: 'Admin' },
];

function makeAttendanceEntry(userId: string, type: string, time: string) {
	return {
		attendance: {
			user_id: userId,
			users: { name: 'Juan', last_name: 'Pérez', username: 'jperez' },
		},
		type,
		entry_time: time,
	};
}

describe('LiquidarTab', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(getAttendanceSettings as jest.Mock).mockResolvedValue({
			data: { price_hour: 1000, price_hour_overtime: 1500 },
			error: null,
		});
		(getAttendanceEntriesForMonth as jest.Mock).mockResolvedValue({
			data: [],
			error: null,
		});
		(upsertMonthlySettlement as jest.Mock).mockResolvedValue({
			data: null,
			error: null,
		});
	});

	it('renders the form fields', async () => {
		render(<LiquidarTab users={mockUsers} onLiquidated={jest.fn()} />);

		expect(screen.getByText('Empleado')).toBeInTheDocument();
		expect(screen.getByText('Año')).toBeInTheDocument();
		expect(screen.getByText('Mes')).toBeInTheDocument();
		expect(screen.getByText('Pago por hora')).toBeInTheDocument();
		expect(screen.getByText('Pago por hora extra')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /calcular horas/i })).toBeInTheDocument();
	});

	it('loads settings and populates rate inputs', async () => {
		render(<LiquidarTab users={mockUsers} onLiquidated={jest.fn()} />);

		await waitFor(() => {
			expect(getAttendanceSettings).toHaveBeenCalled();
		});

		expect(screen.getByDisplayValue('1000')).toBeInTheDocument();
		expect(screen.getByDisplayValue('1500')).toBeInTheDocument();
	});

	it('shows the calculate button initially', () => {
		render(<LiquidarTab users={mockUsers} onLiquidated={jest.fn()} />);
		expect(screen.getByRole('button', { name: /calcular horas/i })).toBeInTheDocument();
	});

	it('calculates and displays hours when calculate button is clicked', async () => {
		const entries = [
			makeAttendanceEntry('u1', 'regular_in', '2026-08-01T09:00:00'),
			makeAttendanceEntry('u1', 'regular_out', '2026-08-01T17:00:00'),
		];
		(getAttendanceEntriesForMonth as jest.Mock).mockResolvedValue({
			data: entries,
			error: null,
		});

		render(<LiquidarTab users={mockUsers} onLiquidated={jest.fn()} />);

		fireEvent.click(screen.getByRole('button', { name: /calcular horas/i }));

		await waitFor(() => {
			expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
		});

		expect(screen.getByText(/8\.00h normales/)).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /liquidar/i })).toBeInTheDocument();
	});

	it('shows empty message when no hours to calculate', async () => {
		(getAttendanceEntriesForMonth as jest.Mock).mockResolvedValue({
			data: [],
			error: null,
		});

		render(<LiquidarTab users={mockUsers} onLiquidated={jest.fn()} />);

		fireEvent.click(screen.getByRole('button', { name: /calcular horas/i }));

		await waitFor(() => {
			expect(
				screen.getByText('No hay horas para calcular en el período seleccionado')
			).toBeInTheDocument();
		});

		expect(screen.getByRole('button', { name: /liquidar/i })).toBeInTheDocument();
	});

	it('shows error toast when attendance fetch fails', async () => {
		(getAttendanceEntriesForMonth as jest.Mock).mockResolvedValue({
			data: null,
			error: { message: 'DB error' },
		});

		render(<LiquidarTab users={mockUsers} onLiquidated={jest.fn()} />);

		fireEvent.click(screen.getByRole('button', { name: /calcular horas/i }));

		await waitFor(() => {
			expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
		});
	});

	it('liquidates successfully and calls onLiquidated', async () => {
		const entries = [
			makeAttendanceEntry('u1', 'regular_in', '2026-08-01T09:00:00'),
			makeAttendanceEntry('u1', 'regular_out', '2026-08-01T17:00:00'),
		];
		(getAttendanceEntriesForMonth as jest.Mock).mockResolvedValue({
			data: entries,
			error: null,
		});

		const onLiquidated = jest.fn();
		render(<LiquidarTab users={mockUsers} onLiquidated={onLiquidated} />);

		fireEvent.click(screen.getByRole('button', { name: /calcular horas/i }));

		await waitFor(() => {
			expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
		});

		fireEvent.click(screen.getByRole('button', { name: /liquidar/i }));

		await waitFor(() => {
			expect(upsertMonthlySettlement).toHaveBeenCalledWith(
				expect.objectContaining({
					user_id: 'u1',
					number_hours: 8,
					price_hour: 1000,
					price_overtime_hour: 1500,
				})
			);
		});

		expect(onLiquidated).toHaveBeenCalled();
		expect(toast).toHaveBeenCalledWith(
			expect.objectContaining({
				title: 'Liquidación',
				description: 'Liquidación generada correctamente',
			})
		);
	});

	it('shows error toast when upsert fails', async () => {
		const entries = [
			makeAttendanceEntry('u1', 'regular_in', '2026-08-01T09:00:00'),
			makeAttendanceEntry('u1', 'regular_out', '2026-08-01T17:00:00'),
		];
		(getAttendanceEntriesForMonth as jest.Mock).mockResolvedValue({
			data: entries,
			error: null,
		});
		(upsertMonthlySettlement as jest.Mock).mockResolvedValue({
			data: null,
			error: { message: 'Upsert failed' },
		});

		render(<LiquidarTab users={mockUsers} onLiquidated={jest.fn()} />);

		fireEvent.click(screen.getByRole('button', { name: /calcular horas/i }));

		await waitFor(() => {
			expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
		});

		fireEvent.click(screen.getByRole('button', { name: /liquidar/i }));

		await waitFor(() => {
			expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
		});
	});

	it('seeds users with zero hours when no entries exist', async () => {
		(getAttendanceEntriesForMonth as jest.Mock).mockResolvedValue({
			data: [],
			error: null,
		});

		render(<LiquidarTab users={mockUsers} onLiquidated={jest.fn()} />);

		fireEvent.click(screen.getByRole('button', { name: /calcular horas/i }));

		await waitFor(() => {
			expect(screen.getByRole('button', { name: /liquidar/i })).toBeInTheDocument();
		});

		fireEvent.click(screen.getByRole('button', { name: /liquidar/i }));

		await waitFor(() => {
			expect(upsertMonthlySettlement).toHaveBeenCalledTimes(2);
		});

		expect(upsertMonthlySettlement).toHaveBeenCalledWith(
			expect.objectContaining({ user_id: 'u1', number_hours: 0 })
		);
		expect(upsertMonthlySettlement).toHaveBeenCalledWith(
			expect.objectContaining({ user_id: 'u2', number_hours: 0 })
		);
	});

	it('clears calculated hours when employee selection changes', async () => {
		const entries = [
			makeAttendanceEntry('u1', 'regular_in', '2026-08-01T09:00:00'),
			makeAttendanceEntry('u1', 'regular_out', '2026-08-01T17:00:00'),
		];
		(getAttendanceEntriesForMonth as jest.Mock).mockResolvedValue({
			data: entries,
			error: null,
		});

		render(<LiquidarTab users={mockUsers} onLiquidated={jest.fn()} />);

		fireEvent.click(screen.getByRole('button', { name: /calcular horas/i }));

		await waitFor(() => {
			expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
		});

		const selects = screen.getAllByTestId('select-native');
		fireEvent.change(selects[0], { target: { value: 'u1' } });

		await waitFor(() => {
			expect(screen.getByRole('button', { name: /calcular horas/i })).toBeInTheDocument();
		});
	});

	it('calculates overtime hours correctly', async () => {
		const entries = [
			makeAttendanceEntry('u1', 'overtime_in', '2026-08-01T18:00:00'),
			makeAttendanceEntry('u1', 'overtime_out', '2026-08-01T20:00:00'),
		];
		(getAttendanceEntriesForMonth as jest.Mock).mockResolvedValue({
			data: entries,
			error: null,
		});

		render(<LiquidarTab users={mockUsers} onLiquidated={jest.fn()} />);

		fireEvent.click(screen.getByRole('button', { name: /calcular horas/i }));

		await waitFor(() => {
			expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
		});

		expect(screen.getByText(/0\.00h normales/)).toBeInTheDocument();
		expect(screen.getByText(/2\.00h extras/)).toBeInTheDocument();
	});

	it('shows the rates update hint text after calculating', async () => {
		const entries = [
			makeAttendanceEntry('u1', 'regular_in', '2026-08-01T09:00:00'),
			makeAttendanceEntry('u1', 'regular_out', '2026-08-01T17:00:00'),
		];
		(getAttendanceEntriesForMonth as jest.Mock).mockResolvedValue({
			data: entries,
			error: null,
		});

		render(<LiquidarTab users={mockUsers} onLiquidated={jest.fn()} />);

		fireEvent.click(screen.getByRole('button', { name: /calcular horas/i }));

		await waitFor(() => {
			expect(
				screen.getByText('Los montos se actualizan al modificar las tasas')
			).toBeInTheDocument();
		});
	});

	it('does not show calculate button after hours are calculated', async () => {
		const entries = [
			makeAttendanceEntry('u1', 'regular_in', '2026-08-01T09:00:00'),
			makeAttendanceEntry('u1', 'regular_out', '2026-08-01T17:00:00'),
		];
		(getAttendanceEntriesForMonth as jest.Mock).mockResolvedValue({
			data: entries,
			error: null,
		});

		render(<LiquidarTab users={mockUsers} onLiquidated={jest.fn()} />);

		fireEvent.click(screen.getByRole('button', { name: /calcular horas/i }));

		await waitFor(() => {
			expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
		});

		expect(screen.queryByRole('button', { name: /calcular horas/i })).not.toBeInTheDocument();
	});

	it('filters out admin users from the employee select', () => {
		render(<LiquidarTab users={mockUsers} onLiquidated={jest.fn()} />);

		const select = screen.getAllByTestId('select-native')[0];
		const options = Array.from(select.querySelectorAll('option')).map((o) => o.textContent);

		expect(options).toContain('Juan Pérez');
		expect(options).toContain('María García');
		expect(options).not.toContain('Admin User');
	});
});
