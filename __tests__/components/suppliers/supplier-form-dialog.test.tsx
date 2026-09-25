import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SupplierFormDialog } from '@/components/business/suppliers/supplier-form-dialog';
import { createSupplier, updateSupplier } from '@/lib/suppliers/suppliers';
import { translateError } from '@/lib/error-translator';

const mockToast = jest.fn();

jest.mock('@/components/ui/use-toast', () => ({
	useToast: () => ({ toast: mockToast }),
}));
jest.mock('@/lib/suppliers/suppliers', () => ({
	createSupplier: jest.fn(),
	updateSupplier: jest.fn(),
}));
jest.mock('@/lib/error-translator', () => ({ translateError: jest.fn() }));

const supplier = {
	id: 7,
	created_at: '2024-01-01',
	name: 'Vidrios SA',
	business_name: 'Vidrios Sociedad Anonima',
	tax_id: '30712345678',
	whatsapp: '5491112345678',
	email: 'v@vidrios.com',
	category: 'Vidrios',
	locality: 'Rosario',
	address: 'Pellegrini 1234',
	payment_terms_days: 30,
	notes: 'nota',
	is_active: false,
};

function setup(props: Partial<React.ComponentProps<typeof SupplierFormDialog>> = {}) {
	const onOpenChange = jest.fn();
	const onSaved = jest.fn().mockResolvedValue(undefined);
	const utils = render(
		<SupplierFormDialog
			open
			supplier={null}
			onOpenChange={onOpenChange}
			onSaved={onSaved}
			{...props}
		/>
	);
	return { ...utils, onOpenChange, onSaved };
}

const type = (label: string | RegExp, value: string) =>
	fireEvent.change(screen.getByLabelText(label), { target: { value } });
const submit = () => fireEvent.submit(document.querySelector('form')!);

