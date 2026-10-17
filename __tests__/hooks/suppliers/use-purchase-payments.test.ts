import { renderHook, waitFor, act } from '@testing-library/react';
import { usePurchasePayments } from '@/hooks/suppliers/use-purchase-payments';
import { listPaymentsSuppliersByPurchaseIds } from '@/lib/suppliers/payments-suppliers';
import { listFilesByPaymentSupplierIds } from '@/lib/suppliers/files-payments-suppliers';

jest.mock('@/lib/suppliers/payments-suppliers', () => ({
	listPaymentsSuppliersByPurchaseIds: jest.fn(),
}));
jest.mock('@/lib/suppliers/files-payments-suppliers', () => ({
	listFilesByPaymentSupplierIds: jest.fn(),
}));

const payment = {
	id: 88,
	created_at: '2026-01-20',
	amount_ars: 1000,
	bank_account_id: null,
	payment_method_id: null,
	purchase_supplier_id: 11,
	notes: null,
};

describe('usePurchasePayments', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(listFilesByPaymentSupplierIds as jest.Mock).mockResolvedValue({ data: [], error: null });
	});

	it('loads payments for a purchase on demand, scoped to that purchase id', async () => {
		(listPaymentsSuppliersByPurchaseIds as jest.Mock).mockResolvedValue({
			data: [payment],
			error: null,
		});

		const { result } = renderHook(() => usePurchasePayments());
		await act(async () => {
			await result.current.loadPayments(11);
		});

		expect(listPaymentsSuppliersByPurchaseIds).toHaveBeenCalledWith([11]);
		expect(result.current.paymentsByPurchaseId.get(11)).toEqual([payment]);
	});

	it('ensureLoaded skips a purchase that already has payments cached', async () => {
		(listPaymentsSuppliersByPurchaseIds as jest.Mock).mockResolvedValue({
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

		expect(listPaymentsSuppliersByPurchaseIds).toHaveBeenCalledTimes(1);
	});

	it('exposes an error for the purchase and clears it on a successful retry', async () => {
		(listPaymentsSuppliersByPurchaseIds as jest.Mock)
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
		(listPaymentsSuppliersByPurchaseIds as jest.Mock).mockResolvedValue({
			data: [payment],
			error: null,
		});
		(listFilesByPaymentSupplierIds as jest.Mock).mockResolvedValue({
			data: [{ id: 1, payment_supplier_id: 88 }],
			error: null,
		});

		const { result } = renderHook(() => usePurchasePayments());
		await act(async () => {
			await result.current.loadPayments(11);
		});

		expect(listFilesByPaymentSupplierIds).toHaveBeenCalledWith([88]);
		expect(result.current.paymentFileCounts.get(88)).toBe(1);
	});

	it('dropPurchase removes a purchase from the cache and its error', async () => {
		(listPaymentsSuppliersByPurchaseIds as jest.Mock).mockResolvedValue({
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
		(listPaymentsSuppliersByPurchaseIds as jest.Mock)
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
