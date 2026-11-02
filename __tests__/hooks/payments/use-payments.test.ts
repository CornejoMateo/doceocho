import { renderHook } from '@testing-library/react';
import { usePayments } from '@/hooks/payments/use-payments';
import { useCollectionPaymentTab } from '@/hooks/collection-payment/use-collection-payment-tab';
import { createPayment, deletePayment, listPayments, updatePayment } from '@/lib/payments/payments';
import { listExpenses } from '@/lib/expenses/expenses';

jest.mock('@/hooks/collection-payment/use-collection-payment-tab', () => ({
	useCollectionPaymentTab: jest.fn((config) => config),
}));
jest.mock('@/lib/payments/payments', () => ({
	listPayments: jest.fn(),
	createPayment: jest.fn(),
	updatePayment: jest.fn(),
	deletePayment: jest.fn(),
}));
jest.mock('@/lib/expenses/expenses', () => ({
	listExpenses: jest.fn(),
}));

describe('usePayments', () => {
	beforeEach(() => jest.clearAllMocks());

	it('configures useCollectionPaymentTab with the payment category kind, hideParty and labels', () => {
		renderHook(() => usePayments() as any);

		expect(useCollectionPaymentTab).toHaveBeenCalledWith(
			expect.objectContaining({
				categoryKind: 'payment',
				hideParty: true,
				labels: expect.objectContaining({ entityLabel: 'pago', createdToast: 'Pago creado' }),
			})
		);
	});

	it('does not configure party/purchase routing (payments is single-source, no supplier picker)', () => {
		renderHook(() => usePayments() as any);

		const config = (useCollectionPaymentTab as jest.Mock).mock.calls[0][0];
		expect(config.listParties).toBeUndefined();
		expect(config.loadPurchases).toBeUndefined();
		expect(config.partyOptional).toBeUndefined();
	});

	it('configures paymentMethodOptional: true (Pagos only; Cobros stays required)', () => {
		renderHook(() => usePayments() as any);

		expect(useCollectionPaymentTab).toHaveBeenCalledWith(
			expect.objectContaining({ paymentMethodOptional: true })
		);
	});

	it('configures attachmentsKind: "payment" (Pagos only, enables staged uploads on create -- including the "Agregar pago" from Gasto flow, which also uses usePayments)', () => {
		renderHook(() => usePayments() as any);

		expect(useCollectionPaymentTab).toHaveBeenCalledWith(
			expect.objectContaining({ attachmentsKind: 'payment' })
		);
	});

	it('configures descriptionMaxLength: 2000 (payments.description allows the full length)', () => {
		renderHook(() => usePayments() as any);

		expect(useCollectionPaymentTab).toHaveBeenCalledWith(
			expect.objectContaining({ descriptionMaxLength: 2000 })
		);
	});

	describe('listEntries', () => {
		it('lists every payment from the single `payments` table, sorted by date desc', async () => {
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
						expense_id: null,
					},
				],
				error: null,
			});
			const { result } = renderHook(() => usePayments() as any);

			const res = await result.current.listEntries(2026);

			expect(listPayments).toHaveBeenCalledWith({ year: 2026 });
			expect(res.data).toHaveLength(1);
			expect(res.data?.[0]).toEqual(
				expect.objectContaining({
					id: 1,
					date: '2026-05-10',
					source: 'general',
					party_id: null,
					party_name: null,
					description: 'Cemento',
					amount: 1000,
				})
			);
		});

		it('passes a listPayments error through', async () => {
			const err = { message: 'boom' };
			(listPayments as jest.Mock).mockResolvedValue({ data: null, error: err });
			const { result } = renderHook(() => usePayments() as any);

			expect(await result.current.listEntries(2026)).toEqual({ data: null, error: err });
		});

		it('includes expense_id and a formatted expense_label when a payment is linked to an expense', async () => {
			(listPayments as jest.Mock).mockResolvedValue({
				data: [
					{
						id: 1,
						date: '2026-05-10',
						receipt_number: 'R-1',
						work_id: null,
						work_name: null,
						category_id: null,
						category_name: null,
						description: 'Pago de gasto',
						amount: 1000,
						payment_method_id: 2,
						payment_method_name: 'Transferencia',
						bank_account_id: null,
						bank_account_name: null,
						expense_id: 42,
						expense_date: '2026-04-01',
						expense_voucher_number: '0001-00000456',
						expense_description: 'Compra de cemento',
						expense_total_amount: 500,
					},
				],
				error: null,
			});
			const { result } = renderHook(() => usePayments() as any);

			const res = await result.current.listEntries(2026);

			expect(res.data?.[0]).toEqual(
				expect.objectContaining({
					expense_id: 42,
					expense_label: expect.stringContaining('0001-00000456'),
				})
			);
		});

		it('maps a payment with no linked expense to a null expense_label', async () => {
			(listPayments as jest.Mock).mockResolvedValue({
				data: [
					{
						id: 1,
						date: '2026-05-10',
						receipt_number: null,
						work_id: null,
						work_name: null,
						category_id: null,
						category_name: null,
						description: null,
						amount: 1000,
						payment_method_id: 2,
						payment_method_name: 'Transferencia',
						bank_account_id: null,
						bank_account_name: null,
						expense_id: null,
					},
				],
				error: null,
			});
			const { result } = renderHook(() => usePayments() as any);

			const res = await result.current.listEntries(2026);

			expect(res.data?.[0]).toEqual(
				expect.objectContaining({ expense_id: null, expense_label: null })
			);
		});
	});

	describe('listExpenseOptions', () => {
		it('scopes to the given year and maps expenses to combobox options', async () => {
			(listExpenses as jest.Mock).mockResolvedValue({
				data: [
					{
						id: 42,
						date: '2026-04-01',
						voucher_number: '0001-00000456',
						description: 'Compra de cemento',
						total_amount: 500,
						supplier_name: '',
					},
				],
				error: null,
			});
			const { result } = renderHook(() => usePayments() as any);

			const res = await result.current.listExpenseOptions(2026);

			expect(listExpenses).toHaveBeenCalledWith({ year: 2026 });
			expect(res.data?.[0]).toEqual(
				expect.objectContaining({ id: 42, name: expect.stringContaining('0001-00000456') })
			);
		});

		it('surfaces the supplier name instead of the voucher number when the expense is a supplier purchase', async () => {
			(listExpenses as jest.Mock).mockResolvedValue({
				data: [
					{
						id: 42,
						date: '2026-04-01',
						voucher_number: '0001-00000456',
						description: null,
						total_amount: 500,
						supplier_name: 'Acme SRL',
					},
				],
				error: null,
			});
			const { result } = renderHook(() => usePayments() as any);

			const res = await result.current.listExpenseOptions(2026);

			expect(res.data?.[0].name).toContain('Acme SRL');
		});

		it('passes errors through', async () => {
			const err = { message: 'boom' };
			(listExpenses as jest.Mock).mockResolvedValue({ data: null, error: err });
			const { result } = renderHook(() => usePayments() as any);

			expect(await result.current.listExpenseOptions(2026)).toEqual({ data: null, error: err });
		});
	});

	describe('createEntry', () => {
		it('always routes to createPayment (no supplier-origin branch)', async () => {
			(createPayment as jest.Mock).mockResolvedValue({ error: null });
			const { result } = renderHook(() => usePayments() as any);

			await result.current.createEntry({
				date: '2026-05-10',
				receipt_number: null,
				work_id: null,
				party_id: null,
				category_id: 10,
				description: null,
				amount: 1000,
				payment_method_id: 2,
				bank_account_id: null,
			});

			expect(createPayment).toHaveBeenCalled();
		});

		it('forwards expense_id to createPayment when the entry is linked to an expense', async () => {
			(createPayment as jest.Mock).mockResolvedValue({ error: null });
			const { result } = renderHook(() => usePayments() as any);

			await result.current.createEntry({
				date: '2026-05-10',
				receipt_number: null,
				work_id: null,
				party_id: null,
				category_id: null,
				description: null,
				amount: 1000,
				payment_method_id: 2,
				bank_account_id: null,
				expense_id: 42,
			});

			expect(createPayment).toHaveBeenCalledWith(expect.objectContaining({ expense_id: 42 }));
		});

		it('forwards the created row id so the caller can upload staged files against it', async () => {
			(createPayment as jest.Mock).mockResolvedValue({ data: { id: 99 }, error: null });
			const { result } = renderHook(() => usePayments() as any);

			const res = await result.current.createEntry({
				date: '2026-05-10',
				receipt_number: null,
				work_id: null,
				party_id: null,
				category_id: null,
				description: null,
				amount: 1000,
				payment_method_id: 2,
				bank_account_id: null,
				expense_id: 42,
			});

			expect(res).toEqual({ data: { id: 99 }, error: null });
		});
	});

	describe('updateEntry', () => {
		it('always routes to updatePayment', async () => {
			(updatePayment as jest.Mock).mockResolvedValue({ error: null });
			const { result } = renderHook(() => usePayments() as any);

			await result.current.updateEntry(9, {
				date: '2026-05-10',
				receipt_number: null,
				work_id: null,
				party_id: null,
				category_id: 10,
				description: null,
				amount: 1000,
				payment_method_id: 2,
				bank_account_id: null,
			});

			expect(updatePayment).toHaveBeenCalledWith(9, expect.objectContaining({ amount: 1000 }));
		});

		it('forwards expense_id to updatePayment, and null when clearing the association', async () => {
			(updatePayment as jest.Mock).mockResolvedValue({ error: null });
			const { result } = renderHook(() => usePayments() as any);

			await result.current.updateEntry(9, {
				date: '2026-05-10',
				receipt_number: null,
				work_id: null,
				party_id: null,
				category_id: null,
				description: null,
				amount: 1000,
				payment_method_id: 2,
				bank_account_id: null,
				expense_id: null,
			});

			expect(updatePayment).toHaveBeenCalledWith(9, expect.objectContaining({ expense_id: null }));
		});
	});

	describe('deleteEntry', () => {
		it('always routes to deletePayment', async () => {
			const { result } = renderHook(() => usePayments() as any);

			await result.current.deleteEntry(9);

			expect(deletePayment).toHaveBeenCalledWith(9);
		});
	});
});
