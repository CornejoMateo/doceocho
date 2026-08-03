import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BankAccountForm } from '@/components/business/cash-flow/bank-account-form';
import { createBankAccount, updateBankAccount } from '@/lib/cash-flow/cash-flow';
import { translateError } from '@/lib/error-translator';

const mockToast = jest.fn();

jest.mock('@/components/ui/use-toast', () => ({
	useToast: () => ({ toast: mockToast }),
}));

jest.mock('@/lib/cash-flow/cash-flow', () => ({
	createBankAccount: jest.fn(),
	updateBankAccount: jest.fn(),
}));

jest.mock('@/lib/error-translator', () => ({
	translateError: jest.fn(),
}));

jest.mock('@/constants/cashflow/cashflow', () => ({
	ACCOUNT_TYPES: [
		{ value: 'checking', label: 'Cuenta Corriente' },
		{ value: 'savings', label: 'Caja de Ahorro' },
	],
}));

const mockAccount = {
	id: 1,
	name: 'Cuenta Principal',
	bank: 'Santander',
	account_number: '123-456',
	account_type: 'checking',
	is_active: true,
};

function fillRequiredFields() {
	fireEvent.change(screen.getByLabelText('Nombre de la Cuenta'), {
		target: { value: 'Cuenta Nueva' },
	});
	fireEvent.change(screen.getByLabelText('Banco'), {
		target: { value: 'Banco Galicia' },
	});
	fireEvent.change(screen.getByLabelText('Número de Cuenta'), {
		target: { value: '1111-2222' },
	});
	fireEvent.click(screen.getByText('Selecciona el tipo'));
	fireEvent.click(screen.getByRole('option', { name: 'Cuenta Corriente' }));
}

