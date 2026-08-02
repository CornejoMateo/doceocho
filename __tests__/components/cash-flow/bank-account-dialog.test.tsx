import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BankAccountsDialog } from '@/components/business/cash-flow/bank-accounts-dialog';
import { deleteBankAccount } from '@/lib/cash-flow/cash-flow';
import { translateError } from '@/lib/error-translator';

const mockToast = jest.fn();

jest.mock('@/components/ui/use-toast', () => ({
	useToast: () => ({ toast: mockToast }),
}));

jest.mock('@/lib/cash-flow/cash-flow', () => ({
	deleteBankAccount: jest.fn(),
}));

jest.mock('@/lib/error-translator', () => ({
	translateError: jest.fn(),
}));

jest.mock('@/constants/cashflow/cashflow', () => ({
	getAccountTypeLabel: (v: string) => ({ checking: 'Cuenta Corriente' })[v] || v,
}));

jest.mock('@/components/business/cash-flow/bank-account-form', () => ({
	BankAccountForm: ({ account, onSave, onCancel }: any) => (
		<div data-testid="bank-account-form">
			<span>{account ? `Editando ${account.name}` : 'Nueva cuenta'}</span>
			<button onClick={onSave}>MockGuardar</button>
			<button onClick={onCancel}>MockCancelar</button>
		</div>
	),
}));

const mockAccounts = [
	{
		id: 1,
		name: 'Cuenta Principal',
		bank: 'Santander',
		account_number: '123-456',
		account_type: 'checking',
		is_active: true,
	},
	{
		id: 2,
		name: 'Cuenta Secundaria',
		bank: 'BBVA',
		account_number: '789-012',
		account_type: 'savings',
		is_active: true,
	},
];

function renderDialog(overrides = {}) {
	const props = {
		open: true,
		onOpenChange: jest.fn(),
		bankAccounts: mockAccounts as any,
		onBankAccountsUpdated: jest.fn(),
		...overrides,
	};
	render(<BankAccountsDialog {...props} />);
	return props;
}

