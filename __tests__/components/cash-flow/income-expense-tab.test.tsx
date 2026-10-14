import { render, screen, fireEvent, within } from '@testing-library/react';
import { IncomeExpenseTab } from '@/components/business/cash-flow/income-expense-tab';
import type { useIncomeExpenseTab } from '@/hooks/income-expense/use-income-expense-tab';

jest.mock('@/components/ui/select', () => ({
	Select: ({ children, value, onValueChange }: any) => (
		<select data-testid="year-select" value={value} onChange={(e) => onValueChange(e.target.value)}>
			{children}
		</select>
	),
	SelectTrigger: ({ children }: any) => <>{children}</>,
	SelectValue: () => null,
	SelectContent: ({ children }: any) => <>{children}</>,
	SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
}));

jest.mock('@/components/business/cash-flow/voucher-types-config', () => ({
	VoucherTypesConfig: () => <button>Configurar tipos de comprobante</button>,
}));

jest.mock('@/components/business/cash-flow/income-expense-filters', () => ({
	IncomeExpenseFilters: ({ addLabel, onAdd }: any) => <button onClick={onAdd}>{addLabel}</button>,
}));

jest.mock('@/components/business/cash-flow/income-expense-list', () => ({
	IncomeExpenseList: ({ entries, loading, onEdit, onAskDelete }: any) => (
		<div data-testid="list">
			{loading
				? 'Cargando...'
				: entries.map((e: any) => (
						<div key={e.id}>
							{e.party_name}
							<button onClick={() => onEdit(e)}>Editar {e.id}</button>
							<button onClick={() => onAskDelete(e)}>Eliminar {e.id}</button>
						</div>
					))}
		</div>
	),
}));

jest.mock('@/components/business/cash-flow/income-expense-summary', () => ({
	IncomeExpenseSummary: ({ totalGross }: any) => (
		<div data-testid="summary">Total: {totalGross}</div>
	),
}));

jest.mock('@/components/business/cash-flow/income-expense-monthly-grid', () => ({
	IncomeExpenseMonthlyGrid: () => <div data-testid="monthly-grid" />,
}));

jest.mock('@/components/business/cash-flow/income-expense-by-category', () => ({
	IncomeExpenseByCategory: () => <div data-testid="by-category" />,
}));

jest.mock('@/components/business/cash-flow/income-expense-form-dialog', () => ({
	IncomeExpenseFormDialog: ({ open }: any) => (open ? <div data-testid="form-dialog" /> : null),
}));

function makeState(over: Partial<ReturnType<typeof useIncomeExpenseTab>> = {}) {
	return {
		year: 2026,
		setYear: jest.fn(),
		yearOptions: [2025, 2026, 2027],
		loadingList: false,
		visibleEntries: [],
		categories: [],
		activeCategories: [],
		voucherTypes: [],
		activeVoucherTypes: [],
		works: [],
		parties: [],
		summary: { totalNet: 0, totalIva: 0, totalGross: 0, count: 0, average: 0 },
		dateFrom: '',
		setDateFrom: jest.fn(),
		dateTo: '',
		setDateTo: jest.fn(),
		filterWorkId: '',
		setFilterWorkId: jest.fn(),
		filterPartyId: '',
		setFilterPartyId: jest.fn(),
		filterCategoryId: '',
		setFilterCategoryId: jest.fn(),
		search: '',
		setSearch: jest.fn(),
		clearFilters: jest.fn(),
		activeFilterCount: 0,
		filterDialogOpen: false,
		setFilterDialogOpen: jest.fn(),
		isFormOpen: false,
		editingEntry: null,
		date: '2026-01-10',
		setDate: jest.fn(),
		voucherNumber: '',
		setVoucherNumber: jest.fn(),
		voucherTypeId: '',
		setVoucherTypeId: jest.fn(),
		workId: '',
		setWorkId: jest.fn(),
		partyId: '',
		setPartyId: jest.fn(),
		categoryId: '',
		setCategoryId: jest.fn(),
		description: '',
		setDescription: jest.fn(),
		netAmount: '',
		setNetAmount: jest.fn(),
		ivaPercent: 21,
		setIvaPercent: jest.fn(),
		ivaAmount: 0,
		totalAmount: 0,
		saving: false,
		handleAdd: jest.fn(),
		handleEdit: jest.fn(),
		handleFormOpenChange: jest.fn(),
		handleSubmit: jest.fn(),
		entryToDelete: null,
		setEntryToDelete: jest.fn(),
		deleting: false,
		confirmDelete: jest.fn(),
		...over,
	} as unknown as ReturnType<typeof useIncomeExpenseTab>;
}

