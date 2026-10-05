import { renderHook, waitFor } from '@testing-library/react';
import { useSupplierPurchasesTab } from '@/hooks/suppliers/use-supplier-purchases-tab';
import { listSupplierPurchasesPage } from '@/lib/suppliers/purchases-suppliers';
import { listFilesByPurchaseSupplierIds } from '@/lib/suppliers/files-purchases-suppliers';

jest.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast: jest.fn() }) }));
jest.mock('@/lib/error-translator', () => ({ translateError: jest.fn() }));
jest.mock('@/lib/suppliers/purchases-suppliers', () => ({
	listSupplierPurchasesPage: jest.fn(),
}));
jest.mock('@/lib/suppliers/files-purchases-suppliers', () => ({
	listFilesByPurchaseSupplierIds: jest.fn(),
}));

const purchaseA = {
	id: 11,
	created_at: '2026-01-10',
	amount_ars: 1000,
	supplier_id: 3,
	notes: null,
	totalPaidArs: 0,
	balanceArs: 1000,
};
const purchaseB = { ...purchaseA, id: 12, created_at: '2026-01-05' };

function page(purchases: (typeof purchaseA)[], totalCount: number) {
	return { data: { purchases, totalCount }, error: null };
}

describe('useSupplierPurchasesTab', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(listFilesByPurchaseSupplierIds as jest.Mock).mockResolvedValue({ data: [], error: null });
	});

	it('fetches page 1 immediately when it is the current tab', async () => {
		(listSupplierPurchasesPage as jest.Mock).mockResolvedValue(page([purchaseA], 1));

		const { result } = renderHook(() =>
			useSupplierPurchasesTab({
				supplierId: 3,
				status: 'pending',
				from: '',
				to: '',
				isCurrentTab: true,
			})
		);

		await waitFor(() => expect(result.current.purchases).toEqual([purchaseA]));
		expect(listSupplierPurchasesPage).toHaveBeenCalledWith(
			expect.objectContaining({ supplierId: 3, status: 'pending', offset: 0, limit: 20 })
		);
	});

	it('does not fetch while it is not the current tab', async () => {
		(listSupplierPurchasesPage as jest.Mock).mockResolvedValue(page([], 0));

		renderHook(() =>
			useSupplierPurchasesTab({
				supplierId: 3,
				status: 'paid',
				from: '',
				to: '',
				isCurrentTab: false,
			})
		);

		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(listSupplierPurchasesPage).not.toHaveBeenCalled();
	});

	it('fetches the first time it becomes the current tab', async () => {
		(listSupplierPurchasesPage as jest.Mock).mockResolvedValue(page([purchaseB], 1));

		const { result, rerender } = renderHook(
			({ isCurrentTab }) =>
				useSupplierPurchasesTab({
					supplierId: 3,
					status: 'paid',
					from: '',
					to: '',
					isCurrentTab,
				}),
			{ initialProps: { isCurrentTab: false } }
		);
		expect(listSupplierPurchasesPage).not.toHaveBeenCalled();

		rerender({ isCurrentTab: true });

		await waitFor(() => expect(result.current.purchases).toEqual([purchaseB]));
	});

	it('loadMore appends the next page and hasMore turns false once totalCount is reached', async () => {
		(listSupplierPurchasesPage as jest.Mock).mockImplementation(async ({ offset }) =>
			offset === 0 ? page([purchaseA], 2) : page([purchaseB], 2)
		);

		const { result } = renderHook(() =>
			useSupplierPurchasesTab({
				supplierId: 3,
				status: 'pending',
				from: '',
				to: '',
				isCurrentTab: true,
			})
		);
		await waitFor(() => expect(result.current.purchases).toEqual([purchaseA]));
		expect(result.current.hasMore).toBe(true);

		result.current.loadMore();

		await waitFor(() => expect(result.current.purchases).toEqual([purchaseA, purchaseB]));
		expect(result.current.hasMore).toBe(false);
	});

	it('loadMore de-dupes a repeated id so offset drift cannot double a card', async () => {
		(listSupplierPurchasesPage as jest.Mock).mockImplementation(async ({ offset }) =>
			offset === 0 ? page([purchaseA], 2) : page([purchaseA, purchaseB], 2)
		);

		const { result } = renderHook(() =>
			useSupplierPurchasesTab({
				supplierId: 3,
				status: 'pending',
				from: '',
				to: '',
				isCurrentTab: true,
			})
		);
		await waitFor(() => expect(result.current.purchases).toEqual([purchaseA]));

		result.current.loadMore();

		await waitFor(() => expect(result.current.purchases).toEqual([purchaseA, purchaseB]));
	});

	it('resets to page 1 immediately when the date filter changes on the current tab', async () => {
		(listSupplierPurchasesPage as jest.Mock).mockResolvedValue(page([purchaseA], 1));

		const { result, rerender } = renderHook(
			({ from }) =>
				useSupplierPurchasesTab({
					supplierId: 3,
					status: 'pending',
					from,
					to: '',
					isCurrentTab: true,
				}),
			{ initialProps: { from: '' } }
		);
		await waitFor(() => expect(listSupplierPurchasesPage).toHaveBeenCalledTimes(1));

		rerender({ from: '2026-01-01' });

		await waitFor(() => expect(listSupplierPurchasesPage).toHaveBeenCalledTimes(2));
		expect(listSupplierPurchasesPage).toHaveBeenLastCalledWith(
			expect.objectContaining({ from: '2026-01-01', offset: 0 })
		);
	});

	it('marks the tab stale on a filter change while it is not current, and fetches once it becomes current', async () => {
		(listSupplierPurchasesPage as jest.Mock).mockResolvedValue(page([purchaseB], 1));

		const { rerender } = renderHook(
			({ from, isCurrentTab }) =>
				useSupplierPurchasesTab({
					supplierId: 3,
					status: 'paid',
					from,
					to: '',
					isCurrentTab,
				}),
			{ initialProps: { from: '', isCurrentTab: false } }
		);
		expect(listSupplierPurchasesPage).not.toHaveBeenCalled();

		rerender({ from: '2026-01-01', isCurrentTab: false });
		expect(listSupplierPurchasesPage).not.toHaveBeenCalled();

		rerender({ from: '2026-01-01', isCurrentTab: true });
		await waitFor(() =>
			expect(listSupplierPurchasesPage).toHaveBeenCalledWith(
				expect.objectContaining({ from: '2026-01-01' })
			)
		);
	});

	it('invalidate forces a refetch the next time the tab becomes current', async () => {
		(listSupplierPurchasesPage as jest.Mock).mockResolvedValue(page([purchaseA], 1));

		const { result, rerender } = renderHook(
			({ isCurrentTab }) =>
				useSupplierPurchasesTab({
					supplierId: 3,
					status: 'pending',
					from: '',
					to: '',
					isCurrentTab,
				}),
			{ initialProps: { isCurrentTab: true } }
		);
		await waitFor(() => expect(listSupplierPurchasesPage).toHaveBeenCalledTimes(1));

		rerender({ isCurrentTab: false });
		result.current.invalidate();
		expect(listSupplierPurchasesPage).toHaveBeenCalledTimes(1);

		rerender({ isCurrentTab: true });
		await waitFor(() => expect(listSupplierPurchasesPage).toHaveBeenCalledTimes(2));
	});

	it('reset clears the list and ignores a response in flight at the time of reset', async () => {
		let release!: (value: any) => void;
		(listSupplierPurchasesPage as jest.Mock).mockImplementation(
			() => new Promise((resolve) => (release = resolve))
		);

		const { result } = renderHook(() =>
			useSupplierPurchasesTab({
				supplierId: 3,
				status: 'pending',
				from: '',
				to: '',
				isCurrentTab: true,
			})
		);
		await waitFor(() => expect(listSupplierPurchasesPage).toHaveBeenCalledTimes(1));

		result.current.reset();
		release(page([purchaseA], 1));
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(result.current.purchases).toEqual([]);
		expect(result.current.totalCount).toBe(0);
	});

	it('batches purchase file counts for the loaded page', async () => {
		(listSupplierPurchasesPage as jest.Mock).mockResolvedValue(page([purchaseA], 1));
		(listFilesByPurchaseSupplierIds as jest.Mock).mockResolvedValue({
			data: [
				{ id: 1, purchase_supplier_id: 11 },
				{ id: 2, purchase_supplier_id: 11 },
			],
			error: null,
		});

		const { result } = renderHook(() =>
			useSupplierPurchasesTab({
				supplierId: 3,
				status: 'pending',
				from: '',
				to: '',
				isCurrentTab: true,
			})
		);

		await waitFor(() => expect(result.current.fileCounts.get(11)).toBe(2));
		expect(listFilesByPurchaseSupplierIds).toHaveBeenCalledWith([11]);
	});
});
