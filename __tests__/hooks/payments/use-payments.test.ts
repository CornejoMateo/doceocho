import { renderHook } from '@testing-library/react';
import { usePayments } from '@/hooks/payments/use-payments';
import { useCollectionPaymentTab } from '@/hooks/collection-payment/use-collection-payment-tab';
import { createPayment, deletePayment, listPayments, updatePayment } from '@/lib/payments/payments';
import { listSuppliers } from '@/lib/suppliers/suppliers';

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

describe('usePayments', () => {
	beforeEach(() => jest.clearAllMocks());

	it('configures useCollectionPaymentTab with the payment category kind and labels', () => {
		renderHook(() => usePayments() as any);

		expect(useCollectionPaymentTab).toHaveBeenCalledWith(
			expect.objectContaining({
				categoryKind: 'payment',
				labels: expect.objectContaining({ entityLabel: 'pago', createdToast: 'Pago creado' }),
			})
		);
	});

	it('listEntries maps PaymentWithDetails rows to CollectionPaymentEntry, using supplier as the party', async () => {
		(listPayments as jest.Mock).mockResolvedValue({
			data: [
				{
					id: 1,
					date: '2026-05-10',
					receipt_number: 'R-1',
					work_id: 7,
					work_name: 'Obra Norte',
					supplier_id: 3,
					supplier_name: 'Acme SRL',
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
		const { result } = renderHook(() => usePayments() as any);

		const res = await result.current.listEntries(2026);

		expect(listPayments).toHaveBeenCalledWith({ year: 2026 });
		expect(res.data?.[0]).toEqual(
			expect.objectContaining({ id: 1, party_id: 3, party_name: 'Acme SRL' })
		);
	});

	it('listEntries passes errors through without mapping', async () => {
		const err = { message: 'boom' };
		(listPayments as jest.Mock).mockResolvedValue({ data: null, error: err });
		const { result } = renderHook(() => usePayments() as any);

		expect(await result.current.listEntries(2026)).toEqual({ data: null, error: err });
	});

	it('createEntry maps party_id back to supplier_id', async () => {
		(createPayment as jest.Mock).mockResolvedValue({ error: null });
		const { result } = renderHook(() => usePayments() as any);

		await result.current.createEntry({
			date: '2026-05-10',
			receipt_number: null,
			work_id: null,
			party_id: 3,
			category_id: 10,
			description: null,
			amount: 1000,
			payment_method_id: 2,
			bank_account_id: null,
		});

		expect(createPayment).toHaveBeenCalledWith(expect.objectContaining({ supplier_id: 3 }));
	});

	it('updateEntry maps party_id back to supplier_id and forwards the id', async () => {
		(updatePayment as jest.Mock).mockResolvedValue({ error: null });
		const { result } = renderHook(() => usePayments() as any);

		await result.current.updateEntry(9, {
			date: '2026-05-10',
			receipt_number: null,
			work_id: null,
			party_id: 3,
			category_id: 10,
			description: null,
			amount: 1000,
			payment_method_id: 2,
			bank_account_id: null,
		});

		expect(updatePayment).toHaveBeenCalledWith(9, expect.objectContaining({ supplier_id: 3 }));
	});

	it('deleteEntry delegates directly to deletePayment', () => {
		const { result } = renderHook(() => usePayments() as any);

		expect(result.current.deleteEntry).toBe(deletePayment);
	});

	it('listParties maps suppliers to {id, name}', async () => {
		(listSuppliers as jest.Mock).mockResolvedValue({
			data: [{ id: 3, name: 'Acme SRL' }],
			error: null,
		});
		const { result } = renderHook(() => usePayments() as any);

		const res = await result.current.listParties();

		expect(res.data).toEqual([{ id: 3, name: 'Acme SRL' }]);
	});

	it('listParties passes errors through', async () => {
		const err = { message: 'boom' };
		(listSuppliers as jest.Mock).mockResolvedValue({ data: null, error: err });
		const { result } = renderHook(() => usePayments() as any);

		expect(await result.current.listParties()).toEqual({ data: null, error: err });
	});
});