describe('BankAccountForm', () => {
	const onSave = jest.fn().mockResolvedValue(undefined);
	const onCancel = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		(createBankAccount as jest.Mock).mockResolvedValue({ data: mockAccount, error: null });
		(updateBankAccount as jest.Mock).mockResolvedValue({ data: mockAccount, error: null });
	});

	it('renders empty fields and "Crear" button in create mode', () => {
		render(<BankAccountForm onSave={onSave} onCancel={onCancel} />);

		expect(screen.getByLabelText('Nombre de la Cuenta')).toHaveValue('');
		expect(screen.getByLabelText('Banco')).toHaveValue('');
		expect(screen.getByLabelText('Número de Cuenta')).toHaveValue('');
		expect(screen.getByText('Crear')).toBeInTheDocument();
	});

	it('renders prefilled fields and "Actualizar" button in edit mode', () => {
		render(<BankAccountForm account={mockAccount} onSave={onSave} onCancel={onCancel} />);

		expect(screen.getByLabelText('Nombre de la Cuenta')).toHaveValue('Cuenta Principal');
		expect(screen.getByLabelText('Banco')).toHaveValue('Santander');
		expect(screen.getByLabelText('Número de Cuenta')).toHaveValue('123-456');
		expect(screen.getByText('Actualizar')).toBeInTheDocument();
	});

	it('calls onCancel when cancel button is clicked', () => {
		render(<BankAccountForm onSave={onSave} onCancel={onCancel} />);

		fireEvent.click(screen.getByText('Cancelar'));
		expect(onCancel).toHaveBeenCalled();
	});

	it('shows a validation toast and does not call createBankAccount when fields are empty', async () => {
		const { container } = render(<BankAccountForm onSave={onSave} onCancel={onCancel} />);

		const form = container.querySelector('form')!;
		fireEvent.submit(form);

		expect(mockToast).toHaveBeenCalledWith(
			expect.objectContaining({
				title: 'Datos incompletos',
				variant: 'destructive',
			})
		);
		expect(createBankAccount).not.toHaveBeenCalled();
		expect(onSave).not.toHaveBeenCalled();
	});

	it('shows a validation toast when name/bank/number are only whitespace', async () => {
		render(<BankAccountForm onSave={onSave} onCancel={onCancel} />);

		fireEvent.change(screen.getByLabelText('Nombre de la Cuenta'), {
			target: { value: '   ' },
		});
		fireEvent.change(screen.getByLabelText('Banco'), { target: { value: '   ' } });
		fireEvent.change(screen.getByLabelText('Número de Cuenta'), {
			target: { value: '   ' },
		});
		fireEvent.click(screen.getByText('Selecciona el tipo'));
		fireEvent.click(screen.getByRole('option', { name: 'Cuenta Corriente' }));

		fireEvent.click(screen.getByText('Crear'));

		expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Datos incompletos' }));
		expect(createBankAccount).not.toHaveBeenCalled();
	});

	it('creates a new account with trimmed values and calls onSave', async () => {
		render(<BankAccountForm onSave={onSave} onCancel={onCancel} />);

		fireEvent.change(screen.getByLabelText('Nombre de la Cuenta'), {
			target: { value: '  Cuenta Nueva  ' },
		});
		fireEvent.change(screen.getByLabelText('Banco'), {
			target: { value: '  Banco Galicia  ' },
		});
		fireEvent.change(screen.getByLabelText('Número de Cuenta'), {
			target: { value: '  1111-2222  ' },
		});
		fireEvent.click(screen.getByText('Selecciona el tipo'));
		fireEvent.click(screen.getByRole('option', { name: 'Cuenta Corriente' }));

		fireEvent.click(screen.getByText('Crear'));

		await waitFor(() => {
			expect(createBankAccount).toHaveBeenCalledWith({
				name: 'Cuenta Nueva',
				bank: 'Banco Galicia',
				account_number: '1111-2222',
				account_type: 'checking',
				is_active: true,
			});
		});

		expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Cuenta creada' }));
		expect(onSave).toHaveBeenCalled();
	});

	it('updates an existing account instead of creating a new one', async () => {
		render(<BankAccountForm account={mockAccount} onSave={onSave} onCancel={onCancel} />);

		fireEvent.change(screen.getByLabelText('Nombre de la Cuenta'), {
			target: { value: 'Cuenta Renombrada' },
		});

		fireEvent.click(screen.getByText('Actualizar'));

		await waitFor(() => {
			expect(updateBankAccount).toHaveBeenCalledWith(1, {
				name: 'Cuenta Renombrada',
				bank: 'Santander',
				account_number: '123-456',
				account_type: 'checking',
			});
		});

		expect(createBankAccount).not.toHaveBeenCalled();
		expect(mockToast).toHaveBeenCalledWith(
			expect.objectContaining({ title: 'Cuenta actualizada' })
		);
		expect(onSave).toHaveBeenCalled();
	});

	it('shows an error toast and does not call onSave when createBankAccount fails', async () => {
		(createBankAccount as jest.Mock).mockResolvedValue({
			data: null,
			error: { message: 'db error' },
		});
		(translateError as jest.Mock).mockReturnValue('No se pudo crear la cuenta');

		render(<BankAccountForm onSave={onSave} onCancel={onCancel} />);
		fillRequiredFields();

		fireEvent.click(screen.getByText('Crear'));

		await waitFor(() => {
			expect(mockToast).toHaveBeenCalledWith(
				expect.objectContaining({
					title: 'Error',
					description: 'No se pudo crear la cuenta',
					variant: 'destructive',
				})
			);
		});

		expect(onSave).not.toHaveBeenCalled();
	});

	it('falls back to a default error message when translateError returns nothing', async () => {
		(createBankAccount as jest.Mock).mockResolvedValue({
			data: null,
			error: { message: 'db error' },
		});
		(translateError as jest.Mock).mockReturnValue(undefined);

		render(<BankAccountForm onSave={onSave} onCancel={onCancel} />);
		fillRequiredFields();

		fireEvent.click(screen.getByText('Crear'));

		await waitFor(() => {
			expect(mockToast).toHaveBeenCalledWith(
				expect.objectContaining({
					description: 'No se pudo guardar la cuenta bancaria.',
				})
			);
		});
	});

	it('shows "Guardando..." and disables the submit button while submitting', async () => {
		let resolvePromise: (value: any) => void;
		(createBankAccount as jest.Mock).mockReturnValue(
			new Promise((resolve) => {
				resolvePromise = resolve;
			})
		);

		render(<BankAccountForm onSave={onSave} onCancel={onCancel} />);
		fillRequiredFields();

		fireEvent.click(screen.getByText('Crear'));

		expect(await screen.findByText('Guardando...')).toBeDisabled();

		resolvePromise!({ data: mockAccount, error: null });

		await waitFor(() => {
			expect(screen.queryByText('Guardando...')).not.toBeInTheDocument();
		});
	});
});
