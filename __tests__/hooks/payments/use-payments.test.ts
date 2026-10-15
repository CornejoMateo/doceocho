import { renderHook } from '@testing-library/react';
import { usePayments } from '@/hooks/payments/use-payments';
import { useCollectionPaymentTab } from '@/hooks/collection-payment/use-collection-payment-tab';
import { createPayment, deletePayment, listPayments, updatePayment } from '@/lib/payments/payments';
import { listSuppliers } from '@/lib/suppliers/suppliers';
import {
	createPaymentSupplier,
	deletePaymentSupplier,
	listPaymentsSuppliersForYear,
	updatePaymentSupplier,
} from '@/lib/suppliers/payments-suppliers';
import { listPurchasesSuppliersWithBalance } from '@/lib/suppliers/purchases-suppliers';

jest.mock('@/hooks/collection-payment/use-collection-payment-tab', () => ({
	useCollectionPaymentTab: jest.fn((config) => config),
}));
jest.mock('@/lib/payments/payments', () => ({
	listPayments: jest.fn(),
	createPayment: jest.fn(),
	updatePayment: jest.fn(),
	deletePayment: jest.fn(),
}));
jest.mock('@/lib/suppliers/suppliers', () => ({
	listSuppliers: jest.fn(),
}));
jest.mock('@/lib/suppliers/payments-suppliers', () => ({
	createPaymentSupplier: jest.fn(),
	updatePaymentSupplier: jest.fn(),
	deletePaymentSupplier: jest.fn(),
	listPaymentsSuppliersForYear: jest.fn(),
}));
jest.mock('@/lib/suppliers/purchases-suppliers', () => ({
	listPurchasesSuppliersWithBalance: jest.fn(),
}));