const baseRenderProps = {
	entityLabel: 'ingreso',
	partyLabel: 'Cliente',
	addLabel: 'Nuevo ingreso',
	emptyLabel: 'No hay ingresos registrados',
	categoriesConfig: <button>Configurar categorías</button>,
};

describe('IncomeExpenseTab', () => {
	it('renders the controls row: year select, voucher types config and categories config', () => {
		render(<IncomeExpenseTab state={makeState()} {...baseRenderProps} />);

		expect(screen.getByTestId('year-select')).toBeInTheDocument();
		expect(screen.getByText('Configurar tipos de comprobante')).toBeInTheDocument();
		expect(screen.getByText('Configurar categorías')).toBeInTheDocument();
	});

	it('renders the summary column alongside the list', () => {
		const state = makeState({
			summary: { totalNet: 100, totalIva: 21, totalGross: 121, count: 1, average: 121 },
		});
		render(<IncomeExpenseTab state={state} {...baseRenderProps} />);

		expect(screen.getByTestId('list')).toBeInTheDocument();
		expect(screen.getByTestId('summary')).toHaveTextContent('Total: 121');
		expect(screen.getByTestId('monthly-grid')).toBeInTheDocument();
		expect(screen.getByTestId('by-category')).toBeInTheDocument();
	});

	it('calls setYear when the year select changes', () => {
		const state = makeState();
		render(<IncomeExpenseTab state={state} {...baseRenderProps} />);

		fireEvent.change(screen.getByTestId('year-select'), { target: { value: '2025' } });

		expect(state.setYear).toHaveBeenCalledWith(2025);
	});

	it('shows the loading state from the hook in the list', () => {
		render(<IncomeExpenseTab state={makeState({ loadingList: true })} {...baseRenderProps} />);

		expect(within(screen.getByTestId('list')).getByText('Cargando...')).toBeInTheDocument();
	});

	it('calls handleAdd when the add action is triggered from the filters row', () => {
		const state = makeState();
		render(<IncomeExpenseTab state={state} {...baseRenderProps} />);

		fireEvent.click(screen.getByText('Nuevo ingreso'));

		expect(state.handleAdd).toHaveBeenCalledTimes(1);
	});

	it('calls handleEdit and setEntryToDelete from the list actions', () => {
		const entry = { id: 1, party_name: 'Cliente 1', total_amount: 1000 };
		const state = makeState({ visibleEntries: [entry] as any });
		render(<IncomeExpenseTab state={state} {...baseRenderProps} />);

		fireEvent.click(screen.getByText('Editar 1'));
		expect(state.handleEdit).toHaveBeenCalledWith(entry);

		fireEvent.click(screen.getByText('Eliminar 1'));
		expect(state.setEntryToDelete).toHaveBeenCalledWith(entry);
	});

	it('shows the delete confirmation dialog with the entry amount and calls confirmDelete', () => {
		const entry = { id: 1, party_name: 'Cliente 1', total_amount: 1000 };
		const state = makeState({ entryToDelete: entry as any });
		render(<IncomeExpenseTab state={state} {...baseRenderProps} />);

		expect(screen.getByText('¿Eliminar ingreso?')).toBeInTheDocument();
		expect(screen.getByText(/Se eliminará el ingreso de Cliente 1/)).toBeInTheDocument();

		fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));

		expect(state.confirmDelete).toHaveBeenCalledTimes(1);
	});

	it('renders the form dialog open state from the hook', () => {
		render(<IncomeExpenseTab state={makeState({ isFormOpen: true })} {...baseRenderProps} />);

		expect(screen.getByTestId('form-dialog')).toBeInTheDocument();
	});
});
