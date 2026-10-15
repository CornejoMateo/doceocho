import { render, screen, within, fireEvent } from '@testing-library/react';
import { BankAccountStats } from '@/components/business/cash-flow/bank-account-stats';
import { useBankAccountStats } from '@/hooks/cash-flow-stats/use-bank-account-stats';

jest.mock('@/hooks/cash-flow-stats/use-bank-account-stats', () => ({
	useBankAccountStats: jest.fn(),
}));

jest.mock('@/constants/cashflow/cashflow', () => ({
	getAccountTypeLabel: (v: string) => ({ checking: 'Cuenta Corriente' })[v] || v,
}));

const BANK_ACCOUNTS = [
	{
		id: 1,
		name: 'Cuenta A',
		bank: 'Galicia',
		account_number: '1',
		account_type: 'checking',
		is_active: true,
		initial_balance: 1000,
	},
];

function baseState(over: Partial<ReturnType<typeof useBankAccountStats>> = {}) {
	return {
		year: 2026,
		setYear: jest.fn(),
		yearOptions: [2027, 2026, 2025],
		month: 0,
		setMonth: jest.fn(),
		monthOptions: [
			{ value: 0, label: 'Todos' },
			{ value: 1, label: 'Ene' },
		],
		bankAccounts: BANK_ACCOUNTS,
		paymentMethods: [{ id: 1, created_at: '2026-01-01', name: 'Efectivo', is_active: true }],
		allTimeByAccount: [{ groupId: 1, totalIn: 500, totalOut: 200 }],
		periodByAccount: [{ groupId: 1, totalIn: 300, totalOut: 100 }],
		periodByMethod: [{ groupId: 1, totalIn: 300, totalOut: 100 }],
		loading: false,
		error: null,
		retry: jest.fn(),
		...over,
	} as unknown as ReturnType<typeof useBankAccountStats>;
}

describe('BankAccountStats', () => {
	beforeEach(() => jest.clearAllMocks());

	it('shows a spinner while loading', () => {
		(useBankAccountStats as jest.Mock).mockReturnValue(baseState({ loading: true }));

		render(<BankAccountStats bankAccounts={BANK_ACCOUNTS as any} />);

		expect(screen.getByLabelText('Cargando estadísticas')).toBeInTheDocument();
	});

	it('shows an error with a retry button', () => {
		const retry = jest.fn();
		(useBankAccountStats as jest.Mock).mockReturnValue(baseState({ error: 'No se pudo', retry }));

		render(<BankAccountStats bankAccounts={BANK_ACCOUNTS as any} />);

		expect(screen.getByText('No se pudo')).toBeInTheDocument();
		fireEvent.click(screen.getByText('Reintentar'));
		expect(retry).toHaveBeenCalled();
	});

	it('renders the account balances table with initial balance, incomes, expenses, saldo actual, Sin cuenta, and TOTALES', () => {
		(useBankAccountStats as jest.Mock).mockReturnValue(baseState());

		render(<BankAccountStats bankAccounts={BANK_ACCOUNTS as any} />);

		const table = within(screen.getByTestId('account-balances-table'));
		expect(table.getByText('Cuenta A')).toBeInTheDocument();
		expect(table.getByText('Cuenta Corriente')).toBeInTheDocument();
		expect(table.getByText('Sin cuenta')).toBeInTheDocument();
		expect(table.getByText('TOTALES')).toBeInTheDocument();
		// saldo actual = 1000 initial + 500 incomes - 200 expenses = 1300 (also matches the TOTALES row)
		expect(table.getAllByText(/^\$\s*1\.300$/).length).toBeGreaterThanOrEqual(1);
	});

	it('renders the period summary cards', () => {
		(useBankAccountStats as jest.Mock).mockReturnValue(baseState());

		render(<BankAccountStats bankAccounts={BANK_ACCOUNTS as any} />);

		const stats = within(screen.getByTestId('period-summary-stats'));
		expect(stats.getByText('Ingresos del período')).toBeInTheDocument();
		expect(stats.getByText(/^\$\s*300$/)).toBeInTheDocument();
		expect(stats.getByText('Egresos del período')).toBeInTheDocument();
		expect(stats.getByText(/^\$\s*100$/)).toBeInTheDocument();
		expect(stats.getByText('Flujo neto del período')).toBeInTheDocument();
		expect(stats.getByText(/^\$\s*200$/)).toBeInTheDocument();
	});

	it('renders movimientos del período por cuenta', () => {
		(useBankAccountStats as jest.Mock).mockReturnValue(baseState());

		render(<BankAccountStats bankAccounts={BANK_ACCOUNTS as any} />);

		expect(
			within(screen.getByTestId('period-by-account-table')).getByText('Cuenta A')
		).toBeInTheDocument();
	});

	it('renders movimientos del período por medio de pago', () => {
		(useBankAccountStats as jest.Mock).mockReturnValue(baseState());

		render(<BankAccountStats bankAccounts={BANK_ACCOUNTS as any} />);

		expect(
			within(screen.getByTestId('period-by-method-table')).getByText('Efectivo')
		).toBeInTheDocument();
	});

	it('shows an empty-state message when there are no accounts/methods and no period movements', () => {
		(useBankAccountStats as jest.Mock).mockReturnValue(
			baseState({
				bankAccounts: [],
				paymentMethods: [],
				allTimeByAccount: [],
				periodByAccount: [],
				periodByMethod: [],
			})
		);

		render(<BankAccountStats bankAccounts={[]} />);

		expect(screen.getAllByText('No hay movimientos en el período seleccionado')).toHaveLength(2);
	});

	it('changes the month and year via the selects', () => {
		const setMonth = jest.fn();
		const setYear = jest.fn();
		(useBankAccountStats as jest.Mock).mockReturnValue(baseState({ setMonth, setYear }));

		render(<BankAccountStats bankAccounts={BANK_ACCOUNTS as any} />);

		fireEvent.click(screen.getByLabelText('Mes'));
		fireEvent.click(screen.getByRole('option', { name: 'Ene' }));
		expect(setMonth).toHaveBeenCalledWith(1);

		fireEvent.click(screen.getByLabelText('Año'));
		fireEvent.click(screen.getByRole('option', { name: '2025' }));
		expect(setYear).toHaveBeenCalledWith(2025);
	});
});
