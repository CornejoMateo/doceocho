import { renderHook, act } from '@testing-library/react';
import { useClientWorks } from '@/hooks/clients/use-client-works';
import { getWorksByClientId, createWork, deleteWork, updateWork } from '@/lib/works/works';
import { createWorkAction } from '@/actions/works/create-work';

jest.mock('@/lib/works/works', () => ({
	getWorksByClientId: jest.fn(),
	createWork: jest.fn(),
	deleteWork: jest.fn(),
	updateWork: jest.fn(),
}));

jest.mock('@/actions/works/create-work', () => ({
	createWorkAction: jest.fn(),
}));

describe('useClientWorks', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.spyOn(console, 'error').mockImplementation(() => {});
	});

	it('starts with empty works and not loading', () => {
		const { result } = renderHook(() => useClientWorks(1));
		expect(result.current.works).toEqual([]);
		expect(result.current.isLoading).toBe(false);
	});

	it('loads works successfully', async () => {
		const works = [{ id: 1, address: 'Calle 123' }];
		(getWorksByClientId as jest.Mock).mockResolvedValue({ data: works, error: null });

		const { result } = renderHook(() => useClientWorks(1));

		await act(async () => {
			await result.current.loadWorks();
		});

		expect(result.current.works).toEqual(works);
		expect(result.current.isLoading).toBe(false);
	});

	it('does nothing when clientId is undefined', async () => {
		const { result } = renderHook(() => useClientWorks());

		await act(async () => {
			await result.current.loadWorks();
		});

		expect(result.current.works).toEqual([]);
		expect(getWorksByClientId).not.toHaveBeenCalled();
	});

	it('handles load error gracefully', async () => {
		(getWorksByClientId as jest.Mock).mockResolvedValue({ data: null, error: new Error('Error') });

		const { result } = renderHook(() => useClientWorks(1));

		await act(async () => {
			await result.current.loadWorks();
		});

		expect(result.current.works).toEqual([]);
		expect(result.current.isLoading).toBe(false);
	});

	it('creates a work and reloads', async () => {
		(getWorksByClientId as jest.Mock).mockResolvedValue({
			data: [{ id: 1, address: 'Nueva' }],
			error: null,
		});
		(createWorkAction as jest.Mock).mockResolvedValue({ error: null });

		const { result } = renderHook(() => useClientWorks(1));

		await act(async () => {
			await result.current.create({ address: 'Nueva' } as any);
		});

		expect(createWorkAction).toHaveBeenCalledWith({
			address: 'Nueva',
			client_id: 1,
		});
		expect(result.current.works).toEqual([{ id: 1, address: 'Nueva' }]);
	});

	it('removes a work and reloads', async () => {
		(getWorksByClientId as jest.Mock).mockResolvedValue({ data: [], error: null });
		(deleteWork as jest.Mock).mockResolvedValue({ error: null });

		const { result } = renderHook(() => useClientWorks(1));

		await act(async () => {
			await result.current.remove(1);
		});

		expect(deleteWork).toHaveBeenCalledWith(1);
		expect(result.current.works).toEqual([]);
	});

	it('updates a work optimistically', async () => {
		const existingWorks = [{ id: 1, address: 'Old' }];
		(getWorksByClientId as jest.Mock).mockResolvedValue({ data: existingWorks, error: null });
		(updateWork as jest.Mock).mockResolvedValue({
			data: { id: 1, address: 'Updated' },
			error: null,
		});

		const { result } = renderHook(() => useClientWorks(1));

		await act(async () => {
			await result.current.loadWorks();
		});

		await act(async () => {
			await result.current.update(1, { address: 'Updated' });
		});

		expect(result.current.works[0].address).toBe('Updated');
	});

	it('create does nothing when clientId is undefined', async () => {
		const { result } = renderHook(() => useClientWorks());

		await act(async () => {
			await result.current.create({ address: 'Test' } as any);
		});

		expect(createWorkAction).not.toHaveBeenCalled();
	});
});
