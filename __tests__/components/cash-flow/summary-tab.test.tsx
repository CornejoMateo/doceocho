import { render, screen, fireEvent } from '@testing-library/react';
import { SummaryTab } from '@/components/business/cash-flow/summary/summary-tab';
import { useSummaryTab } from '@/hooks/cash-flow-stats/use-summary-tab';

jest.mock('@/hooks/cash-flow-stats/use-summary-tab', () => ({
	useSummaryTab: jest.fn(),
}));

jest.mock('@/components/business/cash-flow/summary/summary-kpis', () => ({
	SummaryKpis: () => <div data-testid="summary-kpis-mock" />,
}));

jest.mock('@/components/business/cash-flow/summary/summary-monthly-chart', () => ({
	SummaryMonthlyChart: () => <div data-testid="summary-monthly-chart-mock" />,
}));

jest.mock('@/components/business/cash-flow/summary/summary-by-work', () => ({
	SummaryByWork: () => <div data-testid="summary-by-work-mock" />,
}));

function baseState(over: Partial<ReturnType<typeof useSummaryTab>> = {}) {
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
		workId: 0,
		setWorkId: jest.fn(),
		workOptions: [
			{ value: 0, label: 'Todos' },
			{ value: 1, label: 'Casa Belgrano' },
		],
		cards: {
			incomeNet: 0,
			expenseNet: 0,
			margin: 0,
			profitability: 0,
			collections: 0,
			payments: 0,
			ivaOfMonth: 0,
		},
		chartData: [],
		workResultRows: [],
		loading: false,
		error: null,
		retry: jest.fn(),
		...over,
	} as unknown as ReturnType<typeof useSummaryTab>;
}

describe('SummaryTab', () => {
	beforeEach(() => jest.clearAllMocks());

	it('shows a spinner while loading', () => {
		(useSummaryTab as jest.Mock).mockReturnValue(baseState({ loading: true }));
		render(<SummaryTab />);
		expect(screen.getByLabelText('Cargando resumen')).toBeInTheDocument();
		expect(screen.queryByTestId('summary-kpis-mock')).not.toBeInTheDocument();
	});

	it('shows an error with a retry button', () => {
		const retry = jest.fn();
		(useSummaryTab as jest.Mock).mockReturnValue(baseState({ error: 'No se pudo', retry }));
		render(<SummaryTab />);

		expect(screen.getByText('No se pudo')).toBeInTheDocument();
		fireEvent.click(screen.getByText('Reintentar'));
		expect(retry).toHaveBeenCalled();
	});

	it('renders the KPIs, monthly chart, and by-work table once loaded', () => {
		(useSummaryTab as jest.Mock).mockReturnValue(baseState());
		render(<SummaryTab />);

		expect(screen.getByTestId('summary-kpis-mock')).toBeInTheDocument();
		expect(screen.getByTestId('summary-monthly-chart-mock')).toBeInTheDocument();
		expect(screen.getByTestId('summary-by-work-mock')).toBeInTheDocument();
	});

	it('changes mes, año and obra via the selects', () => {
		const setMonth = jest.fn();
		const setYear = jest.fn();
		const setWorkId = jest.fn();
		(useSummaryTab as jest.Mock).mockReturnValue(baseState({ setMonth, setYear, setWorkId }));

		render(<SummaryTab />);

		fireEvent.click(screen.getByLabelText('Mes'));
		fireEvent.click(screen.getByRole('option', { name: 'Ene' }));
		expect(setMonth).toHaveBeenCalledWith(1);

		fireEvent.click(screen.getByLabelText('Año'));
		fireEvent.click(screen.getByRole('option', { name: '2025' }));
		expect(setYear).toHaveBeenCalledWith(2025);

		fireEvent.click(screen.getByLabelText('Obra'));
		fireEvent.click(screen.getByRole('option', { name: 'Casa Belgrano' }));
		expect(setWorkId).toHaveBeenCalledWith(1);
	});
});