describe('usePayments', () => {
	beforeEach(() => jest.clearAllMocks());

	it('configures useCollectionPaymentTab with the payment category kind, partyOptional and labels', () => {
		renderHook(() => usePayments() as any);

		expect(useCollectionPaymentTab).toHaveBeenCalledWith(
			expect.objectContaining({
				categoryKind: 'payment',
				partyOptional: true,
				labels: expect.objectContaining({ entityLabel: 'pago', createdToast: 'Pago creado' }),
			})
		);
	});

	describe('listEntries', () => {
		it('merges general payments and supplier payments, sorted by date desc', async () => {
			(listPayments as jest.Mock).mockResolvedValue({
				data: [
					{
						id: 1,
						date: '2026-05-10',
						receipt_number: 'R-1',
						work_id: 7,
						work_name: 'Obra Norte',
						category_id: 10,
						category_name: 'Materiales',
						description: 'Cemento',
						amount: 1000,
						payment_method_id: 2,
						payment_method_name: 'Transferencia',
						bank_account_id: null,
						bank_account_name: null,
					},
				],
				error: null,
			});
			(listPaymentsSuppliersForYear as jest.Mock).mockResolvedValue({
				data: [
					{
						id: 1,
						paid_date: '2026-06-20',
						receipt_number: null,
						work_id: null,
						work_name: null,
						category_id: null,
						category_name: null,
						notes: 'Pago a proveedor',
						amount_ars: 500,
						payment_method_id: 3,
						payment_method_name: 'Efectivo',
						bank_account_id: null,
						bank_account_name: null,
						purchase_supplier_id: 8,
						supplier_id: 4,
						supplier_name: 'Acme SRL',
					},
				],
				error: null,
			});
			const { result } = renderHook(() => usePayments() as any);

			const res = await result.current.listEntries(2026);

			expect(listPayments).toHaveBeenCalledWith({ year: 2026 });
			expect(listPaymentsSuppliersForYear).toHaveBeenCalledWith(2026);
			expect(res.data).toHaveLength(2);
			// Supplier payment is dated later, so it comes first.
			expect(res.data?.[0]).toEqual(
				expect.objectContaining({
					id: 1,
					date: '2026-06-20',
					source: 'supplier',
					party_id: 4,
					party_name: 'Acme SRL',
					purchase_supplier_id: 8,
					description: 'Pago a proveedor',
					amount: 500,
				})
			);
			expect(res.data?.[1]).toEqual(
				expect.objectContaining({
					id: 1,
					date: '2026-05-10',
					source: 'general',
					party_id: null,
					party_name: null,
				})
			);
		});

		it('breaks ties on equal dates by created_at desc, then id desc', async () => {
			(listPayments as jest.Mock).mockResolvedValue({
				data: [
					{
						id: 5,
						date: '2026-05-10',
						created_at: '2026-05-10T10:00:00Z',
						receipt_number: null,
						work_id: null,
						work_name: null,
						category_id: null,
						category_name: null,
						description: 'General A',
						amount: 100,
						payment_method_id: 2,
						payment_method_name: 'Transferencia',
						bank_account_id: null,
						bank_account_name: null,
					},
					{
						id: 2,
						date: '2026-05-10',
						created_at: '2026-05-10T12:00:00Z',
						receipt_number: null,
						work_id: null,
						work_name: null,
						category_id: null,
						category_name: null,
						description: 'General B',
						amount: 200,
						payment_method_id: 2,
						payment_method_name: 'Transferencia',
						bank_account_id: null,
						bank_account_name: null,
					},
					{
						id: 9,
						date: '2026-05-10',
						created_at: '2026-05-10T12:00:00Z',
						receipt_number: null,
						work_id: null,
						work_name: null,
						category_id: null,
						category_name: null,
						description: 'General C',
						amount: 300,
						payment_method_id: 2,
						payment_method_name: 'Transferencia',
						bank_account_id: null,
						bank_account_name: null,
					},
				],
				error: null,
			});
			(listPaymentsSuppliersForYear as jest.Mock).mockResolvedValue({ data: [], error: null });
			const { result } = renderHook(() => usePayments() as any);

			const res = await result.current.listEntries(2026);

			// Same date: newest created_at first (B/C over A); same created_at: higher id first (C over B).
			expect(res.data?.map((e: any) => e.description)).toEqual([
				'General C',
				'General B',
				'General A',
			]);
		});

		it('tie-breaks by source when date, created_at and id are all equal across sources', async () => {
			(listPayments as jest.Mock).mockResolvedValue({
				data: [
					{
						id: 5,
						date: '2026-05-10',
						created_at: '2026-05-10T10:00:00Z',
						receipt_number: null,
						work_id: null,
						work_name: null,
						category_id: null,
						category_name: null,
						description: 'General',
						amount: 100,
						payment_method_id: 2,
						payment_method_name: 'Transferencia',
						bank_account_id: null,
						bank_account_name: null,
					},
				],
				error: null,
			});
			(listPaymentsSuppliersForYear as jest.Mock).mockResolvedValue({
				data: [
					{
						id: 5,
						paid_date: '2026-05-10',
						created_at: '2026-05-10T10:00:00Z',
						receipt_number: null,
						work_id: null,
						work_name: null,
						category_id: null,
						category_name: null,
						notes: 'Proveedor',
						amount_ars: 100,
						payment_method_id: 3,
						payment_method_name: 'Efectivo',
						bank_account_id: null,
						bank_account_name: null,
						purchase_supplier_id: 8,
						supplier_id: 4,
						supplier_name: 'Acme SRL',
					},
				],
				error: null,
			});
			const { result } = renderHook(() => usePayments() as any);

			const res = await result.current.listEntries(2026);

			expect(res.data).toHaveLength(2);
			// 'general'.localeCompare('supplier') < 0, so the general entry comes first.
			expect(res.data?.[0].source).toBe('general');
			expect(res.data?.[1].source).toBe('supplier');
		});

		it('passes through a general-payments error without calling the supplier source', async () => {
			const err = { message: 'boom' };
			(listPayments as jest.Mock).mockResolvedValue({ data: null, error: err });
			(listPaymentsSuppliersForYear as jest.Mock).mockResolvedValue({ data: [], error: null });
			const { result } = renderHook(() => usePayments() as any);

			expect(await result.current.listEntries(2026)).toEqual({ data: null, error: err });
		});

		it('passes through a supplier-payments error', async () => {
			const err = { message: 'boom' };
			(listPayments as jest.Mock).mockResolvedValue({ data: [], error: null });
			(listPaymentsSuppliersForYear as jest.Mock).mockResolvedValue({ data: null, error: err });
			const { result } = renderHook(() => usePayments() as any);

			expect(await result.current.listEntries(2026)).toEqual({ data: null, error: err });
		});
	});

	describe('createEntry', () => {
		it('routes to payments when no party/purchase is set', async () => {
			(createPayment as jest.Mock).mockResolvedValue({ error: null });
			const { result } = renderHook(() => usePayments() as any);

			await result.current.createEntry({
				date: '2026-05-10',
				receipt_number: null,
				work_id: null,
				party_id: null,
				purchase_supplier_id: null,
				category_id: 10,
				description: null,
				amount: 1000,
				payment_method_id: 2,
				bank_account_id: null,
			});

			expect(createPayment).toHaveBeenCalled();
			expect(createPaymentSupplier).not.toHaveBeenCalled();
		});

		it('routes to payments_suppliers when party and purchase are set', async () => {
			(createPaymentSupplier as jest.Mock).mockResolvedValue({ error: null });
			const { result } = renderHook(() => usePayments() as any);

			await result.current.createEntry({
				date: '2026-05-10',
				receipt_number: 'R-1',
				work_id: null,
				party_id: 3,
				purchase_supplier_id: 8,
				category_id: null,
				description: 'Nota',
				amount: 1000,
				payment_method_id: 2,
				bank_account_id: null,
			});

			expect(createPaymentSupplier).toHaveBeenCalledWith(
				expect.objectContaining({
					paid_date: '2026-05-10',
					amount_ars: 1000,
					purchase_supplier_id: 8,
					notes: 'Nota',
				})
			);
			expect(createPayment).not.toHaveBeenCalled();
		});
	});

	describe('updateEntry', () => {
		it('routes to updatePayment for a general-origin entry', async () => {
			(updatePayment as jest.Mock).mockResolvedValue({ error: null });
			const { result } = renderHook(() => usePayments() as any);
			const entry = { id: 9, source: 'general' } as any;

			await result.current.updateEntry(
				9,
				{
					date: '2026-05-10',
					receipt_number: null,
					work_id: null,
					party_id: null,
					category_id: 10,
					description: null,
					amount: 1000,
					payment_method_id: 2,
					bank_account_id: null,
				},
				entry
			);

			expect(updatePayment).toHaveBeenCalledWith(9, expect.objectContaining({ amount: 1000 }));
			expect(updatePaymentSupplier).not.toHaveBeenCalled();
		});

		it('routes to updatePaymentSupplier for a supplier-origin entry', async () => {
			(updatePaymentSupplier as jest.Mock).mockResolvedValue({ error: null });
			const { result } = renderHook(() => usePayments() as any);
			const entry = { id: 9, source: 'supplier' } as any;

			await result.current.updateEntry(
				9,
				{
					date: '2026-05-10',
					receipt_number: null,
					work_id: null,
					party_id: 3,
					purchase_supplier_id: 8,
					category_id: null,
					description: 'Nota',
					amount: 1000,
					payment_method_id: 2,
					bank_account_id: null,
				},
				entry
			);

			expect(updatePaymentSupplier).toHaveBeenCalledWith(
				9,
				expect.objectContaining({ purchase_supplier_id: 8, amount_ars: 1000 })
			);
			expect(updatePayment).not.toHaveBeenCalled();
		});
	});

	describe('deleteEntry', () => {
		it('routes to deletePayment for a general-origin entry', async () => {
			const { result } = renderHook(() => usePayments() as any);

			await result.current.deleteEntry(9, { source: 'general' });

			expect(deletePayment).toHaveBeenCalledWith(9);
			expect(deletePaymentSupplier).not.toHaveBeenCalled();
		});

		it('routes to deletePaymentSupplier (RPC wrapper) for a supplier-origin entry', async () => {
			const { result } = renderHook(() => usePayments() as any);

			await result.current.deleteEntry(9, { source: 'supplier' });

			expect(deletePaymentSupplier).toHaveBeenCalledWith(9);
			expect(deletePayment).not.toHaveBeenCalled();
		});
	});

	describe('listParties', () => {
		it('maps suppliers to {id, name}', async () => {
			(listSuppliers as jest.Mock).mockResolvedValue({
				data: [{ id: 3, name: 'Acme SRL' }],
				error: null,
			});
			const { result } = renderHook(() => usePayments() as any);

			const res = await result.current.listParties();

			expect(res.data).toEqual([{ id: 3, name: 'Acme SRL' }]);
		});

		it('passes errors through', async () => {
			const err = { message: 'boom' };
			(listSuppliers as jest.Mock).mockResolvedValue({ data: null, error: err });
			const { result } = renderHook(() => usePayments() as any);

			expect(await result.current.listParties()).toEqual({ data: null, error: err });
		});
	});

	describe('loadPurchases', () => {
		it('marks a fully paid purchase as settled, with "(saldada)" in the label', async () => {
			(listPurchasesSuppliersWithBalance as jest.Mock).mockResolvedValue({
				data: [
					{
						id: 8,
						created_at: '2026-05-01T00:00:00Z',
						amount_ars: 1000,
						supplier_id: 3,
						notes: 'Compra madera',
						totalPaidArs: 1000,
						balanceArs: 0,
					},
				],
				error: null,
			});
			const { result } = renderHook(() => usePayments() as any);

			const res = await result.current.loadPurchases(3);

			expect(listPurchasesSuppliersWithBalance).toHaveBeenCalledWith(3);
			expect(res.data?.[0]).toEqual(
				expect.objectContaining({
					id: 8,
					isSettled: true,
					name: expect.stringContaining('(saldada)'),
				})
			);
		});

		it('leaves a pending purchase unsettled and shows the remaining balance in the label', async () => {
			(listPurchasesSuppliersWithBalance as jest.Mock).mockResolvedValue({
				data: [
					{
						id: 8,
						created_at: '2026-05-01T00:00:00Z',
						amount_ars: 1000,
						supplier_id: 3,
						notes: 'Compra madera',
						totalPaidArs: 400,
						balanceArs: 600,
					},
				],
				error: null,
			});
			const { result } = renderHook(() => usePayments() as any);

			const res = await result.current.loadPurchases(3);

			expect(res.data?.[0].isSettled).toBe(false);
			expect(res.data?.[0].name).not.toContain('(saldada)');
			expect(res.data?.[0].name).toContain('Saldo');
		});

		it('excludes the payment being edited from its own purchase balance (no self-caused "saldada")', async () => {
			(listPurchasesSuppliersWithBalance as jest.Mock).mockResolvedValue({
				data: [
					{
						id: 8,
						created_at: '2026-05-01T00:00:00Z',
						amount_ars: 1000,
						supplier_id: 3,
						notes: 'Compra madera',
						totalPaidArs: 1000,
						balanceArs: 0,
					},
				],
				error: null,
			});
			const { result } = renderHook(() => usePayments() as any);

			const res = await result.current.loadPurchases(3, { purchaseId: 8, amount: 1000 });

			expect(res.data?.[0].isSettled).toBe(false);
		});

		it('passes errors through', async () => {
			const err = { message: 'boom' };
			(listPurchasesSuppliersWithBalance as jest.Mock).mockResolvedValue({
				data: null,
				error: err,
			});
			const { result } = renderHook(() => usePayments() as any);

			expect(await result.current.loadPurchases(3)).toEqual({ data: null, error: err });
		});
	});
});
