import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { SuppliersManagement } from '@/components/business/suppliers/suppliers-management';
import { useSuppliers } from '@/hooks/suppliers/use-suppliers';
import { updateSupplier, deleteSupplier } from '@/lib/suppliers/suppliers';
import { useAuth } from '@/components/provider/auth-provider';

const mockToast = jest.fn();

jest.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }));
jest.mock('@/components/provider/auth-provider', () => ({ useAuth: jest.fn() }));
jest.mock('@/hooks/suppliers/use-suppliers', () => ({ useSuppliers: jest.fn() }));
jest.mock('@/lib/suppliers/suppliers', () => ({
	updateSupplier: jest.fn(),
	deleteSupplier: jest.fn(),
	createSupplier: jest.fn(),
}));
jest.mock('@/lib/error-translator', () => ({ translateError: jest.fn(() => '') }));

const mk = (over: Record<string, any>) => ({
	created_at: '',
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
	...over,
});

const suppliers = [
	mk({ id: 1, name: 'Ferretería Ñandú', locality: 'Rosario', category: 'Herrajes' }),
	mk({ id: 2, name: 'Vidrios del Sur', locality: 'Córdoba', tax_id: '30712345678' }),
	mk({ id: 3, name: 'Pinturas Viejas', is_active: false, locality: 'Rosario' }),
];

const refresh = jest.fn();
function mockHook(list = suppliers, extra: Record<string, any> = {}) {
	(useSuppliers as jest.Mock).mockReturnValue({
		suppliers: list,
		loading: false,
		error: null,
		refresh,
		...extra,
	});
}

// Only the desktop table is queried to avoid duplicated mobile cards.
const desktop = () => within(screen.getByTestId('suppliers-desktop'));

