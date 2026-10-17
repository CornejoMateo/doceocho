import { renderHook, act, waitFor } from '@testing-library/react';
import { useSuppliers } from '@/hooks/suppliers/use-suppliers';
import { listSuppliers } from '@/lib/suppliers/suppliers';

jest.mock('@/lib/suppliers/suppliers', () => ({
	listSuppliers: jest.fn(),
}));
jest.mock('@/lib/error-translator', () => ({
	translateError: jest.fn(() => 'traducido'),
}));

const mockList = listSuppliers as jest.Mock;
const s1 = { id: 1, name: 'A' };
const s2 = { id: 2, name: 'B' };

describe('useSuppliers', () => {
	beforeEach(() => jest.clearAllMocks());

	it('loads suppliers when enabled', async () => {
		mockList.mockResolvedValue({ data: [s1], error: null });
		const { result } = renderHook(() => useSuppliers(true));
		expect(result.current.loading).toBe(true);
		await waitFor(() => expect(result.current.loading).toBe(false));
		expect(result.current.suppliers).toEqual([s1]);
		expect(result.current.error).toBeNull();
	});

	it('does not fetch when disabled', async () => {
		const { result } = renderHook(() => useSuppliers(false));
		expect(mockList).not.toHaveBeenCalled();
		expect(result.current.loading).toBe(false);
		expect(result.current.suppliers).toEqual([]);
	});

	it('sets an error message when the first load fails', async () => {
		mockList.mockResolvedValue({ data: null, error: { message: 'x' } });
		const { result } = renderHook(() => useSuppliers(true));
		await waitFor(() => expect(result.current.loading).toBe(false));
		expect(result.current.error).toEqual(expect.any(String));
		expect(result.current.error).not.toBe('');
		expect(result.current.suppliers).toEqual([]);
	});

	it('keeps the existing list and reports the failure when a refresh fails', async () => {
		mockList.mockResolvedValueOnce({ data: [s1], error: null });
		const { result } = renderHook(() => useSuppliers(true));
		await waitFor(() => expect(result.current.suppliers).toEqual([s1]));

		mockList.mockResolvedValueOnce({ data: null, error: { message: 'x' } });
		let outcome: any;
		await act(async () => {
			outcome = await result.current.refresh();
		});
		expect(outcome.ok).toBe(false);
		expect(outcome.message).toEqual(expect.any(String));
		expect(result.current.suppliers).toEqual([s1]);
		expect(result.current.error).toBeNull();
	});

	it('refresh returns ok on success and updates the list', async () => {
		mockList.mockResolvedValueOnce({ data: [s1], error: null });
		const { result } = renderHook(() => useSuppliers(true));
		await waitFor(() => expect(result.current.suppliers).toEqual([s1]));

		mockList.mockResolvedValueOnce({ data: [s1, s2], error: null });
		let outcome: any;
		await act(async () => {
			outcome = await result.current.refresh();
		});
		expect(outcome).toEqual({ ok: true });
		expect(result.current.suppliers).toEqual([s1, s2]);
	});

	it('ignores stale responses from overlapping refreshes', async () => {
		mockList.mockResolvedValueOnce({ data: [], error: null });
		const { result } = renderHook(() => useSuppliers(true));
		await waitFor(() => expect(result.current.loading).toBe(false));

		let resolveSlow: (v: any) => void = () => {};
		mockList.mockImplementationOnce(() => new Promise((r) => (resolveSlow = r)));
		mockList.mockResolvedValueOnce({ data: [s2], error: null });

		let slow: Promise<any>;
		await act(async () => {
			slow = result.current.refresh();
			await result.current.refresh();
		});
		expect(result.current.suppliers).toEqual([s2]);

		await act(async () => {
			resolveSlow({ data: [s1], error: null });
			await slow;
		});
		expect(result.current.suppliers).toEqual([s2]);
	});
});
