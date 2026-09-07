import { renderHook, act } from '@testing-library/react';
import { useCreateEvent } from '@/hooks/calendar/use-create-event';
import { createEvent } from '@/lib/calendar/events';
import { useToast } from '@/components/ui/use-toast';

jest.mock('@/lib/calendar/events', () => ({
	createEvent: jest.fn(),
}));

jest.mock('@/components/ui/use-toast', () => ({
	useToast: jest.fn(),
}));

const eventTypes = [{ id: 1, name: 'reuniones', color: '#7c3aed' }];

describe('useCreateEvent', () => {
	const toast = jest.fn();
	let windowOpenSpy: jest.SpyInstance;

	beforeEach(() => {
		jest.clearAllMocks();
		(useToast as jest.Mock).mockReturnValue({ toast });
		windowOpenSpy = jest.spyOn(window, 'open').mockReturnValue({} as Window);
	});

	afterEach(() => {
		windowOpenSpy.mockRestore();
	});

	const baseEventData = {
		title: 'Evento',
		type: 'reuniones',
		description: 'Descripción',
		client_id: 1,
		client_name: 'Cliente',
		date: '03-03-2024',
		time: '14:30',
		remember: true,
		work_id: null,
		work_location: 'Av. Colón',
	};

	test('creates the event, opens Google Calendar and calls onEventCreated', async () => {
		(createEvent as jest.Mock).mockResolvedValue({ data: { id: 10 }, error: null });
		const onEventCreated = jest.fn();

		const { result } = renderHook(() => useCreateEvent({ eventTypes, onEventCreated }));

		let ok: boolean | undefined;
		await act(async () => {
			ok = await result.current.createEvent(baseEventData);
		});

		expect(ok).toBe(true);
		expect(createEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				title: 'Evento',
				type_id: 1,
				client_name: null,
				date: '2024-03-03',
				time: '14:30',
				work_location: 'Av. Colón',
			})
		);
		expect(windowOpenSpy).toHaveBeenCalledTimes(1);
		expect(windowOpenSpy).toHaveBeenCalledWith(
			expect.stringContaining('calendar.google.com'),
			'_blank'
		);
		expect(onEventCreated).toHaveBeenCalled();
	});

	test('sets googleCalendarErrorUrl when the popup is blocked', async () => {
		(createEvent as jest.Mock).mockResolvedValue({ data: { id: 10 }, error: null });
		windowOpenSpy.mockReturnValue(null);

		const { result } = renderHook(() => useCreateEvent({ eventTypes, onEventCreated: jest.fn() }));

		await act(async () => {
			await result.current.createEvent(baseEventData);
		});

		expect(result.current.googleCalendarErrorUrl).toBeTruthy();
		expect(result.current.googleCalendarErrorUrl).toContain('calendar.google.com');
	});

	test('keeps client_name when there is no client_id', async () => {
		(createEvent as jest.Mock).mockResolvedValue({ data: { id: 10 }, error: null });

		const { result } = renderHook(() => useCreateEvent({ eventTypes, onEventCreated: jest.fn() }));

		await act(async () => {
			await result.current.createEvent({
				...baseEventData,
				client_id: null,
				client_name: 'Cliente manual',
			});
		});

		expect(createEvent).toHaveBeenCalledWith(
			expect.objectContaining({ client_name: 'Cliente manual' })
		);
	});

	test('shows an error toast and returns false when createEvent fails', async () => {
		(createEvent as jest.Mock).mockResolvedValue({
			data: null,
			error: new Error('boom'),
		});
		const onEventCreated = jest.fn();

		const { result } = renderHook(() => useCreateEvent({ eventTypes, onEventCreated }));

		let ok: boolean | undefined;
		await act(async () => {
			ok = await result.current.createEvent(baseEventData);
		});

		expect(ok).toBe(false);
		expect(toast).toHaveBeenCalledWith(
			expect.objectContaining({ title: 'Error', variant: 'destructive' })
		);
		expect(onEventCreated).not.toHaveBeenCalled();
		expect(windowOpenSpy).not.toHaveBeenCalled();
	});

	test('handles unexpected errors with a destructive toast and returns false', async () => {
		(createEvent as jest.Mock).mockRejectedValue(new Error('inesperado'));

		const { result } = renderHook(() => useCreateEvent({ eventTypes, onEventCreated: jest.fn() }));

		let ok: boolean | undefined;
		await act(async () => {
			ok = await result.current.createEvent(baseEventData);
		});

		expect(ok).toBe(false);
		expect(toast).toHaveBeenCalledWith(
			expect.objectContaining({ title: 'Error', variant: 'destructive' })
		);
	});
});
