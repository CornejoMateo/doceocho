import { render, screen, fireEvent, within } from '@testing-library/react';
import { CollectionPaymentFormDialog } from '@/components/business/cash-flow/collection-payment-form-dialog';
import type { CashFlowCategory } from '@/lib/categories/categories';
import type { Work } from '@/lib/works/works';
import type { PaymentMethod } from '@/lib/payment-methods/payment-methods';
import type { BankAccount } from '@/lib/cash-flow/cash-flow';
import type { PartyOption } from '@/hooks/income-expense/use-income-expense-tab';
import type { CollectionPaymentEntry } from '@/hooks/collection-payment/use-collection-payment-tab';

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

const mockComboboxLabels: Record<string, string> = {
	'cp-party': 'party-combobox',
	'cp-purchase': 'purchase-combobox',
};

jest.mock('@/components/business/cash-flow/entity-combobox', () => ({
	EntityCombobox: ({ id, value, onValueChange, options, placeholder, disabled }: any) => (
		<select
			data-testid={id}
			aria-label={mockComboboxLabels[id] ?? 'work-combobox'}
			value={value}
			disabled={disabled}
			onChange={(e) => onValueChange(e.target.value)}
		>
			<option value="">{placeholder}</option>
			{options.map((o: any) => (
				<option key={o.id} value={String(o.id)}>
					{o.label}
				</option>
			))}
		</select>
	),
}));

const CATEGORY: CashFlowCategory = {
	id: 1,
	created_at: '2026-01-01',
	name: 'Alquiler',
	kind: 'collection',
	is_active: true,
};
const WORKS: Work[] = [
	{ id: 1, name: 'Obra A', client_id: 1 },
	{ id: 2, name: 'Obra B', client_id: 2 },
];
const PARTIES: PartyOption[] = [
	{ id: 1, name: 'Cliente 1' },
	{ id: 2, name: 'Cliente 2' },
];
const PAYMENT_METHOD: PaymentMethod = {
	id: 1,
	created_at: '2026-01-01',
	name: 'Efectivo',
	is_active: true,
};
const INACTIVE_PAYMENT_METHOD: PaymentMethod = {
	id: 2,
	created_at: '2026-01-01',
	name: 'Cheque',
	is_active: false,
};
const BANK_ACCOUNT: BankAccount = {
	id: 1,
	name: 'Caja ahorro',
	bank: 'Banco Nación',
	account_number: '123',
	account_type: 'Caja de ahorro',
	is_active: true,
	initial_balance: 0,
};

function baseProps(over: Partial<React.ComponentProps<typeof CollectionPaymentFormDialog>> = {}) {
	return {
		open: true,
		onOpenChange: jest.fn(),
		editingEntry: null,
		entityLabel: 'cobro',
		partyLabel: 'Cliente',
		categories: [CATEGORY],
		activeCategories: [CATEGORY],
		works: WORKS,
		parties: PARTIES,
		paymentMethods: [PAYMENT_METHOD],
		activePaymentMethods: [PAYMENT_METHOD],
		bankAccounts: [BANK_ACCOUNT],
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
		onSubmit: jest.fn((e) => e.preventDefault()),
		errors: {},
		...over,
	};
}

const partyCombobox = () => screen.getByLabelText('party-combobox');
const workCombobox = () => screen.getByLabelText('work-combobox');

