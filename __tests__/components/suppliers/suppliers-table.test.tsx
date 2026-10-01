import { render, screen, fireEvent } from '@testing-library/react';
import { SuppliersTable } from '@/components/business/suppliers/suppliers-table';
import { formatCurrency } from '@/utils/formats-money';
import type { SupplierAccountSummary } from '@/lib/suppliers/account-summary';

// getByText compares against the normalized (nbsp-collapsed) DOM text, so the expectation must match.
const money = (amount: number) => formatCurrency(amount).replace(/\u00a0/g, ' ');

const base = {
	created_at: '2024-01-01',
	business_name: null,
	tax_id: null,
	whatsapp: null,
	email: null,
	category: null,
	locality: null,
	address: null,
	payment_terms_days: null,
	notes: null,
	is_active: true,
};

const active = {
	...base,
	id: 1,
	name: 'Vidrios SA',
	business_name: 'Vidrios Sociedad Anonima',
	tax_id: '30712345678',
	whatsapp: '5491112345678',
	email: 'ok@vidrios.com',
	category: 'Vidrios',
	payment_terms_days: 30,
};
const inactive = {
	...base,
	id: 2,
	name: 'Herrajes',
	email: 'bad email@x',
	is_active: false,
	payment_terms_days: 0,
};

const withAddress = {
	...base,
	id: 3,
	name: 'Maderas del Sur',
	address: 'Av. Siempre Viva 742',
	locality: 'Springfield',
};

const summary = (overrides: Partial<SupplierAccountSummary>): SupplierAccountSummary => ({
	supplier_id: 1,
	supplier_name: 'Vidrios SA',
	totalPurchasesArs: 0,
	totalPaymentsArs: 0,
	balanceArs: 0,
	...overrides,
});

// Default: no balances data, not loading, no error (column renders "—" for every supplier).
const defaultBalanceProps = {
	balances: new Map<number, SupplierAccountSummary>(),
	balancesLoading: false,
	balancesError: false,
};

function setup(balanceProps: Partial<typeof defaultBalanceProps> = {}) {
	const handlers = {
		onEdit: jest.fn(),
		onToggleActive: jest.fn(),
		onDelete: jest.fn(),
		onSupplierClick: jest.fn(),
	};
	render(
		<SuppliersTable
			suppliers={[active, inactive]}
			busy={false}
			{...handlers}
			{...defaultBalanceProps}
			{...balanceProps}
		/>
	);
	return handlers;
}

