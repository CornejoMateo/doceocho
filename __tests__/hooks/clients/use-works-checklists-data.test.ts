import { renderHook, waitFor, act } from '@testing-library/react';
import { useWorkChecklistData } from '@/hooks/clients/use-works-checklists-data';
import * as worksModule from '@/lib/works/works';
import * as clientsModule from '@/lib/clients/clients';
import * as checklistsModule from '@/lib/checklists/checklists';

const getWorkByIdSpy = jest.spyOn(worksModule, 'getWorkById');
const getClientByIdSpy = jest.spyOn(clientsModule, 'getClientById');
const getChecklistsByWorkIdSpy = jest.spyOn(checklistsModule, 'getChecklistsByWorkId');

describe('useWorkChecklistData', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('starts with loading state', () => {
		getWorkByIdSpy.mockResolvedValue({ data: null, error: null });

		const { result } = renderHook(() => useWorkChecklistData(1));

		expect(result.current.loading).toBe(true);
		expect(result.current.clientData).toBeNull();
		expect(result.current.workData).toBeNull();
		expect(result.current.checklists).toEqual([]);
	});

	it('loads work data, client data, and checklists', async () => {
		getWorkByIdSpy.mockResolvedValue({
			data: { id: 1, locality: 'Bs As', address: 'Calle 123', general_note: 'Note', client_id: 5 },
			error: null,
		});
		getClientByIdSpy.mockResolvedValue({
			data: { id: 5, name: 'Juan', last_name: 'Perez', phone_number: '123456789' },
			error: null,
		});
		getChecklistsByWorkIdSpy.mockResolvedValue({
			data: [{ id: 10, name: 'Checklist 1' }],
			error: null,
		});

		const { result } = renderHook(() => useWorkChecklistData(1));

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.workData).toEqual({
			id: 1,
			locality: 'Bs As',
			address: 'Calle 123',
			general_note: 'Note',
		});
		expect(result.current.clientData).toEqual({
			id: 5,
			name: 'Juan Perez',
			phone_number: '123456789',
		});
		expect(result.current.checklists).toHaveLength(1);
		expect(result.current.checklists[0].id).toBe(10);

		expect(getWorkByIdSpy).toHaveBeenCalledWith(1);
		expect(getClientByIdSpy).toHaveBeenCalledWith(5);
		expect(getChecklistsByWorkIdSpy).toHaveBeenCalledWith(1);
	});

	it('handles null work response', async () => {
		getWorkByIdSpy.mockResolvedValue({ data: null, error: null });
		getChecklistsByWorkIdSpy.mockResolvedValue({ data: null, error: null });

		const { result } = renderHook(() => useWorkChecklistData(1));

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.workData).toBeNull();
		expect(result.current.clientData).toBeNull();
		expect(result.current.checklists).toEqual([]);
	});

	it('handles work without client_id', async () => {
		getWorkByIdSpy.mockResolvedValue({
			data: { id: 1, locality: 'Bs As', address: 'Calle 123', general_note: null, client_id: null },
			error: null,
		});
		getChecklistsByWorkIdSpy.mockResolvedValue({ data: [], error: null });

		const { result } = renderHook(() => useWorkChecklistData(1));

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.workData).not.toBeNull();
		expect(result.current.clientData).toBeNull();
		expect(getClientByIdSpy).not.toHaveBeenCalled();
	});

	it('handles null client name gracefully', async () => {
		getWorkByIdSpy.mockResolvedValue({
			data: { id: 1, locality: 'Bs As', address: 'Calle 123', general_note: null, client_id: 5 },
			error: null,
		});
		getClientByIdSpy.mockResolvedValue({
			data: { id: 5, name: null, last_name: null, phone_number: '123' },
			error: null,
		});
		getChecklistsByWorkIdSpy.mockResolvedValue({ data: [], error: null });

		const { result } = renderHook(() => useWorkChecklistData(1));

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.clientData).toEqual({
			id: 5,
			name: '',
			phone_number: '123',
		});
	});

	it('handles null checklists response gracefully', async () => {
		getWorkByIdSpy.mockResolvedValue({
			data: { id: 1, locality: 'Bs As', address: 'Calle 123', general_note: null, client_id: 5 },
			error: null,
		});
		getClientByIdSpy.mockResolvedValue({
			data: { id: 5, name: 'Juan', last_name: 'Perez', phone_number: '123' },
			error: null,
		});
		getChecklistsByWorkIdSpy.mockResolvedValue({ data: null, error: null });

		const { result } = renderHook(() => useWorkChecklistData(1));

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.workData).not.toBeNull();
		expect(result.current.clientData).not.toBeNull();
		expect(result.current.checklists).toEqual([]);
	});

	it('reloads when reload is called', async () => {
		getWorkByIdSpy.mockResolvedValue({
			data: { id: 1, locality: 'Bs As', address: 'Calle 123', general_note: null, client_id: null },
			error: null,
		});
		getChecklistsByWorkIdSpy.mockResolvedValue({
			data: [{ id: 10, name: 'Checklist 1' }],
			error: null,
		});

		const { result } = renderHook(() => useWorkChecklistData(1));

		await waitFor(() => expect(result.current.loading).toBe(false));
		expect(result.current.checklists).toHaveLength(1);

		getChecklistsByWorkIdSpy.mockResolvedValue({
			data: [],
			error: null,
		});

		await act(async () => {
			await result.current.reload();
		});

		expect(result.current.checklists).toHaveLength(0);
	});
});
