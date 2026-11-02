import { render, screen, fireEvent, within } from '@testing-library/react';
import { CollectionPaymentTab } from '@/components/business/cash-flow/collections-payments/collection-payment-tab';
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

jest.mock(
	'@/components/business/cash-flow/collections-payments/collection-payment-filters',
	() => ({
		CollectionPaymentFilters: ({ addLabel, onAdd }: any) => (
			<button onClick={onAdd}>{addLabel}</button>
		),
	})
);

jest.mock('@/components/business/cash-flow/collections-payments/collection-payment-list', () => ({
	CollectionPaymentList: ({ entries, loading, onEdit, onAskDelete, onRowClick }: any) => (
		<div data-testid="list">
			{loading
				? 'Cargando...'
				: entries.map((e: any) => (
						<div key={e.id}>
							{e.party_name}
							<button onClick={() => onEdit(e)}>Editar {e.id}</button>
							<button onClick={() => onAskDelete(e)}>Eliminar {e.id}</button>
							{onRowClick && <button onClick={() => onRowClick(e)}>Ver detalle {e.id}</button>}
						</div>
					))}
		</div>
	),
}));

jest.mock('@/components/business/shared/attachments/entity-attachments-dialog', () => ({
	EntityAttachmentsDialog: ({ open, kind, entityId, title, summary }: any) =>
		open ? (
			<div data-testid="attachments-dialog">
				<span data-testid="attachments-kind">{kind}</span>
				<span data-testid="attachments-entity-id">{entityId}</span>
				<span data-testid="attachments-title">{title}</span>
				<span data-testid="attachments-summary-count">{summary.length}</span>
			</div>
		) : null,
}));

jest.mock(
	'@/components/business/cash-flow/collections-payments/collection-payment-summary',
	() => ({
		CollectionPaymentSummary: ({ total }: any) => <div data-testid="summary">Total: {total}</div>,
	})
);

jest.mock(
	'@/components/business/cash-flow/collections-payments/collection-payment-monthly-grid',
	() => ({
		CollectionPaymentMonthlyGrid: ({ title }: any) => <div data-testid="monthly-grid">{title}</div>,
	})
);

jest.mock(
	'@/components/business/cash-flow/collections-payments/collection-payment-by-method',
	() => ({
		CollectionPaymentByMethod: () => <div data-testid="by-method" />,
	})
);

