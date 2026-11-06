import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { FixedExpensesTab } from '@/components/business/cash-flow/fixed-expenses/fixed-expenses-tab';
import {
	listFixedExpenses,
	createFixedExpense,
	deactivateFixedExpense,
} from '@/lib/fixed-expenses/fixed-expenses';
import { listCategories } from '@/lib/categories/categories';

const mockToast = jest.fn();

jest.mock('@/components/ui/use-toast', () => ({
	useToast: () => ({ toast: mockToast }),
}));

jest.mock('@/lib/fixed-expenses/fixed-expenses', () => ({
	listFixedExpenses: jest.fn(),
	createFixedExpense: jest.fn(),
	updateFixedExpense: jest.fn(),
	deactivateFixedExpense: jest.fn(),
	reactivateFixedExpense: jest.fn(),
	markFixedExpenseExpenseCreated: jest.fn(),
	hasExpenseThisMonth: (expense: { last_expense_period: string | null }) =>
		!!expense.last_expense_period,
}));

jest.mock('@/lib/categories/categories', () => ({
	listCategories: jest.fn(),
}));

jest.mock('@/lib/error-translator', () => ({
	translateError: jest.fn(),
}));

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

const CATEGORY = {
	id: 10,
	created_at: '2026-10-09T00:00:00Z',
	name: 'Alquiler oficina',
	kind: 'expense' as const,
	is_active: true,
};

const EXPENSE = {
	id: 1,
	created_at: '2026-10-09T00:00:00Z',
	category_id: 10,
	kind: 'expense' as const,
	net_amount: 50000,
	iva_percent: 0,
	iva_amount: 0,
	amount: 50000,
	description: 'Alquiler mensual',
	is_active: true,
	last_expense_period: null,
	category_name: 'Alquiler oficina',
};

const desktop = async () => within(await screen.findByTestId('fixed-expenses-desktop'));

describe('FixedExpensesTab', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(listFixedExpenses as jest.Mock).mockResolvedValue({ data: [], error: null });
		(listCategories as jest.Mock).mockResolvedValue({ data: [CATEGORY], error: null });
		(createFixedExpense as jest.Mock).mockResolvedValue({ data: { id: 2 }, error: null });
		(deactivateFixedExpense as jest.Mock).mockResolvedValue({ data: { id: 1 }, error: null });
	});

	it('lists the fixed expenses fetched on mount', async () => {
		(listFixedExpenses as jest.Mock).mockResolvedValue({ data: [EXPENSE], error: null });

		render(<FixedExpensesTab />);

		const scope = await desktop();
		expect(await scope.findByText('Alquiler mensual')).toBeInTheDocument();
		expect(scope.getByText('Alquiler oficina')).toBeInTheDocument();
	});

	it('shows the empty state when there are no fixed expenses', async () => {
		render(<FixedExpensesTab />);

		expect(await screen.findByText('No hay costos fijos registrados')).toBeInTheDocument();
	});

	it('shows the automatic summary of active fixed costs', async () => {
		(listFixedExpenses as jest.Mock).mockResolvedValue({ data: [EXPENSE], error: null });

		render(<FixedExpensesTab />);
		const scope = await desktop();
		await scope.findByText('Alquiler mensual');

		const stats = within(screen.getByTestId('fixed-expenses-summary-stats'));
		expect(stats.getAllByText('$ 50.000').length).toBeGreaterThan(0);
		expect(stats.getByText('1')).toBeInTheDocument();
	});

	it('creates a fixed expense with the description trimmed before submitting', async () => {
		render(<FixedExpensesTab />);
		await waitFor(() => expect(listFixedExpenses).toHaveBeenCalled());

		fireEvent.click(screen.getByText('Nuevo costo fijo'));
		await screen.findByRole('option', { name: 'Alquiler oficina' });

		const formDialog = within(screen.getByRole('dialog'));
		fireEvent.change(formDialog.getAllByTestId('select-native')[0], { target: { value: '10' } });
		fireEvent.change(screen.getByLabelText('Concepto'), {
			target: { value: '  Alquiler mensual  ' },
		});
		fireEvent.change(screen.getByLabelText('Neto'), { target: { value: '50000' } });

		expect(screen.getByLabelText('Neto')).toHaveValue('50.000');

		fireEvent.submit(screen.getByLabelText('Concepto').closest('form')!);

		await waitFor(() => {
			expect(createFixedExpense).toHaveBeenCalledWith({
				category_id: 10,
				net_amount: 50000,
				iva_percent: 0,
				description: 'Alquiler mensual',
			});
		});
	});

	it('prefills the net amount input formatted when editing an existing fixed expense', async () => {
		(listFixedExpenses as jest.Mock).mockResolvedValue({ data: [EXPENSE], error: null });

		render(<FixedExpensesTab />);
		const scope = await desktop();
		await scope.findByText('Alquiler mensual');

		fireEvent.click(scope.getByRole('button', { name: 'Editar' }));

		expect(await screen.findByLabelText('Neto')).toHaveValue('50.000');
	});

	it('asks for confirmation before deactivating a fixed expense', async () => {
		(listFixedExpenses as jest.Mock).mockResolvedValue({ data: [EXPENSE], error: null });

		render(<FixedExpensesTab />);
		const scope = await desktop();
		await scope.findByText('Alquiler mensual');

		fireEvent.click(scope.getByRole('button', { name: 'Desactivar' }));

		const alertDialog = within(screen.getByRole('alertdialog'));
		expect(alertDialog.getByText('¿Desactivar costo fijo?')).toBeInTheDocument();
		expect(deactivateFixedExpense).not.toHaveBeenCalled();

		fireEvent.click(alertDialog.getByText('Desactivar'));

		await waitFor(() => {
			expect(deactivateFixedExpense).toHaveBeenCalledWith(1);
		});
	});

	it('does not deactivate a fixed expense when the confirmation is cancelled', async () => {
		(listFixedExpenses as jest.Mock).mockResolvedValue({ data: [EXPENSE], error: null });

		render(<FixedExpensesTab />);
		const scope = await desktop();
		await scope.findByText('Alquiler mensual');

		fireEvent.click(scope.getByRole('button', { name: 'Desactivar' }));

		const alertDialog = within(screen.getByRole('alertdialog'));
		fireEvent.click(alertDialog.getByText('Cancelar'));

		expect(deactivateFixedExpense).not.toHaveBeenCalled();
	});
});
