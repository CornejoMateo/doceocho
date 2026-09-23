import { renderHook, act } from '@testing-library/react';
import { useTransactionCrud } from '@/hooks/balances/use-transaction-crud';
import {
	getTransactionsByBalanceId,
	createTransaction,
	deleteTransaction,
	updateTransaction,
} from '@/lib/balances/balance_transactions';
import { updateBalance } from '@/lib/balances/balances';

jest.mock('@/lib/balances/balance_transactions', () => ({
	getTransactionsByBalanceId: jest.fn(),
	createTransaction: jest.fn(),
	deleteTransaction: jest.fn(),
	updateTransaction: jest.fn(),
}));

jest.mock('@/lib/balances/balances', () => ({
	updateBalance: jest.fn(),
	markBalanceAsSettled: jest.fn(),
	unmarkBalanceAsSettled: jest.fn(),
}));

jest.mock('@/components/ui/use-toast', () => ({
	useToast: jest.fn(),
}));

jest.mock('@/lib/error-translator', () => ({
	translateError: (e: any) => `translated: ${e?.message || e}`,
}));

jest.mock('@/helpers/balances/balance-calculations', () => ({
	calculateBalanceSummary: jest.fn(() => ({
		budgetArsInitial: 0,
		budgetUsd: 0,
		budgetArsCurrent: 0,
		totalPaidArs: 0,
		totalPaidUsd: 0,
		remainingArs: 0,
		remainingUsd: 0,
		progressPercentage: 0,
		type: 'Saldado',
	})),
}));

const mockBalance = {
	id: 1,
	created_at: '2024-01-01',
	client_id: 5,
	budget: {
		id: 10,
		created_at: '2024-01-01',
		amount_ars: 100000,
		amount_usd: 5000,
		folder_budget: {
			id: 20,
			work: { address: 'Calle 123', locality: 'Springfield' },
		},
	},
} as any;

