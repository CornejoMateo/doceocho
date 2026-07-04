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
		totalExtraArs: 0,
		totalExtraUsd: 0,
		remainingArs: 0,
		remainingUsd: 0,
		progressPercentage: 0,
		type: 'Cancelado',
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
		});

		await act(async () => {
			await result.current.handleAddTransaction();
		});

		expect(createTransaction).toHaveBeenCalled();
		expect(result.current.isSavingTransaction).toBe(false);
		expect(mockOnTransactionCreated).toHaveBeenCalled();
	});

	it('does not create transaction when amount is empty', async () => {
		const { result } = renderHook(() =>
			useTransactionCrud(mockBalance, true, mockUploadFiles, mockOnTransactionCreated)
		);

		await act(async () => {
			await result.current.handleAddTransaction();
		});

		expect(createTransaction).not.toHaveBeenCalled();
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
		});

		act(() => {
			result.current.setTransactionFilesToUpload([new File([''], 'test.pdf')]);
		});

		await act(async () => {
			await result.current.handleAddTransaction();
		});

		expect(mockUploadFiles).toHaveBeenCalledWith(1, [expect.any(File)]);
	});

	it('creates an extra amount successfully', async () => {
		(createTransaction as jest.Mock).mockResolvedValue({ data: { id: 1 }, error: null });

		const { result } = renderHook(() =>
			useTransactionCrud(mockBalance, true, mockUploadFiles, mockOnTransactionCreated)
		);

		await act(async () => {});

		act(() => {
			result.current.setTransactionAmount('500');
		});

		await act(async () => {
			await result.current.handleAddExtraAmount();
		});

		expect(createTransaction).toHaveBeenCalledWith(
			expect.objectContaining({ is_extra_amount: true })
		);
		expect(result.current.isSavingTransaction).toBe(false);
		expect(mockOnTransactionCreated).toHaveBeenCalled();
	});

	it('does not create extra amount when amount is empty', async () => {
		const { result } = renderHook(() =>
			useTransactionCrud(mockBalance, true, mockUploadFiles, mockOnTransactionCreated)
		);

		await act(async () => {
			await result.current.handleAddExtraAmount();
		});

		expect(createTransaction).not.toHaveBeenCalled();
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

	it('computes totalPaid and totalPaidUSD from regular transactions, excluding extras', async () => {
		(getTransactionsByBalanceId as jest.Mock).mockResolvedValue({
			data: [
				{ amount: 1000, usd_amount: 50, is_extra_amount: false },
				{ amount: 2000, usd_amount: 100, is_extra_amount: false },
				{ amount: 500, usd_amount: 25, is_extra_amount: true },
			],
			error: null,
		});

		const { result } = renderHook(() =>
			useTransactionCrud(mockBalance, true, mockUploadFiles, mockOnTransactionCreated)
		);

		await act(async () => {});

		expect(result.current.totalPaid).toBe(3000);
		expect(result.current.totalPaidUSD).toBe(150);
		expect(result.current.totalExtraArs).toBe(500);
		expect(result.current.totalExtraUsd).toBe(25);
	});

	it('does not update transaction when amount is empty', async () => {
		const { result } = renderHook(() =>
			useTransactionCrud(mockBalance, true, mockUploadFiles, mockOnTransactionCreated)
		);

		await act(async () => {});

		act(() => {
			result.current.setEditingTransaction({ id: 5 } as any);
		});

		await act(async () => {
			await result.current.handleUpdateTransaction();
		});

		expect(updateTransaction).not.toHaveBeenCalled();
	});
});
