import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CalendarView } from '@/components/business/calendar/calendar-view';

const mockWorkData = [
	{ id: 1, locality: 'Palermo', address: 'Av. Santa Fe 1234', zone: 'Norte', hood: null },
	{ id: 2, locality: 'Belgrano', address: 'Av. Cabildo 2000', zone: null, hood: 'Belgrano R' },
];

const mockEvents = [
	{
		id: 1,
		title: 'Evento A',
		date: '21/06/2026',
		type: 'reuniones',
		is_overdue: false,
		work_id: 1,
		work_location: null,
		client_name: 'Cliente A',
		description: null,
	},
	{
		id: 2,
		title: 'Evento B',
		date: '22/06/2026',
		type: 'colocacion',
		is_overdue: true,
		work_id: 2,
		work_location: 'Ubicación manual',
		client_name: null,
		description: null,
	},
	{
		id: 3,
		title: 'Evento C',
		date: '23/06/2026',
		type: 'reuniones',
		is_overdue: false,
		work_id: null,
		work_location: 'Dirección textual',
		client_name: null,
		description: null,
	},
	{
		id: 4,
		title: 'Evento D',
		date: '24/06/2026',
		type: 'colocacion',
		is_overdue: false,
		work_id: null,
		work_location: null,
		client_name: 'Otro Cliente',
		description: null,
	},
];

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: () => ({
		from: () => ({
			select: () => ({
				in: () => Promise.resolve({ data: mockWorkData, error: null }),
			}),
		}),
	}),
}));

jest.mock('@/hooks/calendar/use-load-events', () => ({
	useLoadEvents: () => ({
		events: mockEvents,
		isLoading: false,
		refresh: jest.fn(),
	}),
}));

jest.mock('@/hooks/calendar/use-load-event-types', () => ({
	useLoadEventTypes: () => ({
		eventTypes: [
			{ id: 1, name: 'reuniones', color: '#7c3aed' },
			{ id: 2, name: 'colocacion', color: '#0ea5e9' },
		],
		isLoading: false,
		refresh: jest.fn(),
	}),
}));

jest.mock('@/components/ui/use-toast', () => ({ useToast: jest.fn() }));
jest.mock('@/components/provider/auth-provider', () => ({
	useAuth: () => ({ user: { role: 'Admin' } }),
}));

jest.mock('@/lib/calendar/events', () => ({
	createEvent: jest.fn(),
	deleteEvent: jest.fn().mockResolvedValue({ error: null }),
	deleteLastYearEvents: jest.fn().mockResolvedValue({ error: null }),
}));

// Mock UI primitives to simplify rendering
jest.mock('@/components/ui/dialog', () => ({
	Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
	DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DialogTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
	Button: ({ children, type = 'button', ...props }: any) => (
		<button type={type} {...props}>
			{children}
		</button>
	),
}));

