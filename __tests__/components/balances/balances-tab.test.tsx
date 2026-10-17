import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BalancesTab } from '@/components/business/cash-flow/balances-tab/balances-tab';
import { generateBalancesPDF } from '@/helpers/balances/generate-balance-pdf';

jest.mock('@/helpers/balances/generate-balance-pdf', () => ({
	generateBalancesPDF: jest.fn(),
	getFiltersDescription: jest.fn(() => 'desc'),
}));
jest.mock('@/components/business/cash-flow/balances-tab/balance-filter-dialog', () => ({
	BalanceFilterDialog: ({ open }: { open: boolean }) =>
		open ? <div>Dialogo de filtros</div> : null,
}));

const row = (over: any = {}) => ({
	id: 1,
	contractDate: '10/01/26',
	contractDateRaw: new Date('2026-01-10'),
	client: 'Perez Ana',
	work: 'Casa Sur',
	concept: 'P-1 - Aberturas',
	purchaseArs: 1000,
	deliveriesArs: 400,
	balanceType: 'DEUDOR',
	balanceAmountArs: 600,
	usdContractRef: 0,
	balanceInUseUsd: 0,
	...over,
});

const baseProps = () => ({
	loading: false,
	initialLoading: false,
	refresh: jest.fn(),
	filteredRows: [row(), row({ id: 2, client: 'Gomez Juan', balanceType: 'ACREEDOR' })],
	searchTerm: '',
	setSearchTerm: jest.fn(),
	sortField: 'contractDate' as const,
	sortDirection: 'desc' as const,
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
});

describe('BalancesTab', () => {
	beforeEach(() => jest.clearAllMocks());

	it('renders rows in the desktop table and in mobile cards', () => {
		render(<BalancesTab {...baseProps()} />);
		expect(screen.getByText('2 fila(s)')).toBeInTheDocument();

		const table = screen.getByRole('table');
		expect(within(table).getByText('Perez Ana')).toBeInTheDocument();
		expect(within(table).getByText('Gomez Juan')).toBeInTheDocument();
		expect(within(table).getByText('ACREEDOR')).toBeInTheDocument();

		// mobile card view renders the same clients as headings
		expect(screen.getAllByRole('heading', { level: 4 }).map((h) => h.textContent)).toEqual([
			'Perez Ana',
			'Gomez Juan',
		]);
	});

	it('does not render stats cards or an inner tab strip', () => {
		render(<BalancesTab {...baseProps()} />);
		expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
		expect(screen.queryByText('Presupuestos')).not.toBeInTheDocument();
		expect(screen.queryByText('TOTAL')).not.toBeInTheDocument();
	});

	it('shows the empty state in both views', () => {
		render(<BalancesTab {...baseProps()} filteredRows={[]} />);
		expect(screen.getAllByText('No hay resultados')).toHaveLength(2);
		expect(screen.getByText('0 fila(s)')).toBeInTheDocument();
	});

	it('shows the loading state', () => {
		render(<BalancesTab {...baseProps()} loading initialLoading filteredRows={[]} />);
		expect(screen.getByText('Cargando...')).toBeInTheDocument();
		expect(screen.getAllByText('Cargando cuentas corrientes...')).toHaveLength(2);
	});

	it('keeps rows visible and hides loading texts during a background refresh', () => {
		render(<BalancesTab {...baseProps()} loading initialLoading={false} />);
		expect(screen.queryByText('Cargando...')).not.toBeInTheDocument();
		expect(screen.queryByText('Cargando cuentas corrientes...')).not.toBeInTheDocument();
		expect(screen.getByText('2 fila(s)')).toBeInTheDocument();
		expect(within(screen.getByRole('table')).getByText('Perez Ana')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Actualizar/ })).toBeDisabled();
	});

	it('enables Actualizar when nothing is loading', () => {
		render(<BalancesTab {...baseProps()} />);
		expect(screen.getByRole('button', { name: /Actualizar/ })).toBeEnabled();
	});

	it('calls setSearchTerm when typing in the search input', async () => {
		const props = baseProps();
		render(<BalancesTab {...props} />);
		await userEvent.type(screen.getByPlaceholderText(/Buscar por cliente/), 'a');
		expect(props.setSearchTerm).toHaveBeenCalledWith('a');
	});

	it('opens the filter dialog', async () => {
		const props = baseProps();
		render(<BalancesTab {...props} />);
		await userEvent.click(screen.getByRole('button', { name: /Filtros/ }));
		expect(props.setFilterDialogOpen).toHaveBeenCalledWith(true);
	});

	it('renders the filter dialog when open', () => {
		render(<BalancesTab {...baseProps()} filterDialogOpen />);
		expect(screen.getByText('Dialogo de filtros')).toBeInTheDocument();
	});

	it('calls handleSort when clicking a column header', async () => {
		const props = baseProps();
		render(<BalancesTab {...props} />);
		await userEvent.click(screen.getByText('CLIENTE'));
		expect(props.handleSort).toHaveBeenCalledWith('client');
		await userEvent.click(screen.getByText('MONTO'));
		expect(props.handleSort).toHaveBeenCalledWith('balanceAmountArs');
	});

	it('generates the PDF with the filtered rows and filters description', async () => {
		const props = baseProps();
		render(<BalancesTab {...props} />);
		await userEvent.click(screen.getByRole('button', { name: /Descargar PDF/ }));
		expect(generateBalancesPDF).toHaveBeenCalledWith(props.filteredRows, 'desc');
	});

	it('calls refresh when clicking Actualizar', async () => {
		const props = baseProps();
		render(<BalancesTab {...props} />);
		await userEvent.click(screen.getByRole('button', { name: /Actualizar/ }));
		expect(props.refresh).toHaveBeenCalled();
	});
});