describe('useTransactionCrud', () => {
	let mockToast: jest.Mock;
	const mockUploadFiles = jest.fn();
	const mockOnTransactionCreated = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		mockToast = jest.fn();
		(jest.requireMock('@/components/ui/use-toast').useToast as jest.Mock).mockReturnValue({
			toast: mockToast,
		});
		(getTransactionsByBalanceId as jest.Mock).mockResolvedValue({ data: [], error: null });
	});

	it('loads transactions when balance and isOpen are provided', async () => {
		const transactions = [{ id: 1, amount: 500 }];
		(getTransactionsByBalanceId as jest.Mock).mockResolvedValue({
			data: transactions,
			error: null,
		});

		const { result } = renderHook(() =>
			useTransactionCrud(mockBalance, true, mockUploadFiles, mockOnTransactionCreated)
		);

		await act(async () => {});

		expect(getTransactionsByBalanceId).toHaveBeenCalledWith(1);
		expect(result.current.transactions).toEqual(transactions);
	});

	it('does not load transactions when isOpen is false', async () => {
		renderHook(() =>
			useTransactionCrud(mockBalance, false, mockUploadFiles, mockOnTransactionCreated)
		);

		await act(async () => {});

		expect(getTransactionsByBalanceId).not.toHaveBeenCalled();
	});

	it('creates a transaction successfully', async () => {
		(createTransaction as jest.Mock).mockResolvedValue({ data: { id: 1 }, error: null });

		const { result } = renderHook(() =>
			useTransactionCrud(mockBalance, true, mockUploadFiles, mockOnTransactionCreated)
		);

		await act(async () => {});

		act(() => {
			result.current.setTransactionAmount('500');
			result.current.setQuoteUsd('1000');
		});

		await act(async () => {
			await result.current.handleAddTransaction();
		});

		expect(createTransaction).toHaveBeenCalled();
		expect(result.current.isSavingTransaction).toBe(false);
		expect(mockOnTransactionCreated).toHaveBeenCalled();
	});

	it('shows error toast when createTransaction returns error', async () => {
		(createTransaction as jest.Mock).mockResolvedValue({
			data: null,
			error: new Error('DB Error'),
		});

		const { result } = renderHook(() =>
			useTransactionCrud(mockBalance, true, mockUploadFiles, mockOnTransactionCreated)
		);

		await act(async () => {});

		act(() => {
			result.current.setTransactionAmount('500');
			result.current.setQuoteUsd('1000');
		});

		await act(async () => {
			await result.current.handleAddTransaction();
		});

		expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
	});

	it('uploads files when transaction is created with files', async () => {
		(createTransaction as jest.Mock).mockResolvedValue({ data: { id: 1 }, error: null });

		const { result } = renderHook(() =>
			useTransactionCrud(mockBalance, true, mockUploadFiles, mockOnTransactionCreated)
		);

		await act(async () => {});

		act(() => {
			result.current.setTransactionAmount('500');
			result.current.setQuoteUsd('1000');
		});

		act(() => {
			result.current.setTransactionFilesToUpload([new File([''], 'test.pdf')]);
		});

		await act(async () => {
			await result.current.handleAddTransaction();
		});

		expect(mockUploadFiles).toHaveBeenCalledWith(1, [expect.any(File)]);
	});

	it('deletes a transaction successfully', async () => {
		(deleteTransaction as jest.Mock).mockResolvedValue({ error: null });

		const { result } = renderHook(() =>
			useTransactionCrud(mockBalance, true, mockUploadFiles, mockOnTransactionCreated)
		);

		await act(async () => {});

		act(() => {
			result.current.setTransactionToDelete({ id: 5 } as any);
		});

		await act(async () => {
			await result.current.handleDeleteTransaction();
		});

		expect(deleteTransaction).toHaveBeenCalledWith(5);
		expect(result.current.isDeleteDialogOpen).toBe(false);
		expect(result.current.transactionToDelete).toBeNull();
	});

	it('does nothing when delete is called with no transaction selected', async () => {
		const { result } = renderHook(() =>
			useTransactionCrud(mockBalance, true, mockUploadFiles, mockOnTransactionCreated)
		);

		await act(async () => {});

		await act(async () => {
			await result.current.handleDeleteTransaction();
		});

		expect(deleteTransaction).not.toHaveBeenCalled();
	});

	it('updates balance notes', async () => {
		(updateBalance as jest.Mock).mockResolvedValue({ error: null });

		const { result } = renderHook(() =>
			useTransactionCrud(mockBalance, true, mockUploadFiles, mockOnTransactionCreated)
		);

		await act(async () => {});

		act(() => {
			result.current.setBalanceNotes('New notes');
		});

		await act(async () => {
			await result.current.handleUpdateBalanceNotes();
		});

		expect(updateBalance).toHaveBeenCalledWith(1, { notes: 'New notes' });
		expect(result.current.isEditingNotes).toBe(false);
	});

	it('edits a transaction by populating the form', () => {
		const { result } = renderHook(() =>
			useTransactionCrud(mockBalance, true, mockUploadFiles, mockOnTransactionCreated)
		);

		const tx = {
			id: 5,
			date: '2024-06-15',
			amount: 500,
			payment_method: 'TRANSFERENCIA',
			notes: 'Test note',
			quote_usd: 950,
			usd_amount: 1.05,
		} as any;

		act(() => {
			result.current.handleEditTransaction(tx);
		});

		expect(result.current.editingTransaction).toEqual(tx);
		expect(result.current.addingMode).toBe('transaction');
		expect(result.current.transactionAmount).toBe('500');
		expect(result.current.paymentMethod).toBe('TRANSFERENCIA');
	});

	it('updates a transaction successfully', async () => {
		(updateTransaction as jest.Mock).mockResolvedValue({ data: { id: 5 }, error: null });

		const { result } = renderHook(() =>
			useTransactionCrud(mockBalance, true, mockUploadFiles, mockOnTransactionCreated)
		);

		await act(async () => {});

		act(() => {
			result.current.setEditingTransaction({ id: 5 } as any);
			result.current.setTransactionAmount('500');
		});

		await act(async () => {
			await result.current.handleUpdateTransaction();
		});

		expect(updateTransaction).toHaveBeenCalledWith(5, expect.any(Object));
		expect(result.current.isSavingTransaction).toBe(false);
	});

	it('uploads files on update when files are present', async () => {
		(updateTransaction as jest.Mock).mockResolvedValue({ data: { id: 5 }, error: null });

		const { result } = renderHook(() =>
			useTransactionCrud(mockBalance, true, mockUploadFiles, mockOnTransactionCreated)
		);

		await act(async () => {});

		act(() => {
			result.current.setEditingTransaction({ id: 5 } as any);
			result.current.setTransactionAmount('500');
			result.current.setTransactionFilesToUpload([new File([''], 'doc.pdf')]);
		});

		await act(async () => {
			await result.current.handleUpdateTransaction();
		});

		expect(mockUploadFiles).toHaveBeenCalledWith(5, [expect.any(File)]);
	});

	it('resets the form', () => {
		const { result } = renderHook(() =>
			useTransactionCrud(mockBalance, true, mockUploadFiles, mockOnTransactionCreated)
		);

		act(() => {
			result.current.setTransactionAmount('500');
			result.current.setAddingMode('transaction');
			result.current.setEditingTransaction({ id: 5 } as any);
			result.current.setTransactionFilesToUpload([new File([''], 't.pdf')]);
		});

		act(() => {
			result.current.resetTransactionForm();
		});

		expect(result.current.transactionAmount).toBe('');
		expect(result.current.addingMode).toBeNull();
		expect(result.current.editingTransaction).toBeNull();
		expect(result.current.transactionFilesToUpload).toEqual([]);
	});

	it('computes totalPaid and totalPaidUSD from all transactions', async () => {
		(getTransactionsByBalanceId as jest.Mock).mockResolvedValue({
			data: [
				{ amount: 1000, usd_amount: 50 },
				{ amount: 2000, usd_amount: 100 },
				{ amount: 500, usd_amount: 25 },
			],
			error: null,
		});

		const { result } = renderHook(() =>
			useTransactionCrud(mockBalance, true, mockUploadFiles, mockOnTransactionCreated)
		);

		await act(async () => {});

		expect(result.current.totalPaid).toBe(3500);
		expect(result.current.totalPaidUSD).toBe(175);
	});

	describe('loading and refetch behavior', () => {
		const renderWithBalance = (balance: any) =>
			renderHook(
				({ balance: b }) => useTransactionCrud(b, true, mockUploadFiles, mockOnTransactionCreated),
				{ initialProps: { balance } }
			);

		it('does not refetch when the parent passes a new balance object with the same id', async () => {
			const { rerender } = renderWithBalance({ ...mockBalance });

			await act(async () => {});
			expect(getTransactionsByBalanceId).toHaveBeenCalledTimes(1);

			// This is what refreshBalance() in balance-details-modal.tsx does after a
			// mutation: getBalanceById -> setCurrentBalance(data) -> brand new object,
			// same id. It must not trigger a second load.
			await act(async () => {
				rerender({ balance: { ...mockBalance } });
			});

			expect(getTransactionsByBalanceId).toHaveBeenCalledTimes(1);
		});

		it('loads transactions exactly twice for the full add-transaction flow', async () => {
			(createTransaction as jest.Mock).mockResolvedValue({ data: { id: 99 }, error: null });

			const { result, rerender } = renderWithBalance({ ...mockBalance });

			// 1st load: initial mount.
			await act(async () => {});
			expect(getTransactionsByBalanceId).toHaveBeenCalledTimes(1);

			act(() => {
				result.current.setTransactionAmount('500');
				result.current.setQuoteUsd('1000');
			});

			// 2nd load: inside handleAddTransaction, required by detectSettledTransition.
			await act(async () => {
				await result.current.handleAddTransaction();
			});

			// Parent reacts to onTransactionCreated by re-fetching the balance.
			await act(async () => {
				rerender({ balance: { ...mockBalance } });
			});

			expect(getTransactionsByBalanceId).toHaveBeenCalledTimes(2);
		});

		it('still refetches when the balance id actually changes', async () => {
			const { rerender } = renderWithBalance({ ...mockBalance });

			await act(async () => {});
			expect(getTransactionsByBalanceId).toHaveBeenCalledTimes(1);

			await act(async () => {
				rerender({ balance: { ...mockBalance, id: 2 } });
			});

			expect(getTransactionsByBalanceId).toHaveBeenCalledTimes(2);
			expect(getTransactionsByBalanceId).toHaveBeenLastCalledWith(2);
		});

		it('keeps isInitialLoading true until the first load settles', async () => {
			let resolveLoad: (value: any) => void = () => {};
			(getTransactionsByBalanceId as jest.Mock).mockReturnValue(
				new Promise((resolve) => {
					resolveLoad = resolve;
				})
			);

			const { result } = renderWithBalance({ ...mockBalance });

			// First paint: totals/summary are still derived from an empty array, so the
			// modal must be gated.
			expect(result.current.isInitialLoading).toBe(true);

			await act(async () => {
				resolveLoad({ data: [{ id: 1, amount: 500, usd_amount: 5 }], error: null });
			});

			expect(result.current.isInitialLoading).toBe(false);
		});

		it('does not re-gate the whole modal while a later reload is in flight', async () => {
			const { result } = renderWithBalance({ ...mockBalance });

			await act(async () => {});
			expect(result.current.isInitialLoading).toBe(false);

			// Make the next load hang, simulating a reload triggered by a mutation.
			let resolveReload: (value: any) => void = () => {};
			(getTransactionsByBalanceId as jest.Mock).mockReturnValue(
				new Promise((resolve) => {
					resolveReload = resolve;
				})
			);

			let pending: Promise<unknown> = Promise.resolve();
			act(() => {
				pending = result.current.loadTransactions();
			});

			// isLoading drives only the transactions table spinner; the modal-wide gate
			// must stay open so the whole dialog does not flash on every mutation.
			expect(result.current.isLoading).toBe(true);
			expect(result.current.isInitialLoading).toBe(false);

			await act(async () => {
				resolveReload({ data: [], error: null });
				await pending;
			});

			expect(result.current.isLoading).toBe(false);
			expect(result.current.isInitialLoading).toBe(false);
		});
	});
});
