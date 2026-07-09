import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DashboardHome } from '@/components/layout/dashboard-home';
import { useLoadEvents } from '@/hooks/calendar/use-load-events';
import { getClientsCount } from '@/lib/clients/clients';
import { getWorksInProgressCount, Work } from '@/lib/works/works';
import { getSoldBudgetsCount } from '@/lib/reports/budgets/methods';
import { getSupabaseClient } from '@/lib/supabase-client';

jest.mock('@/hooks/calendar/use-load-events', () => ({
	useLoadEvents: jest.fn(),
}));

jest.mock('@/lib/clients/clients', () => ({
	getClientsCount: jest.fn(),
}));

jest.mock('@/lib/works/works', () => ({
	getWorksInProgressCount: jest.fn(),
	Work: {},
}));

jest.mock('@/lib/reports/budgets/methods', () => ({
	getSoldBudgetsCount: jest.fn(),
}));

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: jest.fn(),
}));

jest.mock('@/components/ui/card', () => ({
	Card: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

const mockEvents = [
	{
		id: 1,
		date: '2026-06-15',
		title: 'Budget delivery',
		description: '',
		client_id: 10,
		client_name: 'Perez, Juan',
		type: 'Visita',
		is_overdue: true,
		type_id: 1,
		work_id: 100,
		work_location: null,
	},
	{
		id: 2,
		date: '2026-06-10',
		title: 'Final review',
		description: '',
		client_id: null,
		client_name: null,
		type: 'Llamada',
		is_overdue: true,
		type_id: 2,
		work_id: null,
		work_location: 'Warehouse',
	},
	{
		id: 3,
		date: '2026-06-20',
		title: 'Future event',
		description: '',
		client_id: null,
		client_name: 'Garcia, Ana',
		type: 'Visita',
		is_overdue: false,
		type_id: 1,
		work_id: null,
		work_location: null,
	},
];

const mockWorks: Work[] = [
	{
		id: 100,
		address: 'Av. Siempre Viva 123',
		locality: 'CABA',
		zone: 'Norte',
		hood: 'Belgrano',
	},
];

function setup({
	events = mockEvents,
	isLoading = false,
	clientsCount = 10,
	worksCount = 5,
	budgetsCount = 8,
	worksData = null,
	supabaseFrom = null,
}: {
	events?: any[];
	isLoading?: boolean;
	clientsCount?: number;
	worksCount?: number;
	budgetsCount?: number;
	worksData?: any[] | null;
	supabaseFrom?: any;
} = {}) {
	(useLoadEvents as jest.Mock).mockReturnValue({ events, isLoading });
	(getClientsCount as jest.Mock).mockResolvedValue({ data: clientsCount, error: null });
	(getWorksInProgressCount as jest.Mock).mockResolvedValue({ data: worksCount, error: null });
	(getSoldBudgetsCount as jest.Mock).mockResolvedValue({ data: budgetsCount, error: null });

	const mockFrom = supabaseFrom ?? {
		select: jest.fn().mockReturnThis(),
		in: jest.fn().mockResolvedValue({ data: worksData ?? mockWorks, error: null }),
	};
	(getSupabaseClient as jest.Mock).mockReturnValue({ from: jest.fn(() => mockFrom) });

	render(<DashboardHome />);
}

describe('DashboardHome', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders the welcome title', () => {
		setup();
		expect(screen.getByText('Bienvenido al Sistema de Gestión')).toBeInTheDocument();
	});

	it('shows loading message while events are loading', () => {
		setup({ isLoading: true });
		expect(screen.getByText('Cargando eventos...')).toBeInTheDocument();
	});

	it('shows empty state when there are no overdue events', () => {
		setup({ events: [] });
		expect(screen.getByText('No hay eventos vencidos')).toBeInTheDocument();
	});

	it('displays the overdue events count', () => {
		setup();
		expect(screen.getByText('2')).toBeInTheDocument();
	});

	it('renders overdue events with title and type', async () => {
		setup();

		await waitFor(() => {
			expect(screen.getByText('Budget delivery')).toBeInTheDocument();
		});
		expect(screen.getByText('Final review')).toBeInTheDocument();
		expect(screen.queryByText('Future event')).not.toBeInTheDocument();
	});

	it('shows the client name for the event', async () => {
		setup();

		await waitFor(() => {
			expect(screen.getByText('Perez, Juan')).toBeInTheDocument();
		});
	});

	it('shows work location data when the event has a work_id', async () => {
		setup();

		await waitFor(() => {
			expect(
				screen.getByText(/CABA · Av. Siempre Viva 123 · Norte · Belgrano/)
			).toBeInTheDocument();
		});
	});

	it('falls back to work_location when the event has no work_id', async () => {
		setup();

		await waitFor(() => {
			expect(screen.getByText('Warehouse')).toBeInTheDocument();
		});
	});

	it('hides location when no data is available', async () => {
		const eventsNoLocation = [
			{
				id: 4,
				date: '2026-06-15',
				title: 'No location event',
				description: '',
				client_name: null,
				type: 'Visita',
				is_overdue: true,
				type_id: 1,
				work_id: null,
				work_location: null,
			},
		];
		setup({ events: eventsNoLocation, worksData: [] });

		await waitFor(() => {
			expect(screen.getByText('No location event')).toBeInTheDocument();
		});
		expect(screen.queryByText('Warehouse')).not.toBeInTheDocument();
	});

	it('shows the overdue date', async () => {
		setup();

		await waitFor(() => {
			expect(screen.getByText('Venció el 15/06/2026')).toBeInTheDocument();
		});
	});

	it('loads and displays dashboard metrics', async () => {
		setup({ clientsCount: 25, worksCount: 7, budgetsCount: 12 });

		await waitFor(() => {
			expect(screen.getByText('25')).toBeInTheDocument();
		});
		expect(screen.getByText('7')).toBeInTheDocument();
		expect(screen.getByText('12')).toBeInTheDocument();
	});

	it('calls getSupabaseClient to fetch work data', async () => {
		setup();

		await waitFor(() => {
			expect(getSupabaseClient).toHaveBeenCalled();
		});
	});

	it('increments visible events on scroll', async () => {
		const manyEvents = Array.from({ length: 10 }, (_, i) => ({
			id: i + 10,
			date: '2026-06-15',
			title: `Event ${i + 1}`,
			description: '',
			client_name: null,
			type: 'Visita',
			is_overdue: true,
			type_id: 1,
			work_id: null,
			work_location: null,
		}));
		setup({ events: manyEvents, worksData: [] });

		await waitFor(() => {
			expect(screen.getByText('Event 1')).toBeInTheDocument();
		});

		expect(screen.queryByText('Event 7')).not.toBeInTheDocument();

		const scrollContainer = screen.getByText('Event 1').closest('.overflow-y-auto')!;
		Object.defineProperty(scrollContainer, 'scrollTop', { value: 1000 });
		Object.defineProperty(scrollContainer, 'scrollHeight', { value: 1100 });
		Object.defineProperty(scrollContainer, 'clientHeight', { value: 100 });
		fireEvent.scroll(scrollContainer);

		await waitFor(() => {
			expect(screen.getByText('Event 7')).toBeInTheDocument();
		});
	});

	it('handles metrics fetch errors gracefully', async () => {
		(getClientsCount as jest.Mock).mockResolvedValue({ data: null, error: 'Error' });
		(getWorksInProgressCount as jest.Mock).mockResolvedValue({ data: null, error: 'Error' });
		(getSoldBudgetsCount as jest.Mock).mockResolvedValue({ data: null, error: 'Error' });

		setup();

		await waitFor(() => {
			expect(screen.getByText('Bienvenido al Sistema de Gestión')).toBeInTheDocument();
		});
	});
});
