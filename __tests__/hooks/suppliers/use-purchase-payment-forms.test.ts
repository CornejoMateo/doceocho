import { renderHook, act } from '@testing-library/react';
import { usePurchasePaymentForms } from '@/hooks/suppliers/use-purchase-payment-forms';
import {
	createPayment,
	createPaymentWithWithholding,
	updatePayment,
} from '@/lib/payments/payments';
import { getWithholdingByPaymentId } from '@/lib/withholdings/withholdings';
import type { SupplierExpenseListItem } from '@/lib/suppliers/supplier-expenses';
import type { PaymentWithDetails } from '@/lib/payments/payments';

const mockToast = jest.fn();

jest.mock('@/components/ui/use-toast', () => ({
	useToast: () => ({ toast: mockToast }),
}));

jest.mock('@/lib/error-translator', () => ({
	translateError: jest.fn(),
}));

jest.mock('@/lib/expenses/expenses', () => ({
	createExpense: jest.fn(),
	updateExpense: jest.fn(),
}));

jest.mock('@/lib/payments/payments', () => ({
	createPayment: jest.fn(),
	createPaymentWithWithholding: jest.fn(),
	updatePayment: jest.fn(),
}));

jest.mock('@/lib/withholdings/withholdings', () => ({
	...jest.requireActual('@/lib/withholdings/withholdings'),
	getWithholdingByPaymentId: jest.fn(),
}));

jest.mock('@/lib/expenses/files-expenses', () => ({
	uploadFileExpense: jest.fn(),
}));

jest.mock('@/lib/payments/files-payments', () => ({
	uploadFilePayment: jest.fn(),
}));

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((res) => {
		resolve = res;
	});
	return { promise, resolve };
}

const purchase: SupplierExpenseListItem = {
	id: 11,
	created_at: '2026-01-01',
	date: '2026-01-01',
	voucher_number: null,
	voucher_type_id: null,
	voucher_type_name: null,
	work_id: null,
	work_name: null,
	category_id: null,
	category_name: null,
	payment_method_id: null,
	payment_method_name: null,
	bank_account_id: null,
	bank_account_name: null,
	description: null,
	net_amount: 1000,
	iva_percent: 0,
	iva_amount: 0,
	total_amount: 1000,
	totalPaidArs: 0,
	balanceArs: 1000,
};

function makePayment(overrides: Partial<PaymentWithDetails> = {}): PaymentWithDetails {
	return {
		id: 1,
		created_at: '2026-01-01',
		date: '2026-01-01',
		receipt_number: null,
		work_id: null,
		category_id: null,
		kind: 'payment',
		description: null,
		amount: 500,
		payment_method_id: null,
		bank_account_id: null,
		expense_id: 11,
		work_name: null,
		category_name: null,
		payment_method_name: '',
		bank_account_name: null,
		expense_date: null,
		expense_voucher_number: null,
		expense_description: null,
		expense_total_amount: null,
		...overrides,
	};
}

function setupHook() {
	const onSaved = jest.fn().mockResolvedValue(undefined);
	const onChanged = jest.fn();
	const { result } = renderHook(() =>
		usePurchasePaymentForms({ supplierId: 3, onSaved, onChanged })
	);
	return { result, onSaved, onChanged };
}

