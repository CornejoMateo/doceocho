import { render, screen, fireEvent } from '@testing-library/react';
import { SupplierToggleActiveDialog } from '@/components/business/suppliers/supplier-toggle-active-dialog';
import { SupplierDeleteDialog } from '@/components/business/suppliers/supplier-delete-dialog';

const supplier = {
	id: 1,
	created_at: '',
	name: 'Vidrios SA',
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

describe('SupplierToggleActiveDialog', () => {
	it('shows deactivation texts for an active supplier and confirms', () => {
		const onConfirm = jest.fn();
		render(
			<SupplierToggleActiveDialog
				supplier={supplier}
				loading={false}
				onConfirm={onConfirm}
				onCancel={jest.fn()}
			/>
		);
		expect(screen.getByText('¿Desactivar proveedor?')).toBeInTheDocument();
		expect(screen.getByText(/"Vidrios SA" dejará de aparecer/)).toBeInTheDocument();
		fireEvent.click(screen.getByRole('button', { name: 'Desactivar' }));
		expect(onConfirm).toHaveBeenCalledTimes(1);
	});

	it('shows activation texts for an inactive supplier', () => {
		render(
			<SupplierToggleActiveDialog
				supplier={{ ...supplier, is_active: false }}
				loading={false}
				onConfirm={jest.fn()}
				onCancel={jest.fn()}
			/>
		);
		expect(screen.getByText('¿Activar proveedor?')).toBeInTheDocument();
		expect(screen.getByText(/volverá a aparecer/)).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Activar' })).toBeInTheDocument();
	});

	it('cancels via Cancelar', () => {
		const onCancel = jest.fn();
		render(
			<SupplierToggleActiveDialog
				supplier={supplier}
				loading={false}
				onConfirm={jest.fn()}
				onCancel={onCancel}
			/>
		);
		fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
		expect(onCancel).toHaveBeenCalled();
	});

	it('disables both buttons and blocks Escape while loading', () => {
		const onCancel = jest.fn();
		const onConfirm = jest.fn();
		render(
			<SupplierToggleActiveDialog
				supplier={supplier}
				loading
				onConfirm={onConfirm}
				onCancel={onCancel}
			/>
		);
		expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
		const confirm = screen.getByRole('button', { name: 'Desactivando...' });
		expect(confirm).toBeDisabled();
		fireEvent.click(confirm);
		fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });
		expect(onConfirm).not.toHaveBeenCalled();
		expect(onCancel).not.toHaveBeenCalled();
	});

	it('renders nothing when there is no supplier', () => {
		render(
			<SupplierToggleActiveDialog
				supplier={null}
				loading={false}
				onConfirm={jest.fn()}
				onCancel={jest.fn()}
			/>
		);
		expect(screen.queryByRole('alertdialog')).toBeNull();
	});
});

describe('SupplierDeleteDialog', () => {
	it('shows the supplier name and confirms / cancels', () => {
		const onConfirm = jest.fn();
		const onCancel = jest.fn();
		render(
			<SupplierDeleteDialog
				supplier={supplier}
				loading={false}
				onConfirm={onConfirm}
				onCancel={onCancel}
			/>
		);
		expect(screen.getByText('¿Eliminar proveedor?')).toBeInTheDocument();
		expect(screen.getByText(/"Vidrios SA"/)).toBeInTheDocument();
		fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
		expect(onConfirm).toHaveBeenCalled();
		fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
		expect(onCancel).toHaveBeenCalled();
	});

	it('disables the buttons while loading', () => {
		render(
			<SupplierDeleteDialog
				supplier={supplier}
				loading
				onConfirm={jest.fn()}
				onCancel={jest.fn()}
			/>
		);
		expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
		expect(screen.getByRole('button', { name: 'Eliminando...' })).toBeDisabled();
	});
});
