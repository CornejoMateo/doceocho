import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { PaymentMethodsConfig } from '@/components/business/cash-flow/payment-methods-config';
import {
	PaymentMethod,
	listPaymentMethods,
	createPaymentMethod,
	updatePaymentMethod,
} from '@/lib/payment-methods/payment-methods';
import { translateError } from '@/lib/error-translator';

const mockToast = jest.fn();

jest.mock('@/components/ui/use-toast', () => ({
	useToast: () => ({ toast: mockToast }),
}));

jest.mock('@/lib/payment-methods/payment-methods', () => ({
	listPaymentMethods: jest.fn(),
	createPaymentMethod: jest.fn(),
	updatePaymentMethod: jest.fn(),
}));

jest.mock('@/lib/error-translator', () => ({
	translateError: jest.fn(),
}));

const makeMethod = (over: Partial<PaymentMethod> = {}): PaymentMethod => ({
	id: 1,
	created_at: '2026-09-28T00:00:00Z',
	name: 'Efectivo',
	is_active: true,
	...over,
});

const ACTIVE_METHOD = makeMethod({ id: 1, name: 'Efectivo' });
const INACTIVE_METHOD = makeMethod({ id: 2, name: 'Cheque', is_active: false });

const listResult = (data: PaymentMethod[] | null) => ({ data, error: null });
const dbError = (message: string) => ({ data: null, error: { message } });

function renderConfig() {
	return render(<PaymentMethodsConfig />);
}

const openDialog = () =>
	fireEvent.click(screen.getByRole('button', { name: 'Configurar métodos de pago' }));

const closeDialog = () => fireEvent.click(screen.getByText('Close'));

const alertDialog = () => within(screen.getByRole('alertdialog'));

const nameInput = () => screen.getByLabelText('Nombre');

const submitForm = () => fireEvent.submit(nameInput().closest('form')!);

const openWith = async (methods: PaymentMethod[]) => {
	(listPaymentMethods as jest.Mock).mockResolvedValue(listResult(methods));
	renderConfig();
	openDialog();
	await waitFor(() => {
		expect(screen.queryByText('Cargando...')).not.toBeInTheDocument();
	});
};

const goToCreateForm = async () => {
	await openWith([ACTIVE_METHOD]);
	fireEvent.click(screen.getByText('Nuevo'));
};