jest.mock('@/components/ui/card', () => ({
	Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock inner modals to avoid complexity
jest.mock('@/components/business/calendar/event-form-modal', () => ({
	EventFormModal: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/business/calendar/event-details-modal', () => ({
	EventDetailsModal: ({ isOpen, event }: any) => (isOpen ? <div>{event?.title}</div> : null),
}));

jest.mock('@/components/business/calendar/event-types-dialog', () => ({
	EventTypesDialog: () => <div>Ajustes de eventos</div>,
}));

describe('CalendarView', () => {
	const toast = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		const { useToast } = require('@/components/ui/use-toast');
		(useToast as jest.Mock).mockReturnValue({ toast });
	});

	test('renders header and upcoming events', () => {
		render(<CalendarView />);

		expect(screen.getByText('Calendario')).toBeInTheDocument();
		// upcoming events titles
		expect(screen.getByText('Evento A')).toBeInTheDocument();
		expect(screen.getByText('Evento B')).toBeInTheDocument();
	});

	test('delete last year events triggers API and shows toast', async () => {
		const { deleteLastYearEvents } = require('@/lib/calendar/events');

		render(<CalendarView />);

		fireEvent.click(
			screen.getByRole('button', {
				name: 'Eliminar eventos del año pasado',
			})
		);

		fireEvent.click(
			screen.getByRole('button', {
				name: /^Eliminar$/i,
			})
		);

		await waitFor(() => {
			expect(deleteLastYearEvents).toHaveBeenCalled();
			expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Eventos eliminados' }));
		});
	});

	test('renders custom event type labels', () => {
		render(<CalendarView />);

		expect(screen.getByRole('button', { name: 'reuniones' })).toBeInTheDocument();

		expect(screen.getByRole('button', { name: 'colocacion' })).toBeInTheDocument();
	});

	describe('search', () => {
		const getSearchInput = () => screen.getByPlaceholderText(/buscar/i);

		test('filters by work locality from workDataMap', async () => {
			render(<CalendarView />);

			fireEvent.change(getSearchInput(), { target: { value: 'Palermo' } });

			await waitFor(() => {
				expect(screen.getByText('Evento A')).toBeInTheDocument();
				expect(screen.queryByText('Evento B')).not.toBeInTheDocument();
				expect(screen.queryByText('Evento C')).not.toBeInTheDocument();
				expect(screen.queryByText('Evento D')).not.toBeInTheDocument();
			});
		});

		test('filters by work address from workDataMap', async () => {
			render(<CalendarView />);

			fireEvent.change(getSearchInput(), { target: { value: 'Cabildo' } });

			await waitFor(() => {
				expect(screen.getByText('Evento B')).toBeInTheDocument();
				expect(screen.queryByText('Evento A')).not.toBeInTheDocument();
				expect(screen.queryByText('Evento C')).not.toBeInTheDocument();
				expect(screen.queryByText('Evento D')).not.toBeInTheDocument();
			});
		});

		test('filters by work zone from workDataMap', async () => {
			render(<CalendarView />);

			fireEvent.change(getSearchInput(), { target: { value: 'Norte' } });

			await waitFor(() => {
				expect(screen.getByText('Evento A')).toBeInTheDocument();
				expect(screen.queryByText('Evento B')).not.toBeInTheDocument();
				expect(screen.queryByText('Evento C')).not.toBeInTheDocument();
				expect(screen.queryByText('Evento D')).not.toBeInTheDocument();
			});
		});

		test('filters by work hood from workDataMap', async () => {
			render(<CalendarView />);

			fireEvent.change(getSearchInput(), { target: { value: 'Belgrano R' } });

			await waitFor(() => {
				expect(screen.getByText('Evento B')).toBeInTheDocument();
				expect(screen.queryByText('Evento A')).not.toBeInTheDocument();
				expect(screen.queryByText('Evento C')).not.toBeInTheDocument();
				expect(screen.queryByText('Evento D')).not.toBeInTheDocument();
			});
		});

		test('filters by manual work_location text', async () => {
			render(<CalendarView />);

			fireEvent.change(getSearchInput(), { target: { value: 'manual' } });

			await waitFor(() => {
				expect(screen.getByText('Evento B')).toBeInTheDocument();
			});
		});

		test('filters by work_location when no work_id', async () => {
			render(<CalendarView />);

			fireEvent.change(getSearchInput(), { target: { value: 'textual' } });

			await waitFor(() => {
				expect(screen.getByText('Evento C')).toBeInTheDocument();
			});
		});

		test('filters by client_name', async () => {
			render(<CalendarView />);

			fireEvent.change(getSearchInput(), { target: { value: 'Otro Cliente' } });

			await waitFor(() => {
				expect(screen.getByText('Evento D')).toBeInTheDocument();
				expect(screen.queryByText('Evento A')).not.toBeInTheDocument();
				expect(screen.queryByText('Evento B')).not.toBeInTheDocument();
				expect(screen.queryByText('Evento C')).not.toBeInTheDocument();
			});
		});

		test('shows all events when search is cleared', async () => {
			render(<CalendarView />);

			fireEvent.change(getSearchInput(), { target: { value: 'Palermo' } });
			await waitFor(() => {
				expect(screen.getByText('Evento A')).toBeInTheDocument();
				expect(screen.queryByText('Evento B')).not.toBeInTheDocument();
			});

			fireEvent.change(getSearchInput(), { target: { value: '' } });

			await waitFor(() => {
				expect(screen.getByText('Evento A')).toBeInTheDocument();
				expect(screen.getByText('Evento B')).toBeInTheDocument();
				expect(screen.getByText('Evento C')).toBeInTheDocument();
				expect(screen.getByText('Evento D')).toBeInTheDocument();
			});
		});
	});
});