// The component renders both the desktop table and the mobile cards.
describe('SuppliersTable', () => {
	it('renders supplier data: name, business name, formatted CUIT, terms and status', () => {
		setup();
		expect(screen.getAllByText('Vidrios SA').length).toBeGreaterThan(0);
		expect(screen.getAllByText('Vidrios Sociedad Anonima').length).toBeGreaterThan(0);
		expect(screen.getAllByText('30-71234567-8').length).toBeGreaterThan(0);
		expect(screen.getAllByText('30 días').length).toBeGreaterThan(0);
		expect(screen.getAllByText('Contado').length).toBeGreaterThan(0);
		expect(screen.getAllByText('Activo').length).toBeGreaterThan(0);
		expect(screen.getAllByText('Inactivo').length).toBeGreaterThan(0);
	});

	it('renders a wa.me link for the WhatsApp number', () => {
		setup();
		const links = document.querySelectorAll('a[href="https://wa.me/5491112345678"]');
		expect(links.length).toBeGreaterThan(0);
	});

	it('renders mailto only for valid emails and plain text for invalid ones', () => {
		setup();
		expect(document.querySelectorAll('a[href="mailto:ok@vidrios.com"]').length).toBeGreaterThan(0);
		expect(screen.getAllByText('bad email@x').length).toBeGreaterThan(0);
		expect(document.querySelector('a[href^="mailto:bad"]')).toBeNull();
	});

	it('includes the supplier name in the action aria-labels', () => {
		setup();
		expect(screen.getAllByLabelText('Editar Vidrios SA').length).toBeGreaterThan(0);
		expect(screen.getAllByLabelText('Desactivar Vidrios SA').length).toBeGreaterThan(0);
		expect(screen.getAllByLabelText('Activar Herrajes').length).toBeGreaterThan(0);
		expect(screen.getAllByLabelText('Eliminar Herrajes').length).toBeGreaterThan(0);
	});

	it('calls the handlers with the supplier', () => {
		const h = setup();
		fireEvent.click(screen.getAllByLabelText('Editar Vidrios SA')[0]);
		expect(h.onEdit).toHaveBeenCalledWith(active);
		fireEvent.click(screen.getAllByLabelText('Activar Herrajes')[0]);
		expect(h.onToggleActive).toHaveBeenCalledWith(inactive);
		fireEvent.click(screen.getAllByLabelText('Eliminar Vidrios SA')[0]);
		expect(h.onDelete).toHaveBeenCalledWith(active);
	});

	it('disables actions while busy', () => {
		render(
			<SuppliersTable
				suppliers={[active]}
				busy
				onEdit={jest.fn()}
				onToggleActive={jest.fn()}
				onDelete={jest.fn()}
				onSupplierClick={jest.fn()}
				{...defaultBalanceProps}
			/>
		);
		screen.getAllByLabelText('Editar Vidrios SA').forEach((b) => expect(b).toBeDisabled());
	});

	it('calls onSupplierClick when a row is clicked, without triggering row actions', () => {
		const h = setup();
		fireEvent.click(screen.getAllByText('Vidrios SA')[0]);
		expect(h.onSupplierClick).toHaveBeenCalledWith(active);
		expect(h.onEdit).not.toHaveBeenCalled();
	});

	it('does not call onSupplierClick when a row action button is clicked', () => {
		const h = setup();
		fireEvent.click(screen.getAllByLabelText('Editar Vidrios SA')[0]);
		expect(h.onEdit).toHaveBeenCalledWith(active);
		expect(h.onSupplierClick).not.toHaveBeenCalled();
	});

	it('does not call onSupplierClick when the WhatsApp link is clicked', () => {
		const h = setup();
		const link = document.querySelector('a[href="https://wa.me/5491112345678"]')!;
		fireEvent.click(link);
		expect(h.onSupplierClick).not.toHaveBeenCalled();
	});

	it('does not call onSupplierClick when the email link is clicked', () => {
		const h = setup();
		const link = document.querySelector('a[href="mailto:ok@vidrios.com"]')!;
		fireEvent.click(link);
		expect(h.onSupplierClick).not.toHaveBeenCalled();
	});

	it('does not call onSupplierClick when the address link is clicked', () => {
		const handlers = {
			onEdit: jest.fn(),
			onToggleActive: jest.fn(),
			onDelete: jest.fn(),
			onSupplierClick: jest.fn(),
		};
		render(
			<SuppliersTable
				suppliers={[withAddress]}
				busy={false}
				{...handlers}
				{...defaultBalanceProps}
			/>
		);

		const link = screen.getAllByText('Av. Siempre Viva 742, Springfield')[0].closest('a')!;
		fireEvent.click(link);

		expect(handlers.onSupplierClick).not.toHaveBeenCalled();
	});

	it('activates onSupplierClick on Enter/Space when the row itself is focused', () => {
		const h = setup();
		const row = screen.getAllByText('Vidrios SA')[0].closest('[role="button"]')!;
		fireEvent.keyDown(row, { key: 'Enter' });
		expect(h.onSupplierClick).toHaveBeenCalledWith(active);

		h.onSupplierClick.mockClear();
		fireEvent.keyDown(row, { key: ' ' });
		expect(h.onSupplierClick).toHaveBeenCalledWith(active);
	});

	it('ignores a keydown bubbling up from an inner action button', () => {
		const h = setup();
		const editButton = screen.getAllByLabelText('Editar Vidrios SA')[0];
		fireEvent.keyDown(editButton, { key: 'Enter' });
		expect(h.onSupplierClick).not.toHaveBeenCalled();
	});

	describe('cuenta corriente column', () => {
		it('renders the column header', () => {
			setup();
			expect(screen.getAllByText('Cuenta corriente').length).toBeGreaterThan(0);
		});

		it('shows "Debemos" with the formatted balance when we owe the supplier', () => {
			setup({
				balances: new Map([[1, summary({ supplier_id: 1, balanceArs: 1500 })]]),
			});
			expect(screen.getAllByText(`Debemos ${money(1500)}`).length).toBeGreaterThan(0);
		});

		it('shows "Al día" when the balance is exactly zero', () => {
			setup({
				balances: new Map([[1, summary({ supplier_id: 1, balanceArs: 0 })]]),
			});
			expect(screen.getAllByText('Al día').length).toBeGreaterThan(0);
		});

		it('treats a floating point epsilon balance as zero, showing "Al día" instead of "Debemos"', () => {
			const epsilonBalance = 0.3 - (0.1 + 0.1 + 0.1);
			setup({
				balances: new Map([[1, summary({ supplier_id: 1, balanceArs: epsilonBalance })]]),
			});
			expect(screen.queryAllByText(/^Debemos/).length).toBe(0);
			expect(screen.getAllByText('Al día').length).toBeGreaterThan(0);
		});

		it('shows "A favor" with the absolute formatted balance when we overpaid', () => {
			setup({
				balances: new Map([[1, summary({ supplier_id: 1, balanceArs: -800 })]]),
			});
			expect(screen.getAllByText(`A favor ${money(800)}`).length).toBeGreaterThan(0);
		});

		it('shows a loading placeholder while balances are loading', () => {
			setup({ balancesLoading: true });
			expect(screen.queryAllByText(/^Debemos/).length).toBe(0);
			expect(screen.queryAllByText('Al día').length).toBe(0);
			expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
		});

		it('shows "—" when the balances fetch failed', () => {
			setup({ balancesError: true, balances: new Map([[1, summary({ supplier_id: 1 })]]) });
			expect(screen.getAllByText('—').length).toBeGreaterThan(0);
		});

		it('shows "—" when a supplier has no balance entry', () => {
			setup();
			expect(screen.getAllByText('—').length).toBeGreaterThan(0);
		});
	});
});