describe('SuppliersManagement', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		refresh.mockResolvedValue({ ok: true });
		(useAuth as jest.Mock).mockReturnValue({ user: { role: 'Admin' }, loading: false });
		(updateSupplier as jest.Mock).mockResolvedValue({ data: {}, error: null });
		(deleteSupplier as jest.Mock).mockResolvedValue({ error: null });
		mockHook();
	});

	it('shows a no-permission message and does not fetch for non-admins', () => {
		(useAuth as jest.Mock).mockReturnValue({ user: { role: 'Employee' }, loading: false });
		render(<SuppliersManagement />);
		expect(screen.getByText('No tenés permisos para ver esta sección.')).toBeInTheDocument();
		expect(useSuppliers).toHaveBeenCalledWith(false);
	});

	it('shows no permission message only after auth settles', () => {
		(useAuth as jest.Mock).mockReturnValue({ user: null, loading: true });
		render(<SuppliersManagement />);
		expect(screen.queryByText('No tenés permisos para ver esta sección.')).toBeNull();
	});

	it('lists active suppliers by default', () => {
		render(<SuppliersManagement />);
		expect(useSuppliers).toHaveBeenCalledWith(true);
		expect(desktop().getByText('Ferretería Ñandú')).toBeInTheDocument();
		expect(desktop().getByText('Vidrios del Sur')).toBeInTheDocument();
		expect(desktop().queryByText('Pinturas Viejas')).toBeNull();
	});

	it('shows loading, error and empty states', () => {
		mockHook([], { loading: true });
		const { unmount } = render(<SuppliersManagement />);
		expect(screen.getByText('Cargando proveedores...')).toBeInTheDocument();
		unmount();

		mockHook([], { error: 'No se pudieron cargar los proveedores.' });
		const second = render(<SuppliersManagement />);
		expect(screen.getByText('No se pudieron cargar los proveedores.')).toBeInTheDocument();
		second.unmount();

		mockHook([]);
		render(<SuppliersManagement />);
		expect(screen.getByText('Todavía no hay proveedores registrados')).toBeInTheDocument();
	});

	it('searches ignoring accents and case', () => {
		render(<SuppliersManagement />);
		fireEvent.change(screen.getByPlaceholderText(/Buscar por nombre/), {
			target: { value: 'FERRETERIA nandu' },
		});
		expect(desktop().getByText('Ferretería Ñandú')).toBeInTheDocument();
		expect(desktop().queryByText('Vidrios del Sur')).toBeNull();
	});

	it('matches CUIT digits only with 4 or more digits', () => {
		render(<SuppliersManagement />);
		const box = screen.getByPlaceholderText(/Buscar por nombre/);
		fireEvent.change(box, { target: { value: '30-7123' } });
		expect(desktop().getByText('Vidrios del Sur')).toBeInTheDocument();
		fireEvent.change(box, { target: { value: '307' } });
		expect(
			screen.getByText('No hay proveedores que coincidan con la búsqueda')
		).toBeInTheDocument();
	});

	it('filters by status', async () => {
		render(<SuppliersManagement />);
		fireEvent.click(screen.getAllByRole('combobox')[0]);
		fireEvent.click(await screen.findByRole('option', { name: 'Inactivos' }));
		expect(desktop().getByText('Pinturas Viejas')).toBeInTheDocument();
		expect(desktop().queryByText('Vidrios del Sur')).toBeNull();

		fireEvent.click(screen.getAllByRole('combobox')[0]);
		fireEvent.click(await screen.findByRole('option', { name: 'Todos' }));
		expect(desktop().getByText('Pinturas Viejas')).toBeInTheDocument();
		expect(desktop().getByText('Vidrios del Sur')).toBeInTheDocument();
	});

	it('resets the locality filter when that locality disappears', async () => {
		const { rerender } = render(<SuppliersManagement />);
		fireEvent.click(screen.getAllByRole('combobox')[1]);
		fireEvent.click(await screen.findByRole('option', { name: 'Córdoba' }));
		expect(desktop().queryByText('Ferretería Ñandú')).toBeNull();
		expect(desktop().getByText('Vidrios del Sur')).toBeInTheDocument();

		mockHook([suppliers[0], suppliers[2]]);
		rerender(<SuppliersManagement />);
		expect(desktop().getByText('Ferretería Ñandú')).toBeInTheDocument();
	});

	it('opens the create form from "Nuevo proveedor"', () => {
		render(<SuppliersManagement />);
		fireEvent.click(screen.getByRole('button', { name: /Nuevo proveedor/ }));
		expect(screen.getByRole('heading', { name: 'Nuevo proveedor' })).toBeInTheDocument();
	});

	it('opens the edit form with the supplier data', () => {
		render(<SuppliersManagement />);
		fireEvent.click(screen.getAllByLabelText('Editar Vidrios del Sur')[0]);
		expect(screen.getByRole('heading', { name: 'Editar proveedor' })).toBeInTheDocument();
		expect(screen.getByLabelText(/Nombre comercial/)).toHaveValue('Vidrios del Sur');
	});

	describe('toggle active', () => {
		it('asks for confirmation and only updates after confirming', async () => {
			render(<SuppliersManagement />);
			fireEvent.click(screen.getAllByLabelText('Desactivar Vidrios del Sur')[0]);
			expect(screen.getByText('¿Desactivar proveedor?')).toBeInTheDocument();
			expect(updateSupplier).not.toHaveBeenCalled();

			fireEvent.click(
				within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Desactivar' })
			);
			await waitFor(() => expect(updateSupplier).toHaveBeenCalledWith(2, { is_active: false }));
			await waitFor(() => expect(refresh).toHaveBeenCalled());
			expect(mockToast).toHaveBeenCalledWith(
				expect.objectContaining({ title: 'Proveedor desactivado' })
			);
			await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
		});

		it('does nothing when cancelled', () => {
			render(<SuppliersManagement />);
			fireEvent.click(screen.getAllByLabelText('Desactivar Vidrios del Sur')[0]);
			fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
			expect(updateSupplier).not.toHaveBeenCalled();
		});

		it('keeps the dialog open and shows an error toast on failure', async () => {
			(updateSupplier as jest.Mock).mockResolvedValue({ data: null, error: { message: 'x' } });
			render(<SuppliersManagement />);
			fireEvent.click(screen.getAllByLabelText('Desactivar Vidrios del Sur')[0]);
			fireEvent.click(
				within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Desactivar' })
			);
			await waitFor(() =>
				expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }))
			);
			expect(screen.getByRole('alertdialog')).toBeInTheDocument();
		});
	});

	describe('delete', () => {
		it('asks for confirmation, deletes and reloads', async () => {
			render(<SuppliersManagement />);
			fireEvent.click(screen.getAllByLabelText('Eliminar Vidrios del Sur')[0]);
			expect(deleteSupplier).not.toHaveBeenCalled();
			fireEvent.click(
				within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Eliminar' })
			);
			await waitFor(() => expect(deleteSupplier).toHaveBeenCalledWith(2));
			await waitFor(() => expect(refresh).toHaveBeenCalled());
			expect(mockToast).toHaveBeenCalledWith(
				expect.objectContaining({ title: 'Proveedor eliminado' })
			);
		});

		it('shows an error toast and keeps the dialog open on failure', async () => {
			(deleteSupplier as jest.Mock).mockResolvedValue({
				error: { code: '23503', message: 'foreign key constraint' },
			});
			render(<SuppliersManagement />);
			fireEvent.click(screen.getAllByLabelText('Eliminar Vidrios del Sur')[0]);
			fireEvent.click(
				within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Eliminar' })
			);
			await waitFor(() =>
				expect(mockToast).toHaveBeenCalledWith(
					expect.objectContaining({ title: 'No se pudo eliminar', variant: 'destructive' })
				)
			);
			expect(screen.getByRole('alertdialog')).toBeInTheDocument();
			expect(refresh).not.toHaveBeenCalled();
		});
	});
});
