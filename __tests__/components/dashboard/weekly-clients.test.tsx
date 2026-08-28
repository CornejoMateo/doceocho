import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { WeeklyClients } from '@/components/dashboard/weekly-clients';
import { useOptimizedRealtime } from '@/hooks/use-optimized-realtime';
import { getClientsThisWeek } from '@/lib/clients/clients';
import { useRouter } from 'next/navigation';

jest.mock('@/hooks/use-optimized-realtime', () => ({
	useOptimizedRealtime: jest.fn(),
}));

jest.mock('@/lib/clients/clients', () => ({
	getClientsThisWeek: jest.fn(),
}));

jest.mock('next/navigation', () => ({
	useRouter: jest.fn(),
}));

jest.mock('@/components/ui/card', () => ({
	Card: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

const clients = [
	{
		id: 1,
		name: 'Juan',
		last_name: 'Perez',
		locality: 'CABA',
		phone_number: '11-1234-5678',
		created_at: '2026-06-15',
	},
];

function setup({ data = clients, loading = false } = {}) {
	const push = jest.fn();
	(useRouter as jest.Mock).mockReturnValue({ push });
	(useOptimizedRealtime as jest.Mock).mockReturnValue({ data, loading });
	(getClientsThisWeek as jest.Mock).mockResolvedValue({ data: clients, error: null });
	render(<WeeklyClients />);
	return { push };
}

describe('WeeklyClients', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders the title and clients count', () => {
		setup();
		expect(screen.getByText('Clientes nuevos esta semana')).toBeInTheDocument();
		expect(screen.getByText('1')).toBeInTheDocument();
	});

	it('renders client name and details', () => {
		setup();
		expect(screen.getByText('Juan Perez')).toBeInTheDocument();
		expect(screen.getByText('CABA')).toBeInTheDocument();
		expect(screen.getByText('11-1234-5678')).toBeInTheDocument();
	});

	it('shows the loading message while loading', () => {
		setup({ loading: true });
		expect(screen.getByText('Cargando clientes...')).toBeInTheDocument();
	});

	it('shows empty state when there are no clients', () => {
		setup({ data: [] });
		expect(screen.getByText('No hay clientes nuevos esta semana')).toBeInTheDocument();
	});

	it('navigates to client detail on card click', () => {
		const { push } = setup();

		fireEvent.click(screen.getByText('Juan Perez'));

		expect(push).toHaveBeenCalledWith('/clients?clientId=1');
	});
});
