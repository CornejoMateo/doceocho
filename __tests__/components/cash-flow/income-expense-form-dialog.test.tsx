import { render, screen, fireEvent, within } from '@testing-library/react';
import { IncomeExpenseFormDialog } from '@/components/business/cash-flow/incomes-expenses/income-expense-form-dialog';
import type { CashFlowCategory } from '@/lib/categories/categories';
import type { VoucherType } from '@/lib/voucher-types/voucher-types';
import type { Work } from '@/lib/works/works';
import type { PaymentMethod } from '@/lib/payment-methods/payment-methods';
import type { BankAccount } from '@/lib/cash-flow/cash-flow';
import type {
	PartyOption,
	IncomeExpenseEntry,
} from '@/hooks/income-expense/use-income-expense-tab';
import { formatCurrency } from '@/utils/formats-money';

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

jest.mock('@/components/business/cash-flow/shared/entity-combobox', () => ({
	EntityCombobox: ({ id, value, onValueChange, options, placeholder, disabled }: any) => (
		<select
			data-testid={id}
			aria-label={id === 'ie-party' ? 'party-combobox' : 'work-combobox'}
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
	kind: 'income',
	is_active: true,
};
const INACTIVE_CATEGORY: CashFlowCategory = {
	id: 2,
	created_at: '2026-01-01',
	name: 'Vieja categoría',
	kind: 'income',
	is_active: false,
};
const VOUCHER_TYPE: VoucherType = {
	id: 1,
	created_at: '2026-01-01',
	name: 'Factura A',
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
const BANK_ACCOUNTS: BankAccount[] = [
	{
		id: 1,
		name: 'Cuenta A',
		bank: 'Banco Nación',
		account_number: '123',
		account_type: 'Caja de ahorro',
		is_active: true,
		initial_balance: 0,
	},
];

function baseProps(over: Partial<React.ComponentProps<typeof IncomeExpenseFormDialog>> = {}) {
	return {
		open: true,
		onOpenChange: jest.fn(),
		editingEntry: null,
		entityLabel: 'ingreso',
		partyLabel: 'Cliente',
		categories: [CATEGORY],
		activeCategories: [CATEGORY],
		voucherTypes: [VOUCHER_TYPE],
		activeVoucherTypes: [VOUCHER_TYPE],
		works: WORKS,
		parties: PARTIES,
		paymentMethods: [PAYMENT_METHOD],
		activePaymentMethods: [PAYMENT_METHOD],
		bankAccounts: BANK_ACCOUNTS,
		activeBankAccounts: BANK_ACCOUNTS,
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
		totalAmount: 0,
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

describe('IncomeExpenseFormDialog', () => {
	it('renders the party field before the work field', () => {
		render(<IncomeExpenseFormDialog {...baseProps()} />);

		const form = screen.getByLabelText('Detalle').closest('form')!;
		const partyLabelEl = within(form).getByText('Cliente (opcional)');
		const workLabelEl = within(form).getByText('Obra (opcional)');
		expect(
			partyLabelEl.compareDocumentPosition(workLabelEl) & Node.DOCUMENT_POSITION_FOLLOWING
		).toBeTruthy();
	});

	it('shows every work (unfiltered) when no party is selected, since party is optional', () => {
		render(<IncomeExpenseFormDialog {...baseProps({ partyId: '' })} />);

		expect(workCombobox()).not.toBeDisabled();
		expect(within(workCombobox()).getByText('Obra A')).toBeInTheDocument();
		expect(within(workCombobox()).getByText('Obra B')).toBeInTheDocument();
	});

	it('shows "Sin obras para este cliente" when the selected client has no works', () => {
		render(<IncomeExpenseFormDialog {...baseProps({ partyId: '1', works: [WORKS[1]] })} />);

		expect(workCombobox()).not.toBeDisabled();
		expect(within(workCombobox()).getByText('Sin obras para este cliente')).toBeInTheDocument();
	});

	it('enables and filters work options once a client is selected', () => {
		render(<IncomeExpenseFormDialog {...baseProps({ partyId: '1' })} />);

		expect(workCombobox()).not.toBeDisabled();
		expect(within(workCombobox()).getByText('Obra A')).toBeInTheDocument();
		expect(within(workCombobox()).queryByText('Obra B')).not.toBeInTheDocument();
	});

	it('does not filter works by client when partyLabel is Proveedor', () => {
		render(<IncomeExpenseFormDialog {...baseProps({ partyLabel: 'Proveedor', partyId: '1' })} />);

		expect(within(workCombobox()).getByText('Obra A')).toBeInTheDocument();
		expect(within(workCombobox()).getByText('Obra B')).toBeInTheDocument();
	});

	it('resets the selected work when switching to a client that does not own it', () => {
		const props = baseProps({ partyId: '1', workId: '1' });
		render(<IncomeExpenseFormDialog {...props} />);

		fireEvent.change(partyCombobox(), { target: { value: '2' } });

		expect(props.setPartyId).toHaveBeenCalledWith('2');
		expect(props.setWorkId).toHaveBeenCalledWith('');
	});

	it('shows the live IVA/total preview computed by the caller', () => {
		render(<IncomeExpenseFormDialog {...baseProps({ totalAmount: 1210 })} />);

		expect(screen.getByDisplayValue(formatCurrency(1210).replace(/ /g, ' '))).toBeDisabled();
	});

	it('caps the net amount input to 2 decimals while typing', () => {
		const props = baseProps();
		render(<IncomeExpenseFormDialog {...props} />);

		fireEvent.change(screen.getByLabelText('Neto'), { target: { value: '1000,999' } });

		expect(props.setNetAmount).toHaveBeenCalledWith('1.000,99');
	});

	it('submits the form and calls onSubmit', () => {
		const props = baseProps();
		render(<IncomeExpenseFormDialog {...props} />);

		fireEvent.submit(screen.getByLabelText('Neto').closest('form')!);

		expect(props.onSubmit).toHaveBeenCalledTimes(1);
	});

	it('prefills every field from the editing entry', () => {
		const entry: IncomeExpenseEntry = {
			id: 5,
			date: '2026-02-01',
			voucher_number: '0001-00000123',
			voucher_type_id: 1,
			voucher_type_name: 'Factura A',
			work_id: 1,
			work_name: 'Obra A',
			party_id: 1,
			party_name: 'Cliente 1',
			category_id: 1,
			category_name: 'Alquiler',
			description: 'Detalle del ingreso',
			net_amount: 1000,
			iva_percent: 21,
			iva_amount: 210,
			total_amount: 1210,
			payment_method_id: 1,
			payment_method_name: 'Efectivo',
			bank_account_id: null,
			bank_account_name: null,
		};
		render(
			<IncomeExpenseFormDialog
				{...baseProps({
					editingEntry: entry,
					date: entry.date,
					voucherNumber: entry.voucher_number ?? '',
					voucherTypeId: String(entry.voucher_type_id),
					workId: String(entry.work_id),
					partyId: String(entry.party_id),
					categoryId: String(entry.category_id),
					description: entry.description ?? '',
					netAmount: '1.000',
					ivaPercent: entry.iva_percent,
					totalAmount: entry.total_amount,
				})}
			/>
		);

		expect(screen.getByText('Editar ingreso')).toBeInTheDocument();
		expect(screen.getByLabelText('Fecha')).toHaveValue('2026-02-01');
		expect(screen.getByLabelText('N° comprobante')).toHaveValue('0001-00000123');
		expect(screen.getByLabelText('Detalle')).toHaveValue('Detalle del ingreso');
		expect(screen.getByLabelText('Neto')).toHaveValue('1.000');
		expect(screen.getByRole('button', { name: 'Actualizar' })).toBeInTheDocument();
	});

	it('shows an inactive category with "(inactivo)" only while editing, keeping it hidden on create', () => {
		const createProps = baseProps({
			categories: [CATEGORY, INACTIVE_CATEGORY],
			activeCategories: [CATEGORY],
		});
		render(<IncomeExpenseFormDialog {...createProps} />);

		expect(screen.queryByText('Vieja categoría (inactivo)')).not.toBeInTheDocument();
	});

	it('keeps the saved inactive category visible with "(inactivo)" when editing that entry', () => {
		const entry = { id: 1, category_id: 2 } as IncomeExpenseEntry;
		render(
			<IncomeExpenseFormDialog
				{...baseProps({
					editingEntry: entry,
					categoryId: '2',
					categories: [CATEGORY, INACTIVE_CATEGORY],
					activeCategories: [CATEGORY],
				})}
			/>
		);

		expect(screen.getByText('Vieja categoría (inactivo)')).toBeInTheDocument();
	});

	it('calls onOpenChange(false) when "Cancelar" is clicked', () => {
		const props = baseProps();
		render(<IncomeExpenseFormDialog {...props} />);

		fireEvent.click(screen.getByText('Cancelar'));

		expect(props.onOpenChange).toHaveBeenCalledWith(false);
	});

	it('disables the submit button and shows "Guardando..." while saving', () => {
		render(<IncomeExpenseFormDialog {...baseProps({ saving: true })} />);

		expect(screen.getByText('Guardando...')).toBeDisabled();
	});
});