jest.mock(
	'@/components/business/cash-flow/collections-payments/collection-payment-form-dialog',
	() => ({
		CollectionPaymentFormDialog: ({ open, attachmentsKind, descriptionMaxLength }: any) =>
			open ? (
				<div data-testid="form-dialog">
					<span data-testid="attachments-kind">{attachmentsKind}</span>
					<span data-testid="description-max-length">{descriptionMaxLength}</span>
				</div>
			) : null,
	})
);

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

	it('passes attachmentsKind through to the form dialog when the caller sets it (Pagos only)', () => {
		render(
			<CollectionPaymentTab
				state={makeState({ isFormOpen: true })}
				{...baseRenderProps}
				attachmentsKind="payment"
			/>
		);

		expect(screen.getByTestId('attachments-kind')).toHaveTextContent('payment');
	});

	it('does not set attachmentsKind by default (Cobros)', () => {
		render(<CollectionPaymentTab state={makeState({ isFormOpen: true })} {...baseRenderProps} />);

		expect(screen.getByTestId('attachments-kind')).toBeEmptyDOMElement();
	});

	it('passes the hook descriptionMaxLength through to the form dialog (e.g. 2000 for Pagos)', () => {
		const state = makeState({ isFormOpen: true, descriptionMaxLength: 2000 });
		render(<CollectionPaymentTab state={state} {...baseRenderProps} />);

		expect(screen.getByTestId('description-max-length')).toHaveTextContent('2000');
	});

	describe('attachments detail dialog (Pagos only: attachmentsKind === "payment")', () => {
		const entry = {
			id: 9,
			date: '2026-04-01',
			receipt_number: '0001',
			work_name: 'Obra Norte',
			category_name: 'Materiales',
			description: 'Pago de materiales',
			amount: 500,
			payment_method_name: 'Transferencia',
			bank_account_name: 'Banco Nación - Cuenta principal',
			expense_id: 42,
			expense_label: 'Gasto 42',
		};

		it('never renders the dialog, even when a row is clicked, without attachmentsKind (Cobros)', () => {
			const state = makeState({ visibleEntries: [entry] as any });
			render(<CollectionPaymentTab state={state} {...baseRenderProps} />);

			expect(screen.queryByText('Ver detalle 9')).not.toBeInTheDocument();
			expect(screen.queryByTestId('attachments-dialog')).not.toBeInTheDocument();
		});

		it('opens the dialog with kind="payment" and the clicked entry id when attachmentsKind="payment"', () => {
			const state = makeState({ entries: [entry] as any, visibleEntries: [entry] as any });
			render(
				<CollectionPaymentTab
					state={state}
					{...baseRenderProps}
					entityLabel="pago"
					attachmentsKind="payment"
				/>
			);

			expect(screen.queryByTestId('attachments-dialog')).not.toBeInTheDocument();

			fireEvent.click(screen.getByText('Ver detalle 9'));

			expect(screen.getByTestId('attachments-dialog')).toBeInTheDocument();
			expect(screen.getByTestId('attachments-kind')).toHaveTextContent('payment');
			expect(screen.getByTestId('attachments-entity-id')).toHaveTextContent('9');
			expect(screen.getByTestId('attachments-title')).toHaveTextContent('Detalle del pago');
			// Fecha, N° de comprobante, Obra, Categoría, Detalle, Monto, Medio de pago, Cuenta
			// bancaria + the linked "Gasto" row.
			expect(screen.getByTestId('attachments-summary-count')).toHaveTextContent('9');
		});

		it('keeps the dialog open, deriving the live entry from state.entries, when the row is filtered out of visibleEntries', () => {
			const state = makeState({ entries: [entry] as any, visibleEntries: [entry] as any });
			const { rerender } = render(
				<CollectionPaymentTab
					state={state}
					{...baseRenderProps}
					entityLabel="pago"
					attachmentsKind="payment"
				/>
			);

			fireEvent.click(screen.getByText('Ver detalle 9'));
			expect(screen.getByTestId('attachments-dialog')).toBeInTheDocument();

			const filteredState = makeState({ entries: [entry] as any, visibleEntries: [] as any });
			rerender(
				<CollectionPaymentTab
					state={filteredState}
					{...baseRenderProps}
					entityLabel="pago"
					attachmentsKind="payment"
				/>
			);

			expect(screen.getByTestId('attachments-dialog')).toBeInTheDocument();
			expect(screen.getByTestId('attachments-entity-id')).toHaveTextContent('9');
		});

		it('closes the dialog when the entry is no longer present in state.entries after a refetch (e.g. deleted elsewhere)', () => {
			const state = makeState({ entries: [entry] as any, visibleEntries: [entry] as any });
			const { rerender } = render(
				<CollectionPaymentTab
					state={state}
					{...baseRenderProps}
					entityLabel="pago"
					attachmentsKind="payment"
				/>
			);

			fireEvent.click(screen.getByText('Ver detalle 9'));
			expect(screen.getByTestId('attachments-dialog')).toBeInTheDocument();

			const afterDeleteState = makeState({ entries: [] as any, visibleEntries: [] as any });
			rerender(
				<CollectionPaymentTab
					state={afterDeleteState}
					{...baseRenderProps}
					entityLabel="pago"
					attachmentsKind="payment"
				/>
			);

			expect(screen.queryByTestId('attachments-dialog')).not.toBeInTheDocument();
		});
	});
});
