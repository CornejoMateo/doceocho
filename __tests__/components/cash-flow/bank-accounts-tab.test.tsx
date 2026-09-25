import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { BankAccountsTab } from '@/components/business/cash-flow/bank-accounts-tab';
import { updateBankAccount } from '@/lib/cash-flow/cash-flow';
import { translateError } from '@/lib/error-translator';

const mockToast = jest.fn();

jest.mock('@/components/ui/use-toast', () => ({
	useToast: () => ({ toast: mockToast }),
}));

jest.mock('@/lib/cash-flow/cash-flow', () => ({
	updateBankAccount: jest.fn(),
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
			<span>{account ? `Editando ${account.name}` : 'Formulario nueva cuenta'}</span>
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
		is_active: false,
	},
];

function renderTab(overrides = {}) {
	const props = {
		bankAccounts: mockAccounts as any,
		onBankAccountsUpdated: jest.fn(),
		...overrides,
	};
	render(<BankAccountsTab {...props} />);
	return props;
}

// jsdom applies no CSS media queries, so both the desktop table and the mobile cards are in the DOM.
const desktop = () => within(screen.getByTestId('bank-accounts-desktop'));

describe('BankAccountsTab', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(updateBankAccount as jest.Mock).mockResolvedValue({ data: null, error: null });
	});

	it('renders active accounts and hides inactive ones by default', () => {
		renderTab();

		for (const view of [desktop(), within(screen.getByTestId('bank-accounts-mobile'))]) {
			expect(view.getByText('Cuenta Principal')).toBeInTheDocument();
			expect(view.getByText('Santander')).toBeInTheDocument();
			expect(view.getByText('123-456')).toBeInTheDocument();
			expect(view.getByText('Cuenta Corriente')).toBeInTheDocument();
		}
		expect(screen.queryByText('Cuenta Secundaria')).not.toBeInTheDocument();
	});

	it('shows inactive accounts when "Mostrar inactivas" is toggled', () => {
		renderTab();

		fireEvent.click(screen.getByRole('switch'));

		expect(desktop().getByText('Cuenta Secundaria')).toBeInTheDocument();
		expect(desktop().getByText('Inactiva')).toBeInTheDocument();
	});

	it('shows the empty state when there are no accounts', () => {
		renderTab({ bankAccounts: [] });

		expect(screen.getByText('No hay cuentas bancarias registradas')).toBeInTheDocument();
	});

	it('does not show the form by default', () => {
		renderTab();

		expect(screen.getByText('Nueva cuenta')).toBeInTheDocument();
		expect(screen.queryByTestId('bank-account-form')).not.toBeInTheDocument();
	});

	it('opens the form in create mode when "Nueva cuenta" is clicked', () => {
		renderTab();

		fireEvent.click(screen.getByRole('button', { name: /Nueva cuenta/i }));

		expect(screen.getByText('Formulario nueva cuenta')).toBeInTheDocument();
	});

	it('opens the form in edit mode with the selected account when edit is clicked', () => {
		renderTab();

		fireEvent.click(desktop().getByRole('button', { name: 'Editar' }));

		expect(screen.getByText('Editando Cuenta Principal')).toBeInTheDocument();
	});

	it('calls onSave from the form, closes it and refreshes the list', async () => {
		const onBankAccountsUpdated = jest.fn().mockResolvedValue(undefined);
		renderTab({ onBankAccountsUpdated });

		fireEvent.click(screen.getByRole('button', { name: /Nueva cuenta/i }));
		fireEvent.click(screen.getByText('MockGuardar'));

		await waitFor(() => {
			expect(onBankAccountsUpdated).toHaveBeenCalled();
		});
		await waitFor(() => {
			expect(screen.queryByTestId('bank-account-form')).not.toBeInTheDocument();
		});
	});

	it('calls onCancel from the form and closes it', async () => {
		renderTab();

		fireEvent.click(screen.getByRole('button', { name: /Nueva cuenta/i }));
		fireEvent.click(screen.getByText('MockCancelar'));

		await waitFor(() => {
			expect(screen.queryByTestId('bank-account-form')).not.toBeInTheDocument();
		});
	});

	it('opens the confirm dialog when deactivate is clicked, without deactivating yet', () => {
		renderTab();

		expect(screen.queryByText('¿Desactivar cuenta bancaria?')).not.toBeInTheDocument();

		fireEvent.click(desktop().getByRole('button', { name: 'Desactivar' }));

		expect(screen.getByText('¿Desactivar cuenta bancaria?')).toBeInTheDocument();
		expect(updateBankAccount).not.toHaveBeenCalled();
	});

	it('does not deactivate when the confirm dialog is cancelled', async () => {
		renderTab();

		fireEvent.click(desktop().getByRole('button', { name: 'Desactivar' }));
		fireEvent.click(screen.getByText('Cancelar'));

		expect(updateBankAccount).not.toHaveBeenCalled();
		await waitFor(() => {
			expect(screen.queryByText('¿Desactivar cuenta bancaria?')).not.toBeInTheDocument();
		});
	});

	it('deactivates the account, shows a success toast, and refreshes the list on confirm', async () => {
		const onBankAccountsUpdated = jest.fn();
		renderTab({ onBankAccountsUpdated });

		fireEvent.click(desktop().getByRole('button', { name: 'Desactivar' }));
		fireEvent.click(within(screen.getByRole('alertdialog')).getByText('Desactivar'));

		await waitFor(() => {
			expect(updateBankAccount).toHaveBeenCalledWith(1, { is_active: false });
		});

		expect(mockToast).toHaveBeenCalledWith(
			expect.objectContaining({ title: 'Cuenta desactivada' })
		);
		expect(onBankAccountsUpdated).toHaveBeenCalled();

		await waitFor(() => {
			expect(screen.queryByText('¿Desactivar cuenta bancaria?')).not.toBeInTheDocument();
		});
	});

	it('shows an error toast when deactivating fails', async () => {
		(updateBankAccount as jest.Mock).mockResolvedValue({
			data: null,
			error: { message: 'db error' },
		});
		(translateError as jest.Mock).mockReturnValue('No se pudo desactivar');

		renderTab();

		fireEvent.click(desktop().getByRole('button', { name: 'Desactivar' }));
		fireEvent.click(within(screen.getByRole('alertdialog')).getByText('Desactivar'));

		await waitFor(() => {
			expect(mockToast).toHaveBeenCalledWith(
				expect.objectContaining({
					title: 'Error',
					description: 'No se pudo desactivar',
					variant: 'destructive',
				})
			);
		});
	});

	it('reactivates an inactive account directly, with a success toast and refresh', async () => {
		const onBankAccountsUpdated = jest.fn();
		renderTab({ onBankAccountsUpdated });

		fireEvent.click(screen.getByRole('switch'));
		fireEvent.click(desktop().getByRole('button', { name: 'Reactivar' }));

		await waitFor(() => {
			expect(updateBankAccount).toHaveBeenCalledWith(2, { is_active: true });
		});
		expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Cuenta reactivada' }));
		expect(onBankAccountsUpdated).toHaveBeenCalled();
	});
});