describe('BankAccountsDialog', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(deleteBankAccount as jest.Mock).mockResolvedValue({ data: null, error: null });
	});

	it('renders the list of bank accounts', () => {
		renderDialog();

		expect(screen.getByText('Cuenta Principal')).toBeInTheDocument();
		expect(screen.getByText('Santander')).toBeInTheDocument();
		expect(screen.getByText('123-456')).toBeInTheDocument();
		expect(screen.getByText('Cuenta Corriente')).toBeInTheDocument();
		expect(screen.getByText('Cuenta Secundaria')).toBeInTheDocument();
	});

	it('shows the empty state when there are no accounts', () => {
		renderDialog({ bankAccounts: [] });

		expect(screen.getByText('No hay cuentas bancarias registradas')).toBeInTheDocument();
	});

	it('shows "Agregar nueva cuenta" button by default and hides the form', () => {
		renderDialog();

		expect(screen.getByText('Agregar nueva cuenta')).toBeInTheDocument();
		expect(screen.queryByTestId('bank-account-form')).not.toBeInTheDocument();
	});

	it('shows the form in create mode and hides the add button when "Agregar nueva cuenta" is clicked', () => {
		renderDialog();

		fireEvent.click(screen.getByText('Agregar nueva cuenta'));

		expect(screen.getByText('Nueva cuenta')).toBeInTheDocument();
		expect(screen.queryByText('Agregar nueva cuenta')).not.toBeInTheDocument();
	});

	it('shows the form in edit mode with the selected account when edit is clicked', () => {
		renderDialog();

		const editButtons = screen
			.getAllByRole('button')
			.filter((b) => b.querySelector('svg.lucide-pen') || b.querySelector('svg.lucide-square-pen'));

		const firstCardButtons = screen.getAllByRole('button');
		fireEvent.click(
			firstCardButtons.find((b) => b.className.includes('ghost')) || firstCardButtons[1]
		);

		expect(screen.getByText('Editando Cuenta Principal')).toBeInTheDocument();
	});

	it('disables edit/delete buttons on other accounts while the form is open', () => {
		renderDialog();

		fireEvent.click(screen.getByText('Agregar nueva cuenta'));

		const disabledButtons = screen
			.getAllByRole('button')
			.filter((b) => (b as HTMLButtonElement).disabled);

		expect(disabledButtons.length).toBeGreaterThanOrEqual(4);
	});

	it('calls onSave from the form and refreshes the list', async () => {
		const onBankAccountsUpdated = jest.fn().mockResolvedValue(undefined);
		renderDialog({ onBankAccountsUpdated });

		fireEvent.click(screen.getByText('Agregar nueva cuenta'));
		fireEvent.click(screen.getByText('MockGuardar'));

		await waitFor(() => {
			expect(onBankAccountsUpdated).toHaveBeenCalled();
		});
		expect(screen.queryByTestId('bank-account-form')).not.toBeInTheDocument();
		expect(screen.getByText('Agregar nueva cuenta')).toBeInTheDocument();
	});

	it('calls onCancel from the form and shows the add button again', () => {
		renderDialog();

		fireEvent.click(screen.getByText('Agregar nueva cuenta'));
		fireEvent.click(screen.getByText('MockCancelar'));

		expect(screen.queryByTestId('bank-account-form')).not.toBeInTheDocument();
		expect(screen.getByText('Agregar nueva cuenta')).toBeInTheDocument();
	});

	it('opens the confirm dialog when delete is clicked, without deleting yet', () => {
		renderDialog();

		expect(screen.queryByText('¿Eliminar cuenta bancaria?')).not.toBeInTheDocument();

		const deleteButtons = screen
			.getAllByRole('button')
			.filter((b) => b.className.includes('text-destructive'));
		fireEvent.click(deleteButtons[0]);

		expect(screen.getByText('¿Eliminar cuenta bancaria?')).toBeInTheDocument();
		expect(deleteBankAccount).not.toHaveBeenCalled();
	});

	it('does not delete when the confirm dialog is cancelled', () => {
		renderDialog();

		const deleteButtons = screen
			.getAllByRole('button')
			.filter((b) => b.className.includes('text-destructive'));
		fireEvent.click(deleteButtons[0]);

		fireEvent.click(screen.getByText('Cancelar'));

		expect(deleteBankAccount).not.toHaveBeenCalled();
		expect(screen.queryByText('¿Eliminar cuenta bancaria?')).not.toBeInTheDocument();
	});

	it('deletes the account, shows a success toast, and refreshes the list on confirm', async () => {
		const onBankAccountsUpdated = jest.fn();
		renderDialog({ onBankAccountsUpdated });

		const deleteButtons = screen
			.getAllByRole('button')
			.filter((b) => b.className.includes('text-destructive'));
		fireEvent.click(deleteButtons[0]);

		fireEvent.click(screen.getByText('Eliminar'));

		await waitFor(() => {
			expect(deleteBankAccount).toHaveBeenCalledWith(1);
		});

		expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Cuenta eliminada' }));
		expect(onBankAccountsUpdated).toHaveBeenCalled();

		await waitFor(() => {
			expect(screen.queryByText('¿Eliminar cuenta bancaria?')).not.toBeInTheDocument();
		});
	});

	it('shows an error toast when deleteBankAccount fails', async () => {
		(deleteBankAccount as jest.Mock).mockResolvedValue({
			data: null,
			error: { message: 'db error' },
		});
		(translateError as jest.Mock).mockReturnValue('No se pudo eliminar');

		renderDialog();

		const deleteButtons = screen
			.getAllByRole('button')
			.filter((b) => b.className.includes('text-destructive'));
		fireEvent.click(deleteButtons[0]);
		fireEvent.click(screen.getByText('Eliminar'));

		await waitFor(() => {
			expect(mockToast).toHaveBeenCalledWith(
				expect.objectContaining({
					title: 'Error',
					description: 'No se pudo eliminar',
					variant: 'destructive',
				})
			);
		});
	});

	it('calls onOpenChange(false) when "Cerrar" is clicked', () => {
		const onOpenChange = jest.fn();
		renderDialog({ onOpenChange });

		fireEvent.click(screen.getByText('Cerrar'));

		expect(onOpenChange).toHaveBeenCalledWith(false);
	});
});
