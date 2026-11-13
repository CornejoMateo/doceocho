import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { IncomeExpenseTab } from '@/components/business/cash-flow/incomes-expenses/income-expense-tab';
import type { useIncomeExpenseTab } from '@/hooks/income-expense/use-income-expense-tab';
import { listPaymentsByExpenseIds } from '@/lib/payments/payments';

jest.mock('@/lib/payments/payments', () => ({
	listPaymentsByExpenseIds: jest.fn(),
}));

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

jest.mock('@/components/business/cash-flow/incomes-expenses/voucher-types-config', () => ({
	VoucherTypesConfig: () => <button>Configurar tipos de comprobante</button>,
}));

jest.mock('@/components/business/cash-flow/incomes-expenses/income-expense-filters', () => ({
	IncomeExpenseFilters: ({ addLabel, onAdd }: any) => <button onClick={onAdd}>{addLabel}</button>,
}));

jest.mock('@/components/business/cash-flow/incomes-expenses/income-expense-list', () => ({
	IncomeExpenseList: ({ entries, loading, onEdit, onAskDelete, onRowClick }: any) => (
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

jest.mock('@/components/business/cash-flow/incomes-expenses/income-expense-summary', () => ({
	IncomeExpenseSummary: ({ totalGross }: any) => (
		<div data-testid="summary">Total: {totalGross}</div>
	),
}));

jest.mock('@/components/business/cash-flow/incomes-expenses/income-expense-monthly-grid', () => ({
	IncomeExpenseMonthlyGrid: () => <div data-testid="monthly-grid" />,
}));

jest.mock('@/components/business/cash-flow/incomes-expenses/income-expense-by-category', () => ({
	IncomeExpenseByCategory: () => <div data-testid="by-category" />,
}));

jest.mock('@/components/business/cash-flow/incomes-expenses/income-expense-form-dialog', () => ({
	IncomeExpenseFormDialog: ({ open, descriptionMaxLength, lockPartyOnEdit }: any) =>
		open ? (
			<div data-testid="form-dialog">
				<span data-testid="description-max-length">{descriptionMaxLength}</span>
				<span data-testid="lock-party-on-edit">{lockPartyOnEdit ? 'true' : 'false'}</span>
			</div>
		) : null,
}));

function makeState(over: Partial<ReturnType<typeof useIncomeExpenseTab>> = {}) {
	return {
		year: 2026,
		setYear: jest.fn(),
		yearOptions: [2025, 2026, 2027],
		loadingList: false,
		entries: [],
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
	beforeEach(() => {
		jest.clearAllMocks();
		(listPaymentsByExpenseIds as jest.Mock).mockResolvedValue({ data: [], error: null });
	});

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

	it('passes the hook descriptionMaxLength through to the form dialog (e.g. 2000 for Gastos)', () => {
		const state = makeState({ isFormOpen: true, descriptionMaxLength: 2000 });
		render(<IncomeExpenseTab state={state} {...baseRenderProps} />);

		expect(screen.getByTestId('description-max-length')).toHaveTextContent('2000');
	});

	it('defaults lockPartyOnEdit to false and forwards it through to the form dialog when set (Gastos)', () => {
		const state = makeState({ isFormOpen: true });
		const { rerender } = render(<IncomeExpenseTab state={state} {...baseRenderProps} />);
		expect(screen.getByTestId('lock-party-on-edit')).toHaveTextContent('false');

		rerender(<IncomeExpenseTab state={state} {...baseRenderProps} lockPartyOnEdit />);
		expect(screen.getByTestId('lock-party-on-edit')).toHaveTextContent('true');
	});

	describe('cascadeDeleteWarning (Gastos only; Ingresos keeps the generic copy)', () => {
		const expenseRenderProps = { ...baseRenderProps, entityLabel: 'gasto' };

		it('shows the generic copy and "Eliminar" when cascadeDeleteWarning is not set (Ingresos)', () => {
			const entry = { id: 1, party_name: 'Cliente 1', total_amount: 1000 };
			const state = makeState({ entryToDelete: entry as any });
			render(<IncomeExpenseTab state={state} {...baseRenderProps} />);

			expect(screen.getByRole('button', { name: 'Eliminar' })).toBeInTheDocument();
			expect(listPaymentsByExpenseIds).not.toHaveBeenCalled();
		});

		it('fetches the linked payments count and shows a pluralized warning with "Eliminar gasto y pagos"', async () => {
			(listPaymentsByExpenseIds as jest.Mock).mockResolvedValue({
				data: [{ id: 1 }, { id: 2 }],
				error: null,
			});
			const entry = { id: 7, party_name: 'Proveedor 1', total_amount: 5000 };
			const state = makeState({ entryToDelete: entry as any });
			render(<IncomeExpenseTab state={state} {...expenseRenderProps} cascadeDeleteWarning />);

			await waitFor(() => expect(listPaymentsByExpenseIds).toHaveBeenCalledWith([7]));
			expect(
				await screen.findByText(
					/también se eliminarán sus 2 pagos asociados y sus archivos adjuntos/
				)
			).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Eliminar gasto y pagos' })).toBeInTheDocument();
		});

		it('singularizes the copy when there is exactly one linked payment', async () => {
			(listPaymentsByExpenseIds as jest.Mock).mockResolvedValue({ data: [{ id: 1 }], error: null });
			const entry = { id: 7, party_name: 'Proveedor 1', total_amount: 5000 };
			const state = makeState({ entryToDelete: entry as any });
			render(<IncomeExpenseTab state={state} {...expenseRenderProps} cascadeDeleteWarning />);

			expect(
				await screen.findByText(/también se eliminarán sus 1 pago asociado y sus archivos adjuntos/)
			).toBeInTheDocument();
		});

		it('falls back to "no tiene pagos asociados" when the count is zero', async () => {
			(listPaymentsByExpenseIds as jest.Mock).mockResolvedValue({ data: [], error: null });
			const entry = { id: 7, party_name: 'Proveedor 1', total_amount: 5000 };
			const state = makeState({ entryToDelete: entry as any });
			render(<IncomeExpenseTab state={state} {...expenseRenderProps} cascadeDeleteWarning />);

			expect(await screen.findByText(/Este gasto no tiene pagos asociados/)).toBeInTheDocument();
		});

		it('keeps the strong generic warning when the count lookup fails', async () => {
			(listPaymentsByExpenseIds as jest.Mock).mockResolvedValue({
				data: null,
				error: { message: 'boom' },
			});
			const entry = { id: 7, party_name: 'Proveedor 1', total_amount: 5000 };
			const state = makeState({ entryToDelete: entry as any });
			render(<IncomeExpenseTab state={state} {...expenseRenderProps} cascadeDeleteWarning />);

			expect(
				await screen.findByText(/sus pagos asociados \(si tiene\) y sus archivos adjuntos/)
			).toBeInTheDocument();
		});

		it('shows a loading state while the count is being fetched', () => {
			let resolveCount: (value: any) => void = () => {};
			(listPaymentsByExpenseIds as jest.Mock).mockReturnValue(
				new Promise((resolve) => {
					resolveCount = resolve;
				})
			);
			const entry = { id: 7, party_name: 'Proveedor 1', total_amount: 5000 };
			const state = makeState({ entryToDelete: entry as any });
			render(<IncomeExpenseTab state={state} {...expenseRenderProps} cascadeDeleteWarning />);

			expect(screen.getByText('Verificando pagos asociados...')).toBeInTheDocument();
			resolveCount({ data: [], error: null });
		});

		it('renders the cascade warning outside the dialog description, with no <p> wrapping block content', async () => {
			(listPaymentsByExpenseIds as jest.Mock).mockResolvedValue({
				data: [{ id: 1 }, { id: 2 }],
				error: null,
			});
			const entry = { id: 7, party_name: 'Proveedor 1', total_amount: 5000 };
			const state = makeState({ entryToDelete: entry as any });
			const { baseElement } = render(
				<IncomeExpenseTab state={state} {...expenseRenderProps} cascadeDeleteWarning />
			);

			await screen.findByText(/también se eliminarán sus 2 pagos asociados/);

			const description = baseElement.querySelector('[data-slot="dialog-description"]');
			expect(description?.tagName).toBe('P');
			expect(description?.querySelector('[data-slot="alert"]')).toBeNull();

			baseElement.querySelectorAll('p').forEach((p) => {
				expect(p.querySelector('div, p, ul, ol, table, section')).toBeNull();
			});
		});
	});

	describe('attachments detail dialog (Gastos only: attachmentsKind === "expense")', () => {
		const entry = {
			id: 7,
			date: '2026-04-01',
			voucher_number: '0001-00000456',
			voucher_type_name: 'Factura A',
			work_name: 'Obra Norte',
			party_name: 'Proveedor 1',
			category_name: 'Materiales',
			description: 'Compra de cemento',
			net_amount: 413,
			iva_amount: 87,
			total_amount: 500,
			payment_method_name: 'Transferencia',
			bank_account_name: 'Banco Nación - Cuenta principal',
		};

		it('never renders the dialog, even when a row is clicked, without attachmentsKind (Ingresos)', () => {
			const state = makeState({ visibleEntries: [entry] as any });
			render(<IncomeExpenseTab state={state} {...baseRenderProps} />);

			expect(screen.queryByText('Ver detalle 7')).not.toBeInTheDocument();
			expect(screen.queryByTestId('attachments-dialog')).not.toBeInTheDocument();
		});

		it('opens the dialog with kind="expense" and the clicked entry id when attachmentsKind="expense"', () => {
			const state = makeState({ entries: [entry] as any, visibleEntries: [entry] as any });
			render(
				<IncomeExpenseTab
					state={state}
					{...baseRenderProps}
					entityLabel="gasto"
					attachmentsKind="expense"
				/>
			);

			expect(screen.queryByTestId('attachments-dialog')).not.toBeInTheDocument();

			fireEvent.click(screen.getByText('Ver detalle 7'));

			expect(screen.getByTestId('attachments-dialog')).toBeInTheDocument();
			expect(screen.getByTestId('attachments-kind')).toHaveTextContent('expense');
			expect(screen.getByTestId('attachments-entity-id')).toHaveTextContent('7');
			expect(screen.getByTestId('attachments-title')).toHaveTextContent('Detalle del gasto');
			expect(screen.getByTestId('attachments-summary-count')).toHaveTextContent('11');
		});

		it('keeps the dialog open, deriving the live entry from state.entries, when the row is filtered out of visibleEntries', () => {
			const state = makeState({ entries: [entry] as any, visibleEntries: [entry] as any });
			const { rerender } = render(
				<IncomeExpenseTab
					state={state}
					{...baseRenderProps}
					entityLabel="gasto"
					attachmentsKind="expense"
				/>
			);

			fireEvent.click(screen.getByText('Ver detalle 7'));
			expect(screen.getByTestId('attachments-dialog')).toBeInTheDocument();

			// A filter change narrows visibleEntries, but the unfiltered `entries` still has it.
			const filteredState = makeState({ entries: [entry] as any, visibleEntries: [] as any });
			rerender(
				<IncomeExpenseTab
					state={filteredState}
					{...baseRenderProps}
					entityLabel="gasto"
					attachmentsKind="expense"
				/>
			);

			expect(screen.getByTestId('attachments-dialog')).toBeInTheDocument();
			expect(screen.getByTestId('attachments-entity-id')).toHaveTextContent('7');
		});

		it('closes the dialog when the entry is no longer present in state.entries after a refetch (e.g. deleted elsewhere)', () => {
			const state = makeState({ entries: [entry] as any, visibleEntries: [entry] as any });
			const { rerender } = render(
				<IncomeExpenseTab
					state={state}
					{...baseRenderProps}
					entityLabel="gasto"
					attachmentsKind="expense"
				/>
			);

			fireEvent.click(screen.getByText('Ver detalle 7'));
			expect(screen.getByTestId('attachments-dialog')).toBeInTheDocument();

			const afterDeleteState = makeState({ entries: [] as any, visibleEntries: [] as any });
			rerender(
				<IncomeExpenseTab
					state={afterDeleteState}
					{...baseRenderProps}
					entityLabel="gasto"
					attachmentsKind="expense"
				/>
			);

			expect(screen.queryByTestId('attachments-dialog')).not.toBeInTheDocument();
		});
	});
});