describe('CollectionPaymentFormDialog', () => {
	it('renders the party field before the work field', () => {
		render(<CollectionPaymentFormDialog {...baseProps()} />);

		const form = screen.getByLabelText('Detalle').closest('form')!;
		const partyLabelEl = within(form).getByText('Cliente');
		const workLabelEl = within(form).getByText('Obra (opcional)');
		expect(
			partyLabelEl.compareDocumentPosition(workLabelEl) & Node.DOCUMENT_POSITION_FOLLOWING
		).toBeTruthy();
	});

	it('disables the work field with "Elegí un cliente primero" when no party is selected', () => {
		render(<CollectionPaymentFormDialog {...baseProps({ partyId: '' })} />);

		expect(workCombobox()).toBeDisabled();
		expect(within(workCombobox()).getByText('Elegí un cliente primero')).toBeInTheDocument();
	});

	it('shows "Sin obras para este cliente" when the selected client has no works', () => {
		render(<CollectionPaymentFormDialog {...baseProps({ partyId: '1', works: [WORKS[1]] })} />);

		expect(workCombobox()).not.toBeDisabled();
		expect(within(workCombobox()).getByText('Sin obras para este cliente')).toBeInTheDocument();
	});

	it('enables and filters work options once a client is selected', () => {
		render(<CollectionPaymentFormDialog {...baseProps({ partyId: '1' })} />);

		expect(workCombobox()).not.toBeDisabled();
		expect(within(workCombobox()).getByText('Obra A')).toBeInTheDocument();
		expect(within(workCombobox()).queryByText('Obra B')).not.toBeInTheDocument();
	});

	it('does not filter works by client when partyLabel is Proveedor', () => {
		render(
			<CollectionPaymentFormDialog {...baseProps({ partyLabel: 'Proveedor', partyId: '1' })} />
		);

		expect(within(workCombobox()).getByText('Obra A')).toBeInTheDocument();
		expect(within(workCombobox()).getByText('Obra B')).toBeInTheDocument();
	});

	it('resets the selected work when switching to a client that does not own it', () => {
		const props = baseProps({ partyId: '1', workId: '1' });
		render(<CollectionPaymentFormDialog {...props} />);

		fireEvent.change(partyCombobox(), { target: { value: '2' } });

		expect(props.setPartyId).toHaveBeenCalledWith('2');
		expect(props.setWorkId).toHaveBeenCalledWith('');
	});

	it('caps the amount input to 2 decimals while typing', () => {
		const props = baseProps();
		render(<CollectionPaymentFormDialog {...props} />);

		fireEvent.change(screen.getByLabelText('Monto'), { target: { value: '1000,999' } });

		expect(props.setAmount).toHaveBeenCalledWith('1.000,99');
	});

	it('submits the form and calls onSubmit', () => {
		const props = baseProps();
		render(<CollectionPaymentFormDialog {...props} />);

		fireEvent.submit(screen.getByLabelText('Monto').closest('form')!);

		expect(props.onSubmit).toHaveBeenCalledTimes(1);
	});

	it('prefills every field from the editing entry', () => {
		const entry: CollectionPaymentEntry = {
			id: 5,
			date: '2026-02-01',
			receipt_number: '0001',
			work_id: 1,
			work_name: 'Obra A',
			party_id: 1,
			party_name: 'Cliente 1',
			category_id: 1,
			category_name: 'Alquiler',
			description: 'Detalle del cobro',
			amount: 1000,
			payment_method_id: 1,
			payment_method_name: 'Efectivo',
			bank_account_id: 1,
			bank_account_name: 'Banco Nación - Caja ahorro',
		};
		render(
			<CollectionPaymentFormDialog
				{...baseProps({
					editingEntry: entry,
					date: entry.date,
					receiptNumber: entry.receipt_number ?? '',
					workId: String(entry.work_id),
					partyId: String(entry.party_id),
					categoryId: String(entry.category_id),
					description: entry.description ?? '',
					amount: '1.000',
					paymentMethodId: String(entry.payment_method_id),
					bankAccountId: String(entry.bank_account_id),
				})}
			/>
		);

		expect(screen.getByText('Editar cobro')).toBeInTheDocument();
		expect(screen.getByLabelText('Fecha')).toHaveValue('2026-02-01');
		expect(screen.getByLabelText('N° comprobante/recibo')).toHaveValue('0001');
		expect(screen.getByLabelText('Detalle')).toHaveValue('Detalle del cobro');
		expect(screen.getByLabelText('Monto')).toHaveValue('1.000');
		expect(screen.getByRole('button', { name: 'Actualizar' })).toBeInTheDocument();
	});

	it('shows an inactive payment method with "(inactivo)" only while editing, keeping it hidden on create', () => {
		const createProps = baseProps({
			paymentMethods: [PAYMENT_METHOD, INACTIVE_PAYMENT_METHOD],
			activePaymentMethods: [PAYMENT_METHOD],
		});
		render(<CollectionPaymentFormDialog {...createProps} />);

		expect(screen.queryByText('Cheque (inactivo)')).not.toBeInTheDocument();
	});

	it('keeps the saved inactive payment method visible with "(inactivo)" when editing that entry', () => {
		const entry = { id: 1, payment_method_id: 2 } as CollectionPaymentEntry;
		render(
			<CollectionPaymentFormDialog
				{...baseProps({
					editingEntry: entry,
					paymentMethodId: '2',
					paymentMethods: [PAYMENT_METHOD, INACTIVE_PAYMENT_METHOD],
					activePaymentMethods: [PAYMENT_METHOD],
				})}
			/>
		);

		expect(screen.getByText('Cheque (inactivo)')).toBeInTheDocument();
	});

	it('calls onOpenChange(false) when "Cancelar" is clicked', () => {
		const props = baseProps();
		render(<CollectionPaymentFormDialog {...props} />);

		fireEvent.click(screen.getByText('Cancelar'));

		expect(props.onOpenChange).toHaveBeenCalledWith(false);
	});

	it('disables the submit button and shows "Guardando..." while saving', () => {
		render(<CollectionPaymentFormDialog {...baseProps({ saving: true })} />);

		expect(screen.getByText('Guardando...')).toBeDisabled();
	});

	describe('Pagos: optional party and the "Compra" field', () => {
		const purchaseCombobox = () => screen.getByLabelText('purchase-combobox');

		it('does not show the "Compra" field or the "Quitar" button without partyOptional', () => {
			render(<CollectionPaymentFormDialog {...baseProps({ partyId: '1' })} />);

			expect(screen.queryByText('Compra')).not.toBeInTheDocument();
			expect(screen.queryByText('Quitar')).not.toBeInTheDocument();
		});

		it('shows the "Compra" field only once a party is selected, when partyOptional', () => {
			const { rerender } = render(
				<CollectionPaymentFormDialog
					{...baseProps({ partyLabel: 'Proveedor', partyOptional: true, partyId: '' })}
				/>
			);
			expect(screen.queryByText('Compra')).not.toBeInTheDocument();

			rerender(
				<CollectionPaymentFormDialog
					{...baseProps({ partyLabel: 'Proveedor', partyOptional: true, partyId: '1' })}
				/>
			);
			expect(screen.getByText('Compra')).toBeInTheDocument();
		});

		it('lets create mode clear a selected party back to "sin proveedor" via the "Quitar" button', () => {
			const props = baseProps({ partyLabel: 'Proveedor', partyOptional: true, partyId: '1' });
			render(<CollectionPaymentFormDialog {...props} />);

			fireEvent.click(screen.getByText('Quitar'));

			expect(props.setPartyId).toHaveBeenCalledWith('');
		});

		it('disables the party field when editing a general-origin entry', () => {
			const entry = { id: 1, source: 'general' } as any;
			render(
				<CollectionPaymentFormDialog
					{...baseProps({
						partyLabel: 'Proveedor',
						partyOptional: true,
						editingEntry: entry,
						partyId: '',
					})}
				/>
			);

			expect(partyCombobox()).toBeDisabled();
		});

		it('keeps the party field enabled (but not clearable) when editing a supplier-origin entry', () => {
			const entry = { id: 1, source: 'supplier' } as any;
			render(
				<CollectionPaymentFormDialog
					{...baseProps({
						partyLabel: 'Proveedor',
						partyOptional: true,
						editingEntry: entry,
						partyId: '1',
						purchaseId: '9',
						purchases: [{ id: 9, name: 'Compra 9' }],
					})}
				/>
			);

			expect(partyCombobox()).not.toBeDisabled();
			expect(screen.queryByText('Quitar')).not.toBeInTheDocument();
		});

		it('selecting a purchase calls setPurchaseId', () => {
			const setPurchaseId = jest.fn();
			const props = baseProps({
				partyLabel: 'Proveedor',
				partyOptional: true,
				partyId: '1',
				purchases: [{ id: 9, name: 'Compra 9' }],
				setPurchaseId,
			});
			render(<CollectionPaymentFormDialog {...props} />);

			fireEvent.change(purchaseCombobox(), { target: { value: '9' } });

			expect(setPurchaseId).toHaveBeenCalledWith('9');
		});

		it('shows the "saldada" warning when the selected purchase is settled', () => {
			render(
				<CollectionPaymentFormDialog
					{...baseProps({
						partyLabel: 'Proveedor',
						partyOptional: true,
						partyId: '1',
						purchaseId: '9',
						purchases: [{ id: 9, name: 'Compra 9 (saldada)', isSettled: true }],
					})}
				/>
			);

			expect(screen.getByText(/ya está saldada/i)).toBeInTheDocument();
		});

		it('does not show the "saldada" warning for a pending purchase', () => {
			render(
				<CollectionPaymentFormDialog
					{...baseProps({
						partyLabel: 'Proveedor',
						partyOptional: true,
						partyId: '1',
						purchaseId: '9',
						purchases: [{ id: 9, name: 'Compra 9 · Saldo $600', isSettled: false }],
					})}
				/>
			);

			expect(screen.queryByText(/ya está saldada/i)).not.toBeInTheDocument();
		});

		it('does not show the "saldada" warning when no purchase is selected yet', () => {
			render(
				<CollectionPaymentFormDialog
					{...baseProps({
						partyLabel: 'Proveedor',
						partyOptional: true,
						partyId: '1',
						purchaseId: '',
						purchases: [{ id: 9, name: 'Compra 9 (saldada)', isSettled: true }],
					})}
				/>
			);

			expect(screen.queryByText(/ya está saldada/i)).not.toBeInTheDocument();
		});

		it('caps the description to 2000 chars when a supplier payment is selected, 300 otherwise', () => {
			const { rerender } = render(
				<CollectionPaymentFormDialog
					{...baseProps({ partyLabel: 'Proveedor', partyOptional: true, partyId: '' })}
				/>
			);
			expect(screen.getByLabelText('Detalle')).toHaveAttribute('maxLength', '300');

			rerender(
				<CollectionPaymentFormDialog
					{...baseProps({
						partyLabel: 'Proveedor',
						partyOptional: true,
						partyId: '1',
						descriptionMaxLength: 2000,
					})}
				/>
			);
			expect(screen.getByLabelText('Detalle')).toHaveAttribute('maxLength', '2000');
		});
	});

	describe('Cobros: optional party and the "Cuenta" field (linkedLabel)', () => {
		const accountCombobox = () => screen.getByLabelText('purchase-combobox');

		it('shows "Cuenta" (not "Compra") once a client is selected, using the configured linkedLabel', () => {
			const { rerender } = render(
				<CollectionPaymentFormDialog
					{...baseProps({ partyOptional: true, partyId: '', linkedLabel: 'Cuenta' })}
				/>
			);
			expect(screen.queryByText('Cuenta')).not.toBeInTheDocument();

			rerender(
				<CollectionPaymentFormDialog
					{...baseProps({ partyOptional: true, partyId: '1', linkedLabel: 'Cuenta' })}
				/>
			);
			expect(screen.getByText('Cuenta')).toBeInTheDocument();
			expect(screen.queryByText('Compra')).not.toBeInTheDocument();
		});

		it('selecting an account calls setPurchaseId (shared linked-entity state)', () => {
			const setPurchaseId = jest.fn();
			const props = baseProps({
				partyOptional: true,
				partyId: '1',
				linkedLabel: 'Cuenta',
				purchases: [{ id: 8, name: 'Cuenta 8' }],
				setPurchaseId,
			});
			render(<CollectionPaymentFormDialog {...props} />);

			fireEvent.change(accountCombobox(), { target: { value: '8' } });

			expect(setPurchaseId).toHaveBeenCalledWith('8');
		});

		it('keeps the party field enabled (but not clearable) when editing a client-origin entry', () => {
			const entry = { id: 1, source: 'client' } as any;
			render(
				<CollectionPaymentFormDialog
					{...baseProps({
						partyOptional: true,
						linkedLabel: 'Cuenta',
						editingEntry: entry,
						partyId: '1',
						purchaseId: '8',
						purchases: [{ id: 8, name: 'Cuenta 8' }],
					})}
				/>
			);

			expect(partyCombobox()).not.toBeDisabled();
			expect(screen.queryByText('Quitar')).not.toBeInTheDocument();
		});

		it('never shows the "saldada" warning in Cobros (isSettled is Payments-only)', () => {
			render(
				<CollectionPaymentFormDialog
					{...baseProps({
						partyOptional: true,
						linkedLabel: 'Cuenta',
						partyId: '1',
						purchaseId: '8',
						purchases: [{ id: 8, name: 'Cuenta 8' }],
					})}
				/>
			);

			expect(screen.queryByText(/ya está saldada/i)).not.toBeInTheDocument();
		});
	});
});
