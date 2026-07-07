import { renderHook, waitFor } from '@testing-library/react';
import { useLoadEvents } from '@/hooks/calendar/use-load-events';
import { listEvents } from '@/lib/calendar/events';
import { listEventTypes } from '@/lib/calendar/event-types';
import { getSupabaseClient } from '@/lib/supabase-client';

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: jest.fn(),
}));

jest.mock('@/lib/calendar/events', () => ({
	listEvents: jest.fn(),
}));

jest.mock('@/lib/calendar/event-types', () => ({
	listEventTypes: jest.fn(),
}));

const mockSubscribe = jest.fn();
const mockOn = jest.fn();
const mockChannel = jest.fn();
const mockRemoveChannel = jest.fn();

beforeEach(() => {
	jest.clearAllMocks();
	localStorage.clear();

	mockSubscribe.mockReturnValue({});
	mockOn.mockReturnValue({ subscribe: mockSubscribe });
	mockChannel.mockReturnValue({ on: mockOn, subscribe: mockSubscribe });

	(getSupabaseClient as jest.Mock).mockReturnValue({
		channel: mockChannel,
		removeChannel: mockRemoveChannel,
	});

	(listEvents as jest.Mock).mockResolvedValue({
		data: [],
		error: null,
		count: null,
	});

	(listEventTypes as jest.Mock).mockResolvedValue({
		data: [],
		error: null,
		count: null,
	});
});

describe('useLoadEvents', () => {
	it('returns empty array when no events', async () => {
		const { result } = renderHook(() => useLoadEvents());

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(result.current.events).toEqual([]);
	});

	it('transforms events with date formatting', async () => {
		(listEvents as jest.Mock).mockResolvedValue({
			data: [{ id: 1, title: 'Test Event', date: '2025-06-15', type_id: null }],
			error: null,
		});

		const { result } = renderHook(() => useLoadEvents());

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(result.current.events).toHaveLength(1);
		expect(result.current.events[0].id).toBe(1);
		expect(result.current.events[0].date).toBe('15/06/2025');
		expect(result.current.events[0].title).toBe('Test Event');
	});

	it('falls back to today ISO date when event date is null', async () => {
		(listEvents as jest.Mock).mockResolvedValue({
			data: [{ id: 1, title: 'No Date', date: null, type_id: null }],
			error: null,
		});

		const { result } = renderHook(() => useLoadEvents());

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(result.current.events).toHaveLength(1);
		expect(result.current.events[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});

	it('resolves event type name from type_id', async () => {
		(listEvents as jest.Mock).mockResolvedValue({
			data: [{ id: 1, title: 'Typed Event', type_id: 1, date: '2025-06-15' }],
			error: null,
		});

		(listEventTypes as jest.Mock).mockResolvedValue({
			data: [{ id: 1, name: 'Cumpleaños' }],
			error: null,
		});

		const { result } = renderHook(() => useLoadEvents());

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(result.current.events[0].type).toBe('Cumpleaños');
	});

	it('falls back to "otros" for unknown type_id', async () => {
		(listEvents as jest.Mock).mockResolvedValue({
			data: [{ id: 1, title: 'Unknown Type', type_id: 99, date: '2025-06-15' }],
			error: null,
		});

		(listEventTypes as jest.Mock).mockResolvedValue({
			data: [{ id: 1, name: 'Cumpleaños' }],
			error: null,
		});

		const { result } = renderHook(() => useLoadEvents());

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(result.current.events[0].type).toBe('otros');
	});

	it('falls back to "otros" when type_id is null', async () => {
		(listEvents as jest.Mock).mockResolvedValue({
			data: [{ id: 1, title: 'No Type', type_id: null, date: '2025-06-15' }],
			error: null,
		});

		const { result } = renderHook(() => useLoadEvents());

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(result.current.events[0].type).toBe('otros');
	});

	it('passes through client_name, status, and work_location', async () => {
		(listEvents as jest.Mock).mockResolvedValue({
			data: [
				{
					id: 1,
					title: 'Full Event',
					date: '2025-06-15',
					type_id: null,
					client_name: 'Juan Pérez',
					status: 'pending',
					work_location: 'Oficina Central',
				},
			],
			error: null,
		});

		const { result } = renderHook(() => useLoadEvents());

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(result.current.events[0].client_name).toBe('Juan Pérez');
		expect(result.current.events[0].status).toBe('pending');
		expect(result.current.events[0].work_location).toBe('Oficina Central');
	});

	it('defaults title to "Sin título" and description to empty string', async () => {
		(listEvents as jest.Mock).mockResolvedValue({
			data: [{ id: 1, title: null, description: null, date: '2025-06-15', type_id: null }],
			error: null,
		});

		const { result } = renderHook(() => useLoadEvents());

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(result.current.events[0].title).toBe('Sin título');
		expect(result.current.events[0].description).toBe('');
	});

	it('sets default values for is_overdue and remember', async () => {
		(listEvents as jest.Mock).mockResolvedValue({
			data: [{ id: 1, title: 'Defaults', date: '2025-06-15', type_id: null }],
			error: null,
		});

		const { result } = renderHook(() => useLoadEvents());

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(result.current.events[0].is_overdue).toBe(false);
		expect(result.current.events[0].remember).toBe(false);
	});

	it('throws on listEvents error', async () => {
		(listEvents as jest.Mock).mockResolvedValue({
			data: null,
			error: new Error('DB error'),
		});

		const { result } = renderHook(() => useLoadEvents());

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(result.current.events).toEqual([]);
	});

	it('throws on listEventTypes error', async () => {
		(listEvents as jest.Mock).mockResolvedValue({
			data: [],
			error: null,
		});

		(listEventTypes as jest.Mock).mockResolvedValue({
			data: null,
			error: new Error('Types error'),
		});

		const { result } = renderHook(() => useLoadEvents());

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(result.current.events).toEqual([]);
	});

	it('passes client_id and work_id through', async () => {
		(listEvents as jest.Mock).mockResolvedValue({
			data: [
				{
					id: 1,
					title: 'Linked',
					date: '2025-06-15',
					type_id: null,
					client_id: 42,
					work_id: 7,
				},
			],
			error: null,
		});

		const { result } = renderHook(() => useLoadEvents());

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(result.current.events[0].client_id).toBe(42);
		expect(result.current.events[0].work_id).toBe(7);
	});

	it('exposes refresh function that refetches data', async () => {
		(listEvents as jest.Mock)
			.mockResolvedValueOnce({
				data: [{ id: 1, title: 'First', date: '2025-06-15', type_id: null }],
				error: null,
			})
			.mockResolvedValueOnce({
				data: [{ id: 2, title: 'Second', date: '2025-06-16', type_id: null }],
				error: null,
			});

		const { result } = renderHook(() => useLoadEvents());

		await waitFor(() => {
			expect(result.current.events[0].title).toBe('First');
		});

		await result.current.refresh();

		await waitFor(() => {
			expect(result.current.events[0].title).toBe('Second');
		});
	});

	it('calls both listEvents and listEventTypes on fetch', async () => {
		renderHook(() => useLoadEvents());

		await waitFor(() => {
			expect(listEvents).toHaveBeenCalledTimes(1);
		});

		expect(listEventTypes).toHaveBeenCalledTimes(1);
	});
});
