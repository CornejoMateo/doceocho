import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { VoucherTypesConfig } from '@/components/business/cash-flow/voucher-types-config';
import {
	VoucherType,
	listVoucherTypes,
	createVoucherType,
	updateVoucherType,
	deactivateVoucherType,
	reactivateVoucherType,
} from '@/lib/voucher-types/voucher-types';
import { translateError } from '@/lib/error-translator';

const mockToast = jest.fn();

jest.mock('@/components/ui/use-toast', () => ({
	useToast: () => ({ toast: mockToast }),
}));

jest.mock('@/lib/voucher-types/voucher-types', () => ({
	listVoucherTypes: jest.fn(),
	createVoucherType: jest.fn(),
	updateVoucherType: jest.fn(),
	deactivateVoucherType: jest.fn(),
	reactivateVoucherType: jest.fn(),
}));

jest.mock('@/lib/error-translator', () => ({
	translateError: jest.fn(),
}));

const makeType = (over: Partial<VoucherType> = {}): VoucherType => ({
	id: 1,
	created_at: '2026-10-09T00:00:00Z',
	name: 'Factura A',
	is_active: true,
	...over,
});

const ACTIVE_TYPE = makeType({ id: 1, name: 'Factura A' });
const INACTIVE_TYPE = makeType({ id: 2, name: 'Recibo', is_active: false });

const listResult = (data: VoucherType[] | null) => ({ data, error: null });
const dbError = (message: string) => ({ data: null, error: { message } });

const openDialog = () =>
	fireEvent.click(screen.getByRole('button', { name: 'Configurar tipos de comprobante' }));

const alertDialog = () => within(screen.getByRole('alertdialog'));

const nameInput = () => screen.getByLabelText('Nombre');

const submitForm = () => fireEvent.submit(nameInput().closest('form')!);

const openWith = async (types: VoucherType[]) => {
	(listVoucherTypes as jest.Mock).mockResolvedValue(listResult(types));
	render(<VoucherTypesConfig />);
	openDialog();
	await waitFor(() => {
		expect(screen.queryByText('Cargando...')).not.toBeInTheDocument();
	});
};

describe('VoucherTypesConfig', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(listVoucherTypes as jest.Mock).mockResolvedValue(listResult([]));
		(createVoucherType as jest.Mock).mockResolvedValue({ data: ACTIVE_TYPE, error: null });
		(updateVoucherType as jest.Mock).mockResolvedValue({ data: ACTIVE_TYPE, error: null });
		(deactivateVoucherType as jest.Mock).mockResolvedValue({ data: ACTIVE_TYPE, error: null });
		(reactivateVoucherType as jest.Mock).mockResolvedValue({ data: ACTIVE_TYPE, error: null });
		(translateError as jest.Mock).mockReturnValue('');
	});

	it('does not fetch anything before the trigger is clicked', () => {
		render(<VoucherTypesConfig />);

		expect(listVoucherTypes).not.toHaveBeenCalled();
		expect(screen.queryByText('Tipos de comprobante')).not.toBeInTheDocument();
	});

	it('fetches and renders a row per voucher type when opened', async () => {
		await openWith([ACTIVE_TYPE]);

		expect(listVoucherTypes).toHaveBeenCalledTimes(1);
		expect(screen.getByText('Factura A')).toBeInTheDocument();
	});

	it('shows the empty state when the list is empty', async () => {
		await openWith([]);

		expect(screen.getByText('No hay tipos de comprobante registrados')).toBeInTheDocument();
	});

	it('hides inactive voucher types by default and reveals them with the switch', async () => {
		await openWith([ACTIVE_TYPE, INACTIVE_TYPE]);

		expect(screen.queryByText('Recibo')).not.toBeInTheDocument();

		fireEvent.click(screen.getByRole('switch'));

		expect(screen.getByText('Recibo')).toBeInTheDocument();
		expect(screen.getByText('Inactivo')).toBeInTheDocument();
	});

	it('rejects a whitespace-only name without calling createVoucherType', async () => {
		await openWith([]);
		fireEvent.click(screen.getByText('Nuevo tipo de comprobante'));
		fireEvent.change(nameInput(), { target: { value: '   ' } });

		submitForm();

		expect(createVoucherType).not.toHaveBeenCalled();
	});

	it('creates with the trimmed name, shows a success toast and re-fetches', async () => {
		await openWith([]);
		fireEvent.click(screen.getByText('Nuevo tipo de comprobante'));
		fireEvent.change(nameInput(), { target: { value: '  Nota de crédito  ' } });

		submitForm();

		await waitFor(() => {
			expect(createVoucherType).toHaveBeenCalledWith({ name: 'Nota de crédito' });
		});
		expect(mockToast).toHaveBeenCalledWith(
			expect.objectContaining({ title: 'Tipo de comprobante creado' })
		);
		await waitFor(() => {
			expect(listVoucherTypes).toHaveBeenCalledTimes(2);
		});
	});

	it('prefills the name and updates by id when editing', async () => {
		await openWith([ACTIVE_TYPE]);
		fireEvent.click(screen.getByRole('button', { name: 'Editar' }));

		expect(nameInput()).toHaveValue('Factura A');
		fireEvent.change(nameInput(), { target: { value: 'Factura A modificada' } });

		submitForm();

		await waitFor(() => {
			expect(updateVoucherType).toHaveBeenCalledWith(1, { name: 'Factura A modificada' });
		});
		expect(createVoucherType).not.toHaveBeenCalled();
	});

	it('asks for confirmation before deactivating, then calls deactivateVoucherType', async () => {
		await openWith([ACTIVE_TYPE]);

		fireEvent.click(screen.getByRole('button', { name: 'Desactivar' }));

		expect(alertDialog().getByText('¿Desactivar tipo de comprobante?')).toBeInTheDocument();
		expect(deactivateVoucherType).not.toHaveBeenCalled();

		fireEvent.click(alertDialog().getByText('Desactivar'));

		await waitFor(() => {
			expect(deactivateVoucherType).toHaveBeenCalledWith(1);
		});
		expect(mockToast).toHaveBeenCalledWith(
			expect.objectContaining({ title: 'Tipo de comprobante desactivado' })
		);
	});

	it('does not deactivate when the confirmation is cancelled', async () => {
		await openWith([ACTIVE_TYPE]);
		fireEvent.click(screen.getByRole('button', { name: 'Desactivar' }));

		fireEvent.click(alertDialog().getByText('Cancelar'));

		expect(deactivateVoucherType).not.toHaveBeenCalled();
	});

	it('reactivates a visible inactive row directly, with a success toast', async () => {
		await openWith([ACTIVE_TYPE, INACTIVE_TYPE]);
		fireEvent.click(screen.getByRole('switch'));

		fireEvent.click(screen.getByRole('button', { name: 'Reactivar' }));

		await waitFor(() => {
			expect(reactivateVoucherType).toHaveBeenCalledWith(2);
		});
		expect(mockToast).toHaveBeenCalledWith(
			expect.objectContaining({ title: 'Tipo de comprobante reactivado' })
		);
	});

	it('shows a destructive toast with the fallback message when the load fails', async () => {
		(listVoucherTypes as jest.Mock).mockResolvedValue(dbError('db error'));
		render(<VoucherTypesConfig />);

		openDialog();

		await waitFor(() => {
			expect(mockToast).toHaveBeenCalledWith({
				title: 'Error',
				description: 'No se pudieron cargar los tipos de comprobante.',
				variant: 'destructive',
			});
		});
	});
});
