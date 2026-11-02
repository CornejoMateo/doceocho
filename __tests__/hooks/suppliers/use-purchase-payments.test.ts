import { renderHook, waitFor, act } from '@testing-library/react';
import { usePurchasePayments } from '@/hooks/suppliers/use-purchase-payments';
import { listPaymentsByExpenseIds } from '@/lib/payments/payments';
import { listFilesByPaymentIds } from '@/lib/payments/files-payments';

jest.mock('@/lib/payments/payments', () => ({
	listPaymentsByExpenseIds: jest.fn(),
}));
jest.mock('@/lib/payments/files-payments', () => ({
	listFilesByPaymentIds: jest.fn(),
}));

const payment = {
	id: 88,
	created_at: '2026-01-20',
	date: '2026-01-20',
	amount: 1000,
	bank_account_id: null,
	payment_method_id: null,
	expense_id: 11,
	description: null,
};

describe('usePurchasePayments', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(listFilesByPaymentIds as jest.Mock).mockResolvedValue({ data: [], error: null });
	});

	it('loads payments for a purchase on demand, scoped to that purchase id', async () => {
		(listPaymentsByExpenseIds as jest.Mock).mockResolvedValue({
			data: [payment],
			error: null,
		});

		const { result } = renderHook(() => usePurchasePayments());
		await act(async () => {
			await result.current.loadPayments(11);
		});

		expect(listPaymentsByExpenseIds).toHaveBeenCalledWith([11]);
		expect(result.current.paymentsByPurchaseId.get(11)).toEqual([payment]);
	});

	it('ensureLoaded skips a purchase that already has payments cached', async () => {
		(listPaymentsByExpenseIds as jest.Mock).mockResolvedValue({
			data: [payment],
			error: null,
		});
		const { result } = renderHook(() => usePurchasePayments());
		await act(async () => {
			await result.current.loadPayments(11);
		});

		act(() => {
			result.current.ensureLoaded(11);
		});

		expect(listPaymentsByExpenseIds).toHaveBeenCalledTimes(1);
	});

	it('exposes an error for the purchase and clears it on a successful retry', async () => {
		(listPaymentsByExpenseIds as jest.Mock)
			.mockResolvedValueOnce({ data: null, error: { message: 'boom' } })
			.mockResolvedValueOnce({ data: [payment], error: null });

		const { result } = renderHook(() => usePurchasePayments());
		await act(async () => {
			await result.current.loadPayments(11);
		});
		expect(result.current.errorByPurchaseId.get(11)).toEqual({ message: 'boom' });
		expect(result.current.loadingPurchaseIds.has(11)).toBe(false);

		await act(async () => {
			await result.current.loadPayments(11);
		});
		expect(result.current.errorByPurchaseId.has(11)).toBe(false);
		expect(result.current.paymentsByPurchaseId.get(11)).toEqual([payment]);
	});

	it('batches payment file counts once the payments resolve', async () => {
		(listPaymentsByExpenseIds as jest.Mock).mockResolvedValue({
			data: [payment],
			error: null,
		});
		(listFilesByPaymentIds as jest.Mock).mockResolvedValue({
			data: [{ id: 1, payment_id: 88 }],
			error: null,
		});

		const { result } = renderHook(() => usePurchasePayments());
		await act(async () => {
			await result.current.loadPayments(11);
		});

		expect(listFilesByPaymentIds).toHaveBeenCalledWith([88]);
		expect(result.current.paymentFileCounts.get(88)).toBe(1);
	});

	it('dropPurchase removes a purchase from the cache and its error', async () => {
		(listPaymentsByExpenseIds as jest.Mock).mockResolvedValue({
			data: null,
			error: { message: 'boom' },
		});
		const { result } = renderHook(() => usePurchasePayments());
		await act(async () => {
			await result.current.loadPayments(11);
		});

		act(() => {
			result.current.dropPurchase(11);
		});

		expect(result.current.paymentsByPurchaseId.has(11)).toBe(false);
		expect(result.current.errorByPurchaseId.has(11)).toBe(false);
	});

	it('ignores a stale response from a retry superseded by a newer load for the same purchase', async () => {
		let releaseFirst!: (value: any) => void;
		(listPaymentsByExpenseIds as jest.Mock)
			.mockImplementationOnce(() => new Promise((resolve) => (releaseFirst = resolve)))
			.mockResolvedValueOnce({ data: [payment], error: null });

		const { result } = renderHook(() => usePurchasePayments());
		let firstLoad: Promise<void>;
		act(() => {
			firstLoad = result.current.loadPayments(11);
		});
		await act(async () => {
			await result.current.loadPayments(11);
		});

		releaseFirst({ data: [], error: null });
		await act(async () => {
			await firstLoad;
		});

		expect(result.current.paymentsByPurchaseId.get(11)).toEqual([payment]);
	});
});
