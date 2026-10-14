import { render, screen, fireEvent, within } from '@testing-library/react';
import { CollectionPaymentTab } from '@/components/business/cash-flow/collection-payment-tab';
import type { useCollectionPaymentTab } from '@/hooks/collection-payment/use-collection-payment-tab';

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

jest.mock('@/components/business/cash-flow/collection-payment-filters', () => ({
	CollectionPaymentFilters: ({ addLabel, onAdd }: any) => (
		<button onClick={onAdd}>{addLabel}</button>
	),
}));

jest.mock('@/components/business/cash-flow/collection-payment-list', () => ({
	CollectionPaymentList: ({ entries, loading, onEdit, onAskDelete }: any) => (
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

jest.mock('@/components/business/cash-flow/collection-payment-summary', () => ({
	CollectionPaymentSummary: ({ total }: any) => <div data-testid="summary">Total: {total}</div>,
}));

jest.mock('@/components/business/cash-flow/collection-payment-monthly-grid', () => ({
	CollectionPaymentMonthlyGrid: ({ title }: any) => <div data-testid="monthly-grid">{title}</div>,
}));

jest.mock('@/components/business/cash-flow/collection-payment-by-method', () => ({
	CollectionPaymentByMethod: () => <div data-testid="by-method" />,
}));

jest.mock('@/components/business/cash-flow/collection-payment-form-dialog', () => ({
	CollectionPaymentFormDialog: ({ open }: any) => (open ? <div data-testid="form-dialog" /> : null),
}));

function makeState(over: Partial<ReturnType<typeof useCollectionPaymentTab>> = {}) {
	return {
		year: 2026,
		setYear: jest.fn(),
		yearOptions: [2025, 2026, 2027],
		loadingList: false,
		entries: [],
		visibleEntries: [],
		categories: [],
		activeCategories: [],
		works: [],
		parties: [],
		paymentMethods: [],
		activePaymentMethods: [],
		bankAccounts: [],
		summary: { count: 0, total: 0, average: 0, max: 0 },
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
		filterPaymentMethodId: '',
		setFilterPaymentMethodId: jest.fn(),
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
		receiptNumber: '',
		setReceiptNumber: jest.fn(),
		workId: '',
		setWorkId: jest.fn(),
		partyId: '',
		setPartyId: jest.fn(),
		categoryId: '',
		setCategoryId: jest.fn(),
		description: '',
		setDescription: jest.fn(),
		amount: '',
		setAmount: jest.fn(),
		paymentMethodId: '',
		setPaymentMethodId: jest.fn(),
		bankAccountId: 'none',
		setBankAccountId: jest.fn(),
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
	} as unknown as ReturnType<typeof useCollectionPaymentTab>;
}

const baseRenderProps = {
	entityLabel: 'cobro',
	partyLabel: 'Cliente',
	addLabel: 'Nuevo cobro',
	emptyLabel: 'No hay cobros registrados',
	monthlyGridTitle: 'Cobros por mes',
	categoriesConfig: <button>Configurar categorías</button>,
};

describe('CollectionPaymentTab', () => {
	it('renders the controls row: year select and categories config', () => {
		render(<CollectionPaymentTab state={makeState()} {...baseRenderProps} />);

		expect(screen.getByTestId('year-select')).toBeInTheDocument();
		expect(screen.getByText('Configurar categorías')).toBeInTheDocument();
	});

	it('renders the summary column with the monthly grid title passed through', () => {
		const state = makeState({ summary: { count: 1, total: 500, average: 500, max: 500 } });
		render(<CollectionPaymentTab state={state} {...baseRenderProps} />);

		expect(screen.getByTestId('list')).toBeInTheDocument();
		expect(screen.getByTestId('summary')).toHaveTextContent('Total: 500');
		expect(screen.getByTestId('monthly-grid')).toHaveTextContent('Cobros por mes');
		expect(screen.getByTestId('by-method')).toBeInTheDocument();
	});

	it('calls setYear when the year select changes', () => {
		const state = makeState();
		render(<CollectionPaymentTab state={state} {...baseRenderProps} />);

		fireEvent.change(screen.getByTestId('year-select'), { target: { value: '2027' } });

		expect(state.setYear).toHaveBeenCalledWith(2027);
	});

	it('shows the loading state from the hook in the list', () => {
		render(<CollectionPaymentTab state={makeState({ loadingList: true })} {...baseRenderProps} />);

		expect(within(screen.getByTestId('list')).getByText('Cargando...')).toBeInTheDocument();
	});

	it('calls handleAdd when the add action is triggered from the filters row', () => {
		const state = makeState();
		render(<CollectionPaymentTab state={state} {...baseRenderProps} />);

		fireEvent.click(screen.getByText('Nuevo cobro'));

		expect(state.handleAdd).toHaveBeenCalledTimes(1);
	});

	it('calls handleEdit and setEntryToDelete from the list actions', () => {
		const entry = { id: 1, party_name: 'Cliente 1', amount: 500 };
		const state = makeState({ visibleEntries: [entry] as any });
		render(<CollectionPaymentTab state={state} {...baseRenderProps} />);

		fireEvent.click(screen.getByText('Editar 1'));
		expect(state.handleEdit).toHaveBeenCalledWith(entry);

		fireEvent.click(screen.getByText('Eliminar 1'));
		expect(state.setEntryToDelete).toHaveBeenCalledWith(entry);
	});

	it('shows the delete confirmation dialog with the entry amount and calls confirmDelete', () => {
		const entry = { id: 1, party_name: 'Cliente 1', amount: 500 };
		const state = makeState({ entryToDelete: entry as any });
		render(<CollectionPaymentTab state={state} {...baseRenderProps} />);

		expect(screen.getByText('¿Eliminar cobro?')).toBeInTheDocument();
		expect(screen.getByText(/Se eliminará el cobro de Cliente 1/)).toBeInTheDocument();

		fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));

		expect(state.confirmDelete).toHaveBeenCalledTimes(1);
	});

	it('renders the form dialog open state from the hook', () => {
		render(<CollectionPaymentTab state={makeState({ isFormOpen: true })} {...baseRenderProps} />);

		expect(screen.getByTestId('form-dialog')).toBeInTheDocument();
	});
});
