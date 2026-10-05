import { renderHook, waitFor } from '@testing-library/react';
import { useSupplierAccountTotals } from '@/hooks/suppliers/use-supplier-account-totals';
import { getSupplierAccountTotals } from '@/lib/suppliers/account-summary';

const mockToast = jest.fn();

jest.mock('@/components/ui/use-toast', () => ({
	useToast: () => ({ toast: mockToast }),
}));
jest.mock('@/lib/error-translator', () => ({ translateError: jest.fn() }));
jest.mock('@/lib/suppliers/account-summary', () => ({
	getSupplierAccountTotals: jest.fn(),
}));

const totals = {
	totalPurchasesArs: 1000,
	totalPaymentsArs: 400,
	balanceArs: 600,
	pendingCount: 2,
	paidCount: 1,
};

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((res) => {
		resolve = res;
	});
	return { promise, resolve };
}

describe('useSupplierAccountTotals', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('does not fetch while closed', () => {
		renderHook(() => useSupplierAccountTotals(3, false));

		expect(getSupplierAccountTotals).not.toHaveBeenCalled();
	});

	it('fetches totals for the supplier once open', async () => {
		(getSupplierAccountTotals as jest.Mock).mockResolvedValue({ data: totals, error: null });

		const { result } = renderHook(() => useSupplierAccountTotals(3, true));

		await waitFor(() => expect(result.current.totals).toEqual(totals));
		expect(getSupplierAccountTotals).toHaveBeenCalledWith(3);
	});

	it('ignores a stale response that resolves after a fresher fetch wins', async () => {
		const first = deferred<{ data: typeof totals; error: null }>();
		const freshTotals = { ...totals, pendingCount: 99 };
		(getSupplierAccountTotals as jest.Mock)
			.mockImplementationOnce(() => first.promise)
			.mockResolvedValueOnce({ data: freshTotals, error: null });

		const { result, rerender } = renderHook(
			({ supplierId }) => useSupplierAccountTotals(supplierId, true),
			{ initialProps: { supplierId: 3 } }
		);
		await waitFor(() => expect(getSupplierAccountTotals).toHaveBeenCalledWith(3));

		rerender({ supplierId: 4 });
		await waitFor(() => expect(getSupplierAccountTotals).toHaveBeenCalledWith(4));
		await waitFor(() => expect(result.current.totals).toEqual(freshTotals));

		first.resolve({ data: totals, error: null });
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(result.current.totals).toEqual(freshTotals);
	});

	it('shows a destructive toast and clears loading when the fetch fails', async () => {
		(getSupplierAccountTotals as jest.Mock).mockResolvedValue({
			data: null,
			error: { message: 'boom' },
		});

		const { result } = renderHook(() => useSupplierAccountTotals(3, true));

		await waitFor(() => expect(result.current.loadingTotals).toBe(false));
		expect(result.current.totals).toBeNull();
		expect(mockToast).toHaveBeenCalledWith(
			expect.objectContaining({ title: 'Error', variant: 'destructive' })
		);
	});

	it('invalidateAndReset clears totals and ignores any in-flight response', async () => {
		const first = deferred<{ data: typeof totals; error: null }>();
		(getSupplierAccountTotals as jest.Mock).mockImplementation(() => first.promise);

		const { result } = renderHook(() => useSupplierAccountTotals(3, true));
		await waitFor(() => expect(getSupplierAccountTotals).toHaveBeenCalledTimes(1));

		result.current.invalidateAndReset();
		first.resolve({ data: totals, error: null });
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(result.current.totals).toBeNull();
	});
});
