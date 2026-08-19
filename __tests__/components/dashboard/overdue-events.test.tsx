import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { OverdueEvents } from '@/components/dashboard/overdue-events';
import { useLoadEvents } from '@/hooks/calendar/use-load-events';
import { getWorksByIds } from '@/lib/works/works';

jest.mock('@/hooks/calendar/use-load-events', () => ({
	useLoadEvents: jest.fn(),
}));

jest.mock('@/lib/works/works', () => ({
	getWorksByIds: jest.fn(),
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

const mockWorks = [
	{
		id: 100,
		name: 'Obra 100',
		address: 'Av. Siempre Viva 123',
		locality: 'CABA',
		zone: 'Norte',
		hood: 'Belgrano',
	},
];

function setup({
	events = mockEvents,
	isLoading = false,
	worksData = null,
}: {
	events?: any[];
	isLoading?: boolean;
	worksData?: any[] | null;
} = {}) {
	(useLoadEvents as jest.Mock).mockReturnValue({ events, isLoading });
	(getWorksByIds as jest.Mock).mockResolvedValue({ data: worksData ?? mockWorks, error: null });

	render(<OverdueEvents />);
}

describe('OverdueEvents', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders the title and overdue events count', () => {
		setup();
		expect(screen.getByText('Eventos vencidos')).toBeInTheDocument();
		expect(screen.getByText('2')).toBeInTheDocument();
	});

	it('shows loading message while events are loading', () => {
		setup({ isLoading: true });
		expect(screen.getByText('Cargando eventos...')).toBeInTheDocument();
	});

	it('shows empty state when there are no overdue events', () => {
		setup({ events: [] });
		expect(screen.getByText('No hay eventos vencidos')).toBeInTheDocument();
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

	it('shows the work name when the event has a work_id', async () => {
		setup();

		await waitFor(() => {
			expect(screen.getByText('Obra 100')).toBeInTheDocument();
		});
	});

	it('falls back to locality and address when the work has no name', async () => {
		setup({
			worksData: [
				{
					id: 100,
					name: null,
					address: 'Av. Siempre Viva 123',
					locality: 'CABA',
					zone: 'Norte',
					hood: 'Belgrano',
				},
			],
		});

		await waitFor(() => {
			expect(screen.getByText(/CABA · Av. Siempre Viva 123/)).toBeInTheDocument();
		});
	});

	it('falls back to work_location when the event has no work_id', async () => {
		setup();

		await waitFor(() => {
			expect(screen.getByText('Warehouse')).toBeInTheDocument();
		});
	});

	it('shows the overdue date', async () => {
		setup();

		await waitFor(() => {
			expect(screen.getByText('Venció el 15/06/2026')).toBeInTheDocument();
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
});
