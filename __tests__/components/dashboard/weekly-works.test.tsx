import { render, screen } from '@testing-library/react';
import { WeeklyWorks } from '@/components/dashboard/weekly-works';
import { useOptimizedRealtime } from '@/hooks/use-optimized-realtime';
import { getWorksThisWeek } from '@/lib/works/works';
import { useRouter } from 'next/navigation';

jest.mock('@/hooks/use-optimized-realtime', () => ({
	useOptimizedRealtime: jest.fn(),
}));

jest.mock('@/lib/works/works', () => ({
	getWorksThisWeek: jest.fn(),
}));

jest.mock('next/navigation', () => ({
	useRouter: jest.fn(),
}));

jest.mock('@/components/ui/card', () => ({
	Card: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

const works = [
	{
		id: 1,
		name: 'Obra Centro',
		locality: 'CABA',
		address: 'Av. Siempre Viva 123',
		client_name: 'Juan',
		client_last_name: 'Perez',
		created_at: '2026-06-15',
	},
];

function setup({ data = works, loading = false } = {}) {
	(useRouter as jest.Mock).mockReturnValue({ push: jest.fn() });
	(useOptimizedRealtime as jest.Mock).mockReturnValue({ data, loading });
	(getWorksThisWeek as jest.Mock).mockResolvedValue({ data: works, error: null });
	render(<WeeklyWorks />);
}

describe('WeeklyWorks', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders the title and works count', () => {
		setup();
		expect(screen.getByText('Obras nuevas esta semana')).toBeInTheDocument();
		expect(screen.getByText('1')).toBeInTheDocument();
	});

	it('renders work name and details', () => {
		setup();
		expect(screen.getByText('Obra Centro')).toBeInTheDocument();
		expect(screen.getByText('CABA')).toBeInTheDocument();
		expect(screen.getByText('Av. Siempre Viva 123')).toBeInTheDocument();
		expect(screen.getByText('Cliente: Perez, Juan')).toBeInTheDocument();
	});

	it('shows the loading message while loading', () => {
		setup({ loading: true });
		expect(screen.getByText('Cargando obras...')).toBeInTheDocument();
	});

	it('shows empty state when there are no works', () => {
		setup({ data: [] });
		expect(screen.getByText('No hay obras nuevas esta semana')).toBeInTheDocument();
	});
});