describe('PaymentMethodsConfig', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(listPaymentMethods as jest.Mock).mockResolvedValue(listResult([]));
		(createPaymentMethod as jest.Mock).mockResolvedValue({ data: ACTIVE_METHOD, error: null });
		(updatePaymentMethod as jest.Mock).mockResolvedValue({ data: ACTIVE_METHOD, error: null });
		(translateError as jest.Mock).mockReturnValue('');
	});

	describe('loading and open lifecycle', () => {
		it('does not fetch anything and renders no dialog content before the trigger is clicked', () => {
			renderConfig();

			expect(listPaymentMethods).not.toHaveBeenCalled();
			expect(screen.queryByText('Métodos de pago')).not.toBeInTheDocument();
		});

		it('fetches once and renders a row per method when the dialog is opened', async () => {
			await openWith([ACTIVE_METHOD]);

			expect(listPaymentMethods).toHaveBeenCalledTimes(1);
			expect(screen.getByText('Efectivo')).toBeInTheDocument();
		});

		it('shows "Cargando..." while the list request is pending', async () => {
			let resolveLoad: (value: { data: PaymentMethod[] | null; error: null }) => void = () => {};
			(listPaymentMethods as jest.Mock).mockReturnValue(
				new Promise((resolve) => {
					resolveLoad = resolve;
				})
			);
			renderConfig();

			openDialog();

			expect(await screen.findByText('Cargando...')).toBeInTheDocument();

			resolveLoad(listResult([ACTIVE_METHOD]));

			await waitFor(() => {
				expect(screen.getByText('Efectivo')).toBeInTheDocument();
			});
			expect(screen.queryByText('Cargando...')).not.toBeInTheDocument();
		});

		it('shows the empty state when the request resolves with an empty list', async () => {
			await openWith([]);

			expect(screen.getByText('No hay métodos de pago registrados')).toBeInTheDocument();
		});

		it('falls back to an empty list when the request resolves with null data and no error', async () => {
			(listPaymentMethods as jest.Mock).mockResolvedValue(listResult(null));
			renderConfig();

			openDialog();

			expect(await screen.findByText('No hay métodos de pago registrados')).toBeInTheDocument();
		});

		it('re-fetches on every open', async () => {
			await openWith([ACTIVE_METHOD]);
			expect(listPaymentMethods).toHaveBeenCalledTimes(1);

			closeDialog();
			await waitFor(() => {
				expect(screen.queryByText('Métodos de pago')).not.toBeInTheDocument();
			});

			openDialog();
			await waitFor(() => {
				expect(listPaymentMethods).toHaveBeenCalledTimes(2);
			});
		});

		it('shows a destructive toast with the hardcoded fallback when the load fails and translateError returns nothing', async () => {
			(listPaymentMethods as jest.Mock).mockResolvedValue(dbError('db error'));
			renderConfig();

			openDialog();

			await waitFor(() => {
				expect(mockToast).toHaveBeenCalledWith({
					title: 'Error',
					description: 'No se pudieron cargar los métodos de pago.',
					variant: 'destructive',
				});
			});
		});

		it('prefers the translated message over the fallback when the load fails', async () => {
			(listPaymentMethods as jest.Mock).mockResolvedValue(dbError('db error'));
			(translateError as jest.Mock).mockReturnValue('Error traducido');
			renderConfig();

			openDialog();

			await waitFor(() => {
				expect(mockToast).toHaveBeenCalledWith(
					expect.objectContaining({ title: 'Error', description: 'Error traducido' })
				);
			});
		});
	});

	describe('list rendering and active filter', () => {
		it('renders the active row with the "Activo" badge and hides the inactive one by default', async () => {
			await openWith([ACTIVE_METHOD, INACTIVE_METHOD]);

			expect(screen.getByText('Efectivo')).toBeInTheDocument();
			expect(screen.getByText('Activo')).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Desactivar' })).toBeInTheDocument();
			expect(screen.queryByText('Cheque')).not.toBeInTheDocument();
		});

		it('reveals inactive rows with the "Inactivo" badge and a "Reactivar" button when the switch is toggled', async () => {
			await openWith([ACTIVE_METHOD, INACTIVE_METHOD]);

			fireEvent.click(screen.getByRole('switch'));

			expect(screen.getByText('Cheque')).toBeInTheDocument();
			expect(screen.getByText('Inactivo')).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Reactivar' })).toBeInTheDocument();
		});

		it('hides inactive rows again when the switch is toggled back', async () => {
			await openWith([ACTIVE_METHOD, INACTIVE_METHOD]);
			fireEvent.click(screen.getByRole('switch'));

			fireEvent.click(screen.getByRole('switch'));

			expect(screen.queryByText('Cheque')).not.toBeInTheDocument();
			expect(screen.getByText('Efectivo')).toBeInTheDocument();
		});

		it('renders the table headers', async () => {
			await openWith([ACTIVE_METHOD]);

			expect(screen.getByText('Nombre')).toBeInTheDocument();
			expect(screen.getByText('Estado')).toBeInTheDocument();
			expect(screen.getByText('Acciones')).toBeInTheDocument();
		});
	});

	describe('create flow', () => {
		it('switches to an empty form when "Nuevo" is clicked', async () => {
			await goToCreateForm();

			expect(screen.getByText('Nuevo método')).toBeInTheDocument();
			expect(screen.queryByText('Métodos de pago')).not.toBeInTheDocument();
			expect(nameInput()).toHaveValue('');
			expect(nameInput()).toHaveAttribute('placeholder', 'Ej: Transferencia Bancaria');
			expect(screen.getByRole('button', { name: 'Crear' })).toBeInTheDocument();
		});

		it('creates with the trimmed name and an explicit is_active true', async () => {
			await goToCreateForm();
			fireEvent.change(nameInput(), { target: { value: '  Transferencia Bancaria  ' } });

			submitForm();

			await waitFor(() => {
				expect(createPaymentMethod).toHaveBeenCalledWith({
					name: 'Transferencia Bancaria',
					is_active: true,
				});
			});
			expect(updatePaymentMethod).not.toHaveBeenCalled();
		});

		it('shows the success toast, returns to the list and re-fetches after creating', async () => {
			await goToCreateForm();
			fireEvent.change(nameInput(), { target: { value: 'Efectivo' } });

			submitForm();

			await waitFor(() => {
				expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Método creado' }));
			});
			expect(screen.getByText('Métodos de pago')).toBeInTheDocument();
			expect(screen.queryByText('Nuevo método')).not.toBeInTheDocument();
			await waitFor(() => {
				expect(listPaymentMethods).toHaveBeenCalledTimes(2);
			});
		});

		it('rejects a whitespace-only name without calling the lib', async () => {
			await goToCreateForm();
			fireEvent.change(nameInput(), { target: { value: '   ' } });

			submitForm();

			expect(mockToast).toHaveBeenCalledWith({
				title: 'Datos incompletos',
				description: 'Completa el nombre del método de pago.',
				variant: 'destructive',
			});
			expect(createPaymentMethod).not.toHaveBeenCalled();
			expect(screen.getByText('Nuevo método')).toBeInTheDocument();
		});

		it('shows "Guardando..." and disables the submit button while the create request is pending', async () => {
			let resolveCreate: (value: { data: PaymentMethod | null; error: null }) => void = () => {};
			(createPaymentMethod as jest.Mock).mockReturnValue(
				new Promise((resolve) => {
					resolveCreate = resolve;
				})
			);
			await goToCreateForm();
			fireEvent.change(nameInput(), { target: { value: 'Efectivo' } });

			submitForm();

			expect(await screen.findByText('Guardando...')).toBeDisabled();

			resolveCreate({ data: ACTIVE_METHOD, error: null });

			await waitFor(() => {
				expect(screen.queryByText('Guardando...')).not.toBeInTheDocument();
			});
		});

		it('calls createPaymentMethod once when two submit events fire in the same tick', async () => {
			await goToCreateForm();
			fireEvent.change(nameInput(), { target: { value: 'Efectivo' } });

			const form = nameInput().closest('form')!;
			fireEvent.submit(form);
			fireEvent.submit(form);

			await waitFor(() => {
				expect(createPaymentMethod).toHaveBeenCalledTimes(1);
			});
		});

		it('shows a destructive toast with the fallback message and stays on the form when creating fails', async () => {
			(createPaymentMethod as jest.Mock).mockResolvedValue(dbError('db error'));
			await goToCreateForm();
			fireEvent.change(nameInput(), { target: { value: 'Efectivo' } });

			submitForm();

			await waitFor(() => {
				expect(mockToast).toHaveBeenCalledWith({
					title: 'Error',
					description: 'No se pudo guardar el método de pago.',
					variant: 'destructive',
				});
			});
			expect(screen.getByText('Nuevo método')).toBeInTheDocument();
		});

		it('uses the translated message when translateError returns one on create failure', async () => {
			(createPaymentMethod as jest.Mock).mockResolvedValue(dbError('db error'));
			(translateError as jest.Mock).mockReturnValue('Error traducido');
			await goToCreateForm();
			fireEvent.change(nameInput(), { target: { value: 'Efectivo' } });

			submitForm();

			await waitFor(() => {
				expect(mockToast).toHaveBeenCalledWith(
					expect.objectContaining({ title: 'Error', description: 'Error traducido' })
				);
			});
		});
	});

	describe('edit flow', () => {
		it('prefills the name and switches the submit label when "Editar" is clicked', async () => {
			await openWith([ACTIVE_METHOD]);

			fireEvent.click(screen.getByRole('button', { name: 'Editar' }));

			expect(screen.getByText('Editar método')).toBeInTheDocument();
			expect(nameInput()).toHaveValue('Efectivo');
			expect(screen.getByRole('button', { name: 'Actualizar' })).toBeInTheDocument();
		});

		it('updates by id with the trimmed name only, without is_active', async () => {
			await openWith([ACTIVE_METHOD]);
			fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
			fireEvent.change(nameInput(), { target: { value: '  Efectivo ARS  ' } });

			submitForm();

			await waitFor(() => {
				expect(updatePaymentMethod).toHaveBeenCalledWith(1, { name: 'Efectivo ARS' });
			});
			const [, payload] = (updatePaymentMethod as jest.Mock).mock.calls[0];
			expect(payload).not.toHaveProperty('is_active');
			expect(createPaymentMethod).not.toHaveBeenCalled();
		});

		it('shows the success toast, returns to the list and re-fetches after updating', async () => {
			await openWith([ACTIVE_METHOD]);
			fireEvent.click(screen.getByRole('button', { name: 'Editar' }));

			submitForm();

			await waitFor(() => {
				expect(mockToast).toHaveBeenCalledWith(
					expect.objectContaining({ title: 'Método actualizado' })
				);
			});
			expect(screen.getByText('Métodos de pago')).toBeInTheDocument();
			expect(screen.queryByText('Editar método')).not.toBeInTheDocument();
			await waitFor(() => {
				expect(listPaymentMethods).toHaveBeenCalledTimes(2);
			});
		});

		it('returns to the list on "Cancelar" without calling any lib function or toasting', async () => {
			await openWith([ACTIVE_METHOD]);
			fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
			fireEvent.change(nameInput(), { target: { value: 'Efectivo ARS' } });

			fireEvent.click(screen.getByText('Cancelar'));

			expect(screen.getByText('Métodos de pago')).toBeInTheDocument();
			expect(updatePaymentMethod).not.toHaveBeenCalled();
			expect(createPaymentMethod).not.toHaveBeenCalled();
			expect(mockToast).not.toHaveBeenCalled();
		});
	});

	describe('deactivate flow', () => {
		it('opens the confirmation dialog without deactivating when the row action is clicked', async () => {
			await openWith([ACTIVE_METHOD]);

			fireEvent.click(screen.getByRole('button', { name: 'Desactivar' }));

			expect(alertDialog().getByText('¿Desactivar método de pago?')).toBeInTheDocument();
			expect(updatePaymentMethod).not.toHaveBeenCalled();
		});

		it('does not deactivate when the confirmation is cancelled', async () => {
			await openWith([ACTIVE_METHOD]);
			fireEvent.click(screen.getByRole('button', { name: 'Desactivar' }));

			fireEvent.click(alertDialog().getByText('Cancelar'));

			expect(updatePaymentMethod).not.toHaveBeenCalled();
			await waitFor(() => {
				expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
			});
		});

		it('deactivates the method, shows a success toast and re-fetches on confirm', async () => {
			await openWith([ACTIVE_METHOD]);
			fireEvent.click(screen.getByRole('button', { name: 'Desactivar' }));

			fireEvent.click(alertDialog().getByText('Desactivar'));

			await waitFor(() => {
				expect(updatePaymentMethod).toHaveBeenCalledWith(1, { is_active: false });
			});
			expect(mockToast).toHaveBeenCalledWith(
				expect.objectContaining({ title: 'Método desactivado' })
			);
			await waitFor(() => {
				expect(listPaymentMethods).toHaveBeenCalledTimes(2);
			});
			await waitFor(() => {
				expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
			});
		});

		it('shows a destructive toast with the fallback message when deactivation fails', async () => {
			(updatePaymentMethod as jest.Mock).mockResolvedValue(dbError('db error'));
			await openWith([ACTIVE_METHOD]);
			fireEvent.click(screen.getByRole('button', { name: 'Desactivar' }));

			fireEvent.click(alertDialog().getByText('Desactivar'));

			await waitFor(() => {
				expect(mockToast).toHaveBeenCalledWith({
					title: 'Error',
					description: 'No se pudo desactivar el método de pago.',
					variant: 'destructive',
				});
			});
			expect(updatePaymentMethod).toHaveBeenCalledTimes(1);
		});

		it('shows "Desactivando..." and disables the action while the request is pending', async () => {
			let resolveUpdate: (value: { data: PaymentMethod | null; error: null }) => void = () => {};
			(updatePaymentMethod as jest.Mock).mockReturnValue(
				new Promise((resolve) => {
					resolveUpdate = resolve;
				})
			);
			await openWith([ACTIVE_METHOD]);
			fireEvent.click(screen.getByRole('button', { name: 'Desactivar' }));

			fireEvent.click(alertDialog().getByText('Desactivar'));

			expect(await alertDialog().getByText('Desactivando...')).toBeDisabled();

			resolveUpdate({ data: ACTIVE_METHOD, error: null });

			await waitFor(() => {
				expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
			});
		});
	});

	describe('reactivate flow', () => {
		it('disables "Nuevo" while a reactivate request is pending', async () => {
			let resolveUpdate: (value: { data: PaymentMethod | null; error: null }) => void = () => {};
			(updatePaymentMethod as jest.Mock).mockReturnValue(
				new Promise((resolve) => {
					resolveUpdate = resolve;
				})
			);
			await openWith([ACTIVE_METHOD, INACTIVE_METHOD]);
			fireEvent.click(screen.getByRole('switch'));

			fireEvent.click(screen.getByRole('button', { name: 'Reactivar' }));

			expect(screen.getByText('Nuevo')).toBeDisabled();

			resolveUpdate({ data: ACTIVE_METHOD, error: null });

			await waitFor(() => {
				expect(screen.getByText('Nuevo')).not.toBeDisabled();
			});
		});

		it('reactivates a visible inactive row directly, with a success toast and a re-fetch', async () => {
			await openWith([ACTIVE_METHOD, INACTIVE_METHOD]);
			fireEvent.click(screen.getByRole('switch'));

			fireEvent.click(screen.getByRole('button', { name: 'Reactivar' }));

			await waitFor(() => {
				expect(updatePaymentMethod).toHaveBeenCalledWith(2, { is_active: true });
			});
			expect(mockToast).toHaveBeenCalledWith(
				expect.objectContaining({ title: 'Método reactivado' })
			);
			await waitFor(() => {
				expect(listPaymentMethods).toHaveBeenCalledTimes(2);
			});
		});

		it('shows a destructive toast with the fallback message when reactivation fails', async () => {
			(updatePaymentMethod as jest.Mock).mockResolvedValue(dbError('db error'));
			await openWith([ACTIVE_METHOD, INACTIVE_METHOD]);
			fireEvent.click(screen.getByRole('switch'));

			fireEvent.click(screen.getByRole('button', { name: 'Reactivar' }));

			await waitFor(() => {
				expect(mockToast).toHaveBeenCalledWith({
					title: 'Error',
					description: 'No se pudo reactivar el método de pago.',
					variant: 'destructive',
				});
			});
		});
	});
});
