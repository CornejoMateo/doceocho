import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EventDetailsModal } from '@/components/business/calendar/event-details-modal';

jest.mock('@/components/ui/dialog', () => ({
	Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

jest.mock('@/components/ui/button', () => ({
	Button: ({ children, type = 'button', ...props }: any) => (
		<button type={type} {...props}>
			{children}
		</button>
	),
}));

jest.mock('@/components/ui/badge', () => ({
	Badge: ({ children }: any) => <span>{children}</span>,
}));

jest.mock('@/components/ui/use-toast', () => ({ useToast: jest.fn() }));
jest.mock('@/components/provider/auth-provider', () => ({
	useAuth: () => ({ user: { role: 'Admin' } }),
}));
jest.mock('@/lib/calendar/events', () => ({
	updateEvent: jest.fn().mockResolvedValue({ error: null }),
}));

describe('EventDetailsModal', () => {
	const toast = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		const { useToast } = require('@/components/ui/use-toast');
		(useToast as jest.Mock).mockReturnValue({ toast });
	});

	test('renders event details and toggles remember', async () => {
		const onClose = jest.fn();
		const onEventUpdated = jest.fn();

		const event = {
			id: 33,
			title: 'Prueba evento',
			date: '2025-05-05',
			client_name: 'ACME',
			location: 'Ciudad',
			address: 'Calle 1',
			description: 'Desc',
			type: 'reuniones',
			type_id: 1,
			is_overdue: false,
			remember: false,
		} as any;

		const eventTypes = [
			{
				id: 1,
				name: 'reuniones',
				color: '#7c3aed',
			},
		];

		render(
			<EventDetailsModal
				isOpen
				onClose={onClose}
				event={event}
				onEventUpdated={onEventUpdated}
				eventTypes={eventTypes}
			/>
		);

		expect(screen.getByText('Prueba evento')).toBeInTheDocument();
		expect(screen.getByText('05/05/2025')).toBeInTheDocument();
		expect(screen.getByText('ACME')).toBeInTheDocument();

		// Badge del tipo
		expect(screen.getAllByText('reuniones').length).toBeGreaterThan(0);

		const buttons = screen.getAllByRole('button');

		// Botón del recordatorio
		fireEvent.click(buttons[1]);

		await waitFor(() => {
			const { updateEvent } = require('@/lib/calendar/events');

			expect(updateEvent).toHaveBeenCalledWith(33, {
				remember: true,
			});

			expect(toast).toHaveBeenCalledWith(
				expect.objectContaining({
					title: 'Recordatorio actualizado',
				})
			);

			expect(onEventUpdated).toHaveBeenCalled();
		});
	});
	test('updates event status', async () => {
		const onEventUpdated = jest.fn();

		const event = {
			id: 33,
			title: 'Prueba evento',
			date: '2025-05-05',
			type: 'reuniones',
			type_id: 1,
			status: 'Pendiente',
			remember: false,
		} as any;

		render(
			<EventDetailsModal
				isOpen
				onClose={jest.fn()}
				event={event}
				onEventUpdated={onEventUpdated}
				eventTypes={[
					{
						id: 1,
						name: 'reuniones',
						color: '#7c3aed',
					},
				]}
			/>
		);

		fireEvent.change(screen.getByDisplayValue('Pendiente'), {
			target: {
				value: 'completed',
			},
		});

		await waitFor(() => {
			const { updateEvent } = require('@/lib/calendar/events');

			expect(updateEvent).toHaveBeenCalledWith(33, {
				status: 'completed',
			});

			expect(onEventUpdated).toHaveBeenCalled();
		});
	});
});