describe('usePurchasePaymentForms', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('withholding lookup race guard', () => {
		it('ignores a stale lookup from an earlier edit session that resolves after a newer one', async () => {
			const first = deferred<{ data: any; error: any }>();
			const second = deferred<{ data: any; error: any }>();
			(getWithholdingByPaymentId as jest.Mock)
				.mockImplementationOnce(() => first.promise)
				.mockImplementationOnce(() => second.promise);

			const { result } = setupHook();
			const paymentA = makePayment({ id: 1 });
			const paymentB = makePayment({ id: 2 });

			act(() => {
				result.current.handleEditPayment(purchase, paymentA);
			});
			act(() => {
				result.current.handleEditPayment(purchase, paymentB);
			});

			// Newer lookup (paymentB) resolves first; stale one (paymentA) resolves after.
			await act(async () => {
				second.resolve({ data: { id: 99, payment_id: 2, tax_regime: 'B' }, error: null });
			});
			expect(result.current.existingWithholding).toMatchObject({ payment_id: 2 });
			expect(result.current.loadingExistingWithholding).toBe(false);

			await act(async () => {
				first.resolve({ data: { id: 1, payment_id: 1, tax_regime: 'A' }, error: null });
			});

			// The stale response must never overwrite the newer session's state.
			expect(result.current.existingWithholding).toMatchObject({ payment_id: 2 });
			expect(result.current.loadingExistingWithholding).toBe(false);
		});

		it('invalidates an in-flight lookup when the form is cancelled', async () => {
			const pending = deferred<{ data: any; error: any }>();
			(getWithholdingByPaymentId as jest.Mock).mockImplementationOnce(() => pending.promise);

			const { result } = setupHook();
			act(() => {
				result.current.handleEditPayment(purchase, makePayment({ id: 1 }));
			});
			expect(result.current.loadingExistingWithholding).toBe(true);

			act(() => {
				result.current.cancelForm();
			});

			await act(async () => {
				pending.resolve({ data: { id: 1, payment_id: 1 }, error: null });
			});

			// Cancel already reset these; the late response must not resurrect them.
			expect(result.current.existingWithholding).toBeNull();
			expect(result.current.loadingExistingWithholding).toBe(false);
		});
	});

	describe('amount lock while loading', () => {
		it('overrides the typed amount with the payment amount on submit while the lookup is still pending', async () => {
			const pending = deferred<{ data: any; error: any }>();
			(getWithholdingByPaymentId as jest.Mock).mockImplementationOnce(() => pending.promise);
			(updatePayment as jest.Mock).mockResolvedValue({ data: makePayment(), error: null });

			const { result } = setupHook();
			const editingPayment = makePayment({ id: 5, amount: 500 });

			act(() => {
				result.current.handleEditPayment(purchase, editingPayment);
			});
			expect(result.current.loadingExistingWithholding).toBe(true);

			act(() => {
				result.current.setPaymentAmount('999,00');
			});

			await act(async () => {
				await result.current.handleSubmitPayment({ preventDefault: () => {} } as any);
			});

			expect(updatePayment).toHaveBeenCalledWith(5, expect.objectContaining({ amount: 500 }));

			// Clean up the still-pending promise so it doesn't leak into other tests.
			pending.resolve({ data: null, error: null });
		});
	});

	describe('create routing', () => {
		it('calls createPayment when the withholding switch is off', async () => {
			(createPayment as jest.Mock).mockResolvedValue({ data: makePayment({ id: 7 }), error: null });

			const { result } = setupHook();
			act(() => {
				result.current.handleNewPayment(purchase);
			});
			act(() => {
				result.current.setPaymentAmount('1000');
			});

			await act(async () => {
				await result.current.handleSubmitPayment({ preventDefault: () => {} } as any);
			});

			expect(createPayment).toHaveBeenCalledTimes(1);
			expect(createPaymentWithWithholding).not.toHaveBeenCalled();
		});

		it('calls createPaymentWithWithholding when the withholding switch is on with valid data', async () => {
			(createPaymentWithWithholding as jest.Mock).mockResolvedValue({
				data: makePayment({ id: 8 }),
				error: null,
			});

			const { result } = setupHook();
			act(() => {
				result.current.handleNewPayment(purchase);
			});
			act(() => {
				result.current.setPaymentAmount('1000');
			});
			act(() => {
				result.current.onWithholdingEnabledChange(true);
			});
			act(() => {
				result.current.setWithholdingRegime('Régimen general');
			});
			act(() => {
				result.current.setWithholdingRatePercent('2');
			});

			await act(async () => {
				await result.current.handleSubmitPayment({ preventDefault: () => {} } as any);
			});

			expect(createPaymentWithWithholding).toHaveBeenCalledTimes(1);
			expect(createPayment).not.toHaveBeenCalled();
		});

		it('rejects an Imputado with more than 2 decimals using the unrounded value (reachable from the UI)', async () => {
			const { result } = setupHook();
			act(() => {
				result.current.handleNewPayment(purchase);
			});
			act(() => {
				result.current.setPaymentAmount('1000');
			});
			act(() => {
				result.current.onWithholdingEnabledChange(true);
			});
			act(() => {
				result.current.setWithholdingRegime('Régimen general');
			});
			act(() => {
				result.current.setWithholdingRatePercent('2');
			});
			act(() => {
				// 3 decimals: rounding this before validating would hide the error.
				result.current.onWithholdingImputedAmountChange('1000,123');
			});

			await act(async () => {
				await result.current.handleSubmitPayment({ preventDefault: () => {} } as any);
			});

			expect(mockToast).toHaveBeenCalledWith(
				expect.objectContaining({ description: 'El monto imputado admite hasta 2 decimales.' })
			);
			expect(createPaymentWithWithholding).not.toHaveBeenCalled();
		});
	});

	describe('double-submit guard', () => {
		it('only submits once when handleSubmitPayment fires twice before the first resolves', async () => {
			const pending = deferred<{ data: any; error: any }>();
			(createPayment as jest.Mock).mockImplementationOnce(() => pending.promise);

			const { result } = setupHook();
			act(() => {
				result.current.handleNewPayment(purchase);
			});
			act(() => {
				result.current.setPaymentAmount('1000');
			});

			let firstSubmit: Promise<void>;
			let secondSubmit: Promise<void>;
			act(() => {
				firstSubmit = result.current.handleSubmitPayment({ preventDefault: () => {} } as any);
				secondSubmit = result.current.handleSubmitPayment({ preventDefault: () => {} } as any);
			});

			await act(async () => {
				pending.resolve({ data: makePayment({ id: 9 }), error: null });
				await Promise.all([firstSubmit, secondSubmit]);
			});

			expect(createPayment).toHaveBeenCalledTimes(1);
		});
	});
});
