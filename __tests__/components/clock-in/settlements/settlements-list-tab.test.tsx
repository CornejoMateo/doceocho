import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettlementsListTab } from '@/components/business/clock-in/settlements/settlements-list-tab';
import { getMonthlySettlementsByMonth } from '@/lib/attendance/settlements';
import { toast } from '@/components/ui/use-toast';

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

jest.mock('@/components/ui/label', () => ({
	Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>,
}));

jest.mock('@/components/ui/spinner', () => ({
	Spinner: (props: any) => <div data-testid="spinner" {...props} />,
}));

jest.mock('@/components/ui/use-toast', () => ({
	toast: jest.fn(),
}));

jest.mock('@/utils/formats-money', () => ({
	formatCurrency: (v: number) => `$${v}`,
}));

jest.mock('@/lib/attendance/settlements', () => ({
	getMonthlySettlementsByMonth: jest.fn(),
}));

const mockSettlements = [
	{
		id: 1,
		user_id: 'u1',
		user_name: 'Juan Pérez',
		year: 2026,
		month: 6,
		amount: 160000,
		number_hours: 160,
		number_overtime_hours: 10,
		price_hour: 1000,
		price_overtime_hour: 1500,
		created_at: '2026-07-01T00:00:00Z',
	},
	{
		id: 2,
		user_id: 'u2',
		user_name: 'María García',
		year: 2026,
		month: 6,
		amount: 140000,
		number_hours: 140,
		number_overtime_hours: 0,
		price_hour: 1000,
		price_overtime_hour: 1500,
		created_at: '2026-07-01T00:00:00Z',
	},
];

describe('SettlementsListTab', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('shows loading spinner initially', () => {
		(getMonthlySettlementsByMonth as jest.Mock).mockReturnValue(new Promise(() => {}));

		render(<SettlementsListTab />);

		expect(screen.getByTestId('spinner')).toBeInTheDocument();
	});

	it('shows empty message when no settlements', async () => {
		(getMonthlySettlementsByMonth as jest.Mock).mockResolvedValue({
			data: [],
			error: null,
		});

		render(<SettlementsListTab />);

		await waitFor(() => {
			expect(
				screen.getByText('No hay liquidaciones para el período seleccionado')
			).toBeInTheDocument();
		});
	});

	it('renders settlements list with employee names and amounts', async () => {
		(getMonthlySettlementsByMonth as jest.Mock).mockResolvedValue({
			data: mockSettlements,
			error: null,
		});

		render(<SettlementsListTab />);

		await waitFor(() => {
			expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
		});

		expect(screen.getByText('María García')).toBeInTheDocument();
		expect(screen.getByText('$160000')).toBeInTheDocument();
		expect(screen.getByText('$140000')).toBeInTheDocument();
	});

	it('displays hours and rates for each settlement', async () => {
		(getMonthlySettlementsByMonth as jest.Mock).mockResolvedValue({
			data: mockSettlements,
			error: null,
		});

		render(<SettlementsListTab />);

		await waitFor(() => {
			expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
		});

		expect(screen.getByText(/160\.00h normales/)).toBeInTheDocument();
		expect(screen.getByText(/10\.00h extras/)).toBeInTheDocument();
		expect(screen.getAllByText(/\$1000\/h/).length).toBeGreaterThanOrEqual(1);
		expect(screen.getAllByText(/\$1500\/h extra/).length).toBeGreaterThanOrEqual(1);
	});

	it('shows error toast on fetch failure', async () => {
		(getMonthlySettlementsByMonth as jest.Mock).mockRejectedValue(new Error('Network error'));

		render(<SettlementsListTab />);

		await waitFor(() => {
			expect(toast).toHaveBeenCalledWith(
				expect.objectContaining({
					title: 'Error',
					description: 'Error al cargar liquidaciones',
					variant: 'destructive',
				})
			);
		});
	});

	it('refetches settlements when year changes', async () => {
		(getMonthlySettlementsByMonth as jest.Mock).mockResolvedValue({
			data: [],
			error: null,
		});

		render(<SettlementsListTab />);

		await waitFor(() => {
			expect(getMonthlySettlementsByMonth).toHaveBeenCalledTimes(1);
		});

		const selects = screen.getAllByTestId('select-native');
		fireEvent.change(selects[0], { target: { value: '2025' } });

		await waitFor(() => {
			expect(getMonthlySettlementsByMonth).toHaveBeenCalledTimes(2);
		});
	});

	it('refetches settlements when month changes', async () => {
		(getMonthlySettlementsByMonth as jest.Mock).mockResolvedValue({
			data: [],
			error: null,
		});

		render(<SettlementsListTab />);

		await waitFor(() => {
			expect(getMonthlySettlementsByMonth).toHaveBeenCalledTimes(1);
		});

		const selects = screen.getAllByTestId('select-native');
		fireEvent.change(selects[1], { target: { value: '5' } });

		await waitFor(() => {
			expect(getMonthlySettlementsByMonth).toHaveBeenCalledTimes(2);
		});
	});

	it('displays the month label for each settlement', async () => {
		(getMonthlySettlementsByMonth as jest.Mock).mockResolvedValue({
			data: [mockSettlements[0]],
			error: null,
		});

		render(<SettlementsListTab />);

		await waitFor(() => {
			expect(screen.getByText('Julio')).toBeInTheDocument();
		});
	});

	it('shows the labels for year and month selects', () => {
		(getMonthlySettlementsByMonth as jest.Mock).mockResolvedValue({
			data: [],
			error: null,
		});

		render(<SettlementsListTab />);

		expect(screen.getByText('Año')).toBeInTheDocument();
		expect(screen.getByText('Mes')).toBeInTheDocument();
	});
});
