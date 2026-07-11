import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BalanceForm } from '@/components/business/balances/balance-form';

jest.mock('@/components/ui/select', () => ({
	Select: ({ children, onValueChange }: any) => (
		<div data-testid="select">
			<select data-testid="select-native" onChange={(e) => onValueChange?.(e.target.value)}>
				{children}
			</select>
		</div>
	),
	SelectTrigger: ({ children }: any) => <>{children}</>,
	SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
	SelectContent: ({ children }: any) => <>{children}</>,
	SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
}));

jest.mock('@/components/ui/calendar', () => ({
	Calendar: ({ onSelect }: any) => (
		<div data-testid="calendar">
			<button onClick={() => onSelect?.(new Date('2024-07-01'))}>Select Date</button>
		</div>
	),
}));

jest.mock('@/components/ui/popover', () => ({
	Popover: ({ children }: any) => <>{children}</>,
	PopoverTrigger: ({ children }: any) => <>{children}</>,
	PopoverContent: ({ children }: any) => <>{children}</>,
}));

jest.mock('@/components/ui/notes-input', () => ({
	NotesInput: ({ value, onChange, placeholder }: any) => (
		<textarea
			data-testid="notes-input"
			value={value}
			onChange={(e) => onChange(e.target.value)}
			placeholder={placeholder}
		/>
	),
}));

jest.mock('@/utils/formats-money', () => ({
	formatNumber: (v: string) => v.replace(/[^0-9.,]/g, ''),
	parseArsToNumber: (v: string) => Number(v.replace(/\./g, '').replace(',', '.')),
}));

const mockBudgets = [
	{
		id: 1,
		amount_ars: 100000,
		amount_usd: 5000,
		usd_quote: 1000,
		accepted: true,
		sold: false,
		number: 'BGT-001',
		type: 'COCINA',
		folder_budget: {
			id: 10,
			work: {
				locality: 'Springfield',
				address: 'Calle 123',
			},
		},
	},
	{
		id: 2,
		amount_ars: 200000,
		amount_usd: 10000,
		usd_quote: 950,
		accepted: false,
		sold: true,
		number: 'BGT-002',
		type: 'PLACAR',
		folder_budget: {
			id: 20,
			work: {
				locality: 'Shelbyville',
				address: 'Av. Principal 456',
			},
		},
	},
	{
		id: 3,
		amount_ars: 50000,
		amount_usd: 2500,
		usd_quote: 900,
		accepted: false,
		sold: false,
		number: 'BGT-003',
		type: 'MUEBLE',
		folder_budget: {
			id: 30,
			work: {
				locality: 'Ogdenville',
				address: 'Calle 789',
			},
		},
	},
];

describe('BalanceForm', () => {
	const onSubmit = jest.fn();
	const onCancel = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders form fields', () => {
		render(
			<BalanceForm
				clientId={5}
				budgets={mockBudgets as any}
				onSubmit={onSubmit}
				onCancel={onCancel}
			/>
		);

		expect(screen.getByText('Presupuesto asociado')).toBeInTheDocument();
		expect(screen.getByText('Crear saldo')).toBeInTheDocument();
		expect(screen.getByText('Cancelar')).toBeInTheDocument();
	});

	it('calls onCancel when cancel button is clicked', () => {
		render(
			<BalanceForm
				clientId={5}
				budgets={mockBudgets as any}
				onSubmit={onSubmit}
				onCancel={onCancel}
			/>
		);

		fireEvent.click(screen.getByText('Cancelar'));
		expect(onCancel).toHaveBeenCalled();
	});

	it('calls onSubmit with balance data when form is submitted', async () => {
		render(
			<BalanceForm
				clientId={5}
				budgets={mockBudgets as any}
				onSubmit={onSubmit}
				onCancel={onCancel}
			/>
		);

		const select = screen.getByTestId('select-native');
		fireEvent.change(select, { target: { value: '1' } });

		const arsInput = screen.getByLabelText('Monto del saldo en ARS');
		fireEvent.change(arsInput, { target: { value: '150000' } });

		const submitButton = screen.getByText('Crear saldo');
		fireEvent.click(submitButton);

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith(
				expect.objectContaining({
					client_id: 5,
					balance_amount_ars: 150000,
				})
			);
		});
	});

	it('auto-fills form fields when a budget is selected', () => {
		render(
			<BalanceForm
				clientId={5}
				budgets={mockBudgets as any}
				onSubmit={onSubmit}
				onCancel={onCancel}
			/>
		);

		const select = screen.getByTestId('select-native');
		fireEvent.change(select, { target: { value: '1' } });

		const arsInput = screen.getByLabelText('Monto del saldo en ARS') as HTMLInputElement;
		expect(arsInput.value).toBe('100.000');

		const usdInput = screen.getByLabelText('Monto del saldo en USD') as HTMLInputElement;
		expect(usdInput.value).toBe('5000');
	});

	it('shows budget items with correct labels', () => {
		render(
			<BalanceForm
				clientId={5}
				budgets={mockBudgets as any}
				onSubmit={onSubmit}
				onCancel={onCancel}
			/>
		);

		expect(screen.getByText(/Springfield/)).toBeInTheDocument();
		expect(screen.getByText(/Shelbyville/)).toBeInTheDocument();
		expect(screen.queryByText(/Ogdenville/)).not.toBeInTheDocument();
	});

	it('submits with budget_id when budget is selected', async () => {
		render(
			<BalanceForm
				clientId={5}
				budgets={mockBudgets as any}
				onSubmit={onSubmit}
				onCancel={onCancel}
			/>
		);

		const select = screen.getByTestId('select-native');
		fireEvent.change(select, { target: { value: '2' } });

		const arsInput = screen.getByLabelText('Monto del saldo en ARS');
		fireEvent.change(arsInput, { target: { value: '200000' } });

		fireEvent.click(screen.getByText('Crear saldo'));

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith(
				expect.objectContaining({
					budget_id: 2,
				})
			);
		});
	});

	it('submits with notes when provided', async () => {
		render(
			<BalanceForm
				clientId={5}
				budgets={mockBudgets as any}
				onSubmit={onSubmit}
				onCancel={onCancel}
			/>
		);

		const select = screen.getByTestId('select-native');
		fireEvent.change(select, { target: { value: '1' } });

		const notesInput = screen.getByTestId('notes-input');
		fireEvent.change(notesInput, { target: { value: 'Test notes' } });

		const arsInput = screen.getByLabelText('Monto del saldo en ARS');
		fireEvent.change(arsInput, { target: { value: '100000' } });

		fireEvent.click(screen.getByText('Crear saldo'));

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith(
				expect.objectContaining({
					notes: 'Test notes',
				})
			);
		});
	});
});
