import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CheckingAccountsTab } from '@/components/business/cash-flow/checking-accounts-tab';
import { useBalancesReport } from '@/hooks/balances/use-balances-report';

jest.mock('@/hooks/balances/use-balances-report');
jest.mock('@/helpers/balances/generate-balance-pdf', () => ({
	generateBalancesPDF: jest.fn(),
	getFiltersDescription: jest.fn(() => ''),
}));

const report = (over: any = {}) => ({
	loading: false,
	initialLoading: false,
	error: null,
	hasRows: true,
	refresh: jest.fn(),
	stats: {
		totalDebtors: 600,
		totalCreditors: 300,
		total: 0,
		debtorsCount: 3,
		creditorsCount: 2,
	},
	filteredRows: [
		{
			id: 1,
			contractDate: '10/01/26',
			contractDateRaw: new Date('2026-01-10'),
			client: 'Perez Ana',
			work: 'Casa Sur',
			concept: 'P-1',
			purchaseArs: 1000,
			deliveriesArs: 400,
			balanceType: 'DEUDOR',
			balanceAmountArs: 600,
			usdContractRef: 0,
			balanceInUseUsd: 0,
		},
	],
	searchTerm: '',
	setSearchTerm: jest.fn(),
	sortField: 'contractDate',
	sortDirection: 'desc',
	handleSort: jest.fn(),
	filters: {
		balanceType: 'all',
		minPurchaseArs: '',
		maxPurchaseArs: '',
		minDeliveriesArs: '',
		maxDeliveriesArs: '',
		minBalanceArs: '',
		maxBalanceArs: '',
	},
	updateFilters: jest.fn(),
	resetFilters: jest.fn(),
	filterDialogOpen: false,
	setFilterDialogOpen: jest.fn(),
	...over,
});

describe('CheckingAccountsTab', () => {
	it('renders the stats cards and the balances list from the hook', () => {
		(useBalancesReport as jest.Mock).mockReturnValue(report());
		render(<CheckingAccountsTab />);

		expect(screen.getByText('TOTAL')).toBeInTheDocument();
		expect(screen.getByText('3 deudores, 2 acreedores')).toBeInTheDocument();
		expect(screen.getByText('1 fila(s)')).toBeInTheDocument();
		expect(screen.getAllByText('Perez Ana').length).toBeGreaterThan(0);
		expect(screen.getByRole('button', { name: /Descargar PDF/ })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Actualizar/ })).toBeInTheDocument();
	});

	it('renders the empty state when the hook returns no rows', () => {
		(useBalancesReport as jest.Mock).mockReturnValue(
			report({
				filteredRows: [],
				hasRows: false,
				stats: { totalDebtors: 0, totalCreditors: 0, total: 0, debtorsCount: 0, creditorsCount: 0 },
			})
		);
		render(<CheckingAccountsTab />);
		expect(screen.getAllByText('No hay resultados').length).toBeGreaterThan(0);
	});

	it('shows only a spinner during the initial load', () => {
		(useBalancesReport as jest.Mock).mockReturnValue(
			report({ loading: true, initialLoading: true, filteredRows: [], hasRows: false })
		);
		render(<CheckingAccountsTab />);

		expect(screen.getByRole('status', { name: 'Cargando cuentas corrientes' })).toBeInTheDocument();
		expect(screen.queryByText('TOTAL')).not.toBeInTheDocument();
		expect(screen.queryByText(/fila\(s\)/)).not.toBeInTheDocument();
		expect(screen.queryByText('No hay resultados')).not.toBeInTheDocument();
	});

	it('replaces the spinner with cards and list once loaded', () => {
		(useBalancesReport as jest.Mock).mockReturnValue(
			report({ loading: true, initialLoading: true, filteredRows: [], hasRows: false })
		);
		const { rerender } = render(<CheckingAccountsTab />);
		expect(screen.getByRole('status')).toBeInTheDocument();

		(useBalancesReport as jest.Mock).mockReturnValue(report());
		rerender(<CheckingAccountsTab />);

		expect(screen.queryByRole('status', { name: 'Cargando cuentas corrientes' })).toBeNull();
		expect(screen.getByText('TOTAL')).toBeInTheDocument();
		expect(screen.getByText('1 fila(s)')).toBeInTheDocument();
	});

	it('does not bring the spinner back when loading turns true after the first load', () => {
		(useBalancesReport as jest.Mock).mockReturnValue(report());
		const { rerender } = render(<CheckingAccountsTab />);

		(useBalancesReport as jest.Mock).mockReturnValue(report({ loading: true }));
		rerender(<CheckingAccountsTab />);

		expect(screen.queryByRole('status', { name: 'Cargando cuentas corrientes' })).toBeNull();
		expect(screen.getByText('TOTAL')).toBeInTheDocument();
	});

	it('shows an error state with Reintentar on first-load failure instead of empty state and stats', async () => {
		const props = report({ filteredRows: [], hasRows: false, error: 'boom' });
		(useBalancesReport as jest.Mock).mockReturnValue(props);
		render(<CheckingAccountsTab />);

		expect(screen.getByText('No se pudieron cargar las cuentas corrientes')).toBeInTheDocument();
		expect(screen.queryByText('No hay resultados')).not.toBeInTheDocument();
		expect(screen.queryByText('TOTAL')).not.toBeInTheDocument();
		expect(screen.queryByText(/fila\(s\)/)).not.toBeInTheDocument();

		await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
		expect(props.refresh).toHaveBeenCalledTimes(1);
	});

	it('disables Reintentar while a retry is in flight', () => {
		(useBalancesReport as jest.Mock).mockReturnValue(
			report({ filteredRows: [], hasRows: false, error: 'boom', loading: true })
		);
		render(<CheckingAccountsTab />);
		expect(screen.getByRole('button', { name: 'Reintentar' })).toBeDisabled();
	});

	it('keeps the list and stats and shows a non-destructive error after previous rows', () => {
		(useBalancesReport as jest.Mock).mockReturnValue(report({ error: 'later failure' }));
		render(<CheckingAccountsTab />);

		expect(screen.getByText('No se pudieron actualizar los datos')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
		expect(screen.getByText('TOTAL')).toBeInTheDocument();
		expect(screen.getByText('1 fila(s)')).toBeInTheDocument();
		expect(screen.getAllByText('Perez Ana').length).toBeGreaterThan(0);
	});
});