describe('SupplierFormDialog', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(createSupplier as jest.Mock).mockResolvedValue({ data: {}, error: null });
		(updateSupplier as jest.Mock).mockResolvedValue({ data: {}, error: null });
		(translateError as jest.Mock).mockReturnValue('');
	});

	describe('create mode', () => {
		it('shows empty fields, the active switch (on by default) and no Estado badge', () => {
			setup();
			expect(screen.getByText('Nuevo proveedor')).toBeInTheDocument();
			expect(screen.getByLabelText(/Nombre comercial/)).toHaveValue('');
			const sw = screen.getByRole('switch');
			expect(sw).toHaveAttribute('aria-checked', 'true');
			expect(screen.queryByText('Para cambiar el estado usá el botón de la lista.')).toBeNull();
		});

		it('shows a toast and does not save when the name is empty', () => {
			setup();
			submit();
			expect(mockToast).toHaveBeenCalledWith(
				expect.objectContaining({ title: 'Datos incompletos', variant: 'destructive' })
			);
			expect(createSupplier).not.toHaveBeenCalled();
		});

		it('rejects a CUIT that does not have 11 digits', () => {
			setup();
			type(/Nombre comercial/, 'X');
			type('CUIT', '30-1234');
			submit();
			expect(mockToast).toHaveBeenCalledWith(
				expect.objectContaining({ description: 'El CUIT debe tener 11 dígitos.' })
			);
			expect(createSupplier).not.toHaveBeenCalled();
		});

		it('creates with trimmed values, null optionals, digits-only CUIT and is_active true', async () => {
			const { onSaved } = setup();
			type(/Nombre comercial/, '  Nuevo Prov  ');
			type('CUIT', '30-71234567-8');
			type(/Condición de pago/, '45');
			submit();
			await waitFor(() => expect(onSaved).toHaveBeenCalled());
			expect(createSupplier).toHaveBeenCalledWith({
				name: 'Nuevo Prov',
				business_name: null,
				tax_id: '30712345678',
				whatsapp: null,
				email: null,
				category: null,
				locality: null,
				address: null,
				payment_terms_days: 45,
				notes: null,
				is_active: true,
			});
			expect(updateSupplier).not.toHaveBeenCalled();
		});

		it('sends payment_terms_days null when empty and is_active false when the switch is off', async () => {
			const { onSaved } = setup();
			type(/Nombre comercial/, 'A');
			fireEvent.click(screen.getByRole('switch'));
			submit();
			await waitFor(() => expect(onSaved).toHaveBeenCalled());
			expect(createSupplier).toHaveBeenCalledWith(
				expect.objectContaining({ payment_terms_days: null, is_active: false })
			);
		});

		it('trims WhatsApp without validating it', async () => {
			const { onSaved } = setup();
			type(/Nombre comercial/, 'A');
			type('WhatsApp', '  5491112345678 ');
			submit();
			await waitFor(() => expect(onSaved).toHaveBeenCalled());
			expect(createSupplier).toHaveBeenCalledWith(
				expect.objectContaining({ whatsapp: '5491112345678' })
			);
		});
	});

	describe('edit mode', () => {
		it('prefills fields (CUIT formatted) and shows a read-only status badge without a switch', () => {
			setup({ supplier });
			expect(screen.getByText('Editar proveedor')).toBeInTheDocument();
			expect(screen.getByLabelText(/Nombre comercial/)).toHaveValue('Vidrios SA');
			expect(screen.getByLabelText('CUIT')).toHaveValue('30-71234567-8');
			expect(screen.getByLabelText(/Condición de pago/)).toHaveValue(30);
			expect(screen.getByText('Inactivo')).toBeInTheDocument();
			expect(
				screen.getByText('Para cambiar el estado usá el botón de la lista.')
			).toBeInTheDocument();
			expect(screen.queryByRole('switch')).toBeNull();
		});

		it('updates without is_active in the payload', async () => {
			const { onSaved } = setup({ supplier });
			type(/Nombre comercial/, 'Otro nombre');
			submit();
			await waitFor(() => expect(onSaved).toHaveBeenCalled());
			expect(updateSupplier).toHaveBeenCalledTimes(1);
			const [id, payload] = (updateSupplier as jest.Mock).mock.calls[0];
			expect(id).toBe(7);
			expect(payload).not.toHaveProperty('is_active');
			expect(payload).toMatchObject({ name: 'Otro nombre', tax_id: '30712345678' });
			expect(createSupplier).not.toHaveBeenCalled();
		});
	});

	describe('errors', () => {
		it('shows the duplicate CUIT toast and does not call onSaved', async () => {
			(createSupplier as jest.Mock).mockResolvedValue({
				data: null,
				error: { message: 'duplicate key ... "suppliers_tax_id_unique_idx"' },
			});
			const { onSaved } = setup();
			type(/Nombre comercial/, 'A');
			submit();
			await waitFor(() =>
				expect(mockToast).toHaveBeenCalledWith(
					expect.objectContaining({
						description: 'Ya existe un proveedor con ese CUIT.',
						variant: 'destructive',
					})
				)
			);
			expect(onSaved).not.toHaveBeenCalled();
		});

		it('uses translateError for other errors, with a fallback', async () => {
			(createSupplier as jest.Mock).mockResolvedValue({ data: null, error: { message: 'x' } });
			(translateError as jest.Mock).mockReturnValueOnce('Error traducido');
			const { onSaved } = setup();
			type(/Nombre comercial/, 'A');
			submit();
			await waitFor(() =>
				expect(mockToast).toHaveBeenCalledWith(
					expect.objectContaining({ description: 'Error traducido' })
				)
			);
			expect(onSaved).not.toHaveBeenCalled();

			mockToast.mockClear();
			(createSupplier as jest.Mock).mockResolvedValue({ data: null, error: { message: 'y' } });
			submit();
			await waitFor(() =>
				expect(mockToast).toHaveBeenCalledWith(
					expect.objectContaining({ description: 'No se pudo guardar el proveedor.' })
				)
			);
		});

		it('handles thrown errors', async () => {
			(createSupplier as jest.Mock).mockRejectedValue(new Error('network'));
			const { onSaved } = setup();
			type(/Nombre comercial/, 'A');
			submit();
			await waitFor(() =>
				expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }))
			);
			expect(onSaved).not.toHaveBeenCalled();
		});
	});

	it('disables the buttons and ignores close while submitting', async () => {
		let resolve: (v: any) => void = () => {};
		(createSupplier as jest.Mock).mockImplementation(() => new Promise((r) => (resolve = r)));
		const { onOpenChange } = setup();
		type(/Nombre comercial/, 'A');
		submit();
		await waitFor(() => expect(screen.getByText('Guardando...')).toBeDisabled());
		expect(screen.getByText('Cancelar')).toBeDisabled();

		fireEvent.keyDown(document.activeElement || document.body, { key: 'Escape' });
		expect(onOpenChange).not.toHaveBeenCalled();

		resolve({ data: {}, error: null });
		await waitFor(() => expect(screen.getByText('Crear')).not.toBeDisabled());
	});

	it('closes through Cancelar when idle', () => {
		const { onOpenChange } = setup();
		fireEvent.click(screen.getByText('Cancelar'));
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it('resets the fields when reopened for create after editing', () => {
		const props = { onOpenChange: jest.fn(), onSaved: jest.fn() };
		const { rerender } = render(<SupplierFormDialog open supplier={supplier} {...props} />);
		expect(screen.getByLabelText(/Nombre comercial/)).toHaveValue('Vidrios SA');

		rerender(<SupplierFormDialog open={false} supplier={null} {...props} />);
		rerender(<SupplierFormDialog open supplier={null} {...props} />);
		expect(screen.getByLabelText(/Nombre comercial/)).toHaveValue('');
		expect(screen.getByLabelText('CUIT')).toHaveValue('');
		expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
	});
});
