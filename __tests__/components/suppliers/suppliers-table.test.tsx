import { render, screen, fireEvent } from '@testing-library/react';
import { SuppliersTable } from '@/components/business/suppliers/suppliers-table';

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

function setup() {
	const handlers = { onEdit: jest.fn(), onToggleActive: jest.fn(), onDelete: jest.fn() };
	render(<SuppliersTable suppliers={[active, inactive]} busy={false} {...handlers} />);
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
			/>
		);
		screen.getAllByLabelText('Editar Vidrios SA').forEach((b) => expect(b).toBeDisabled());
	});
});
