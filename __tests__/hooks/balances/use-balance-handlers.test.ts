import { renderHook, act } from '@testing-library/react';
import { useBalanceHandlers } from '@/hooks/balances/use-balance-handlers';
import { deleteBalance } from '@/lib/balances/balances';

jest.mock('@/lib/balances/balances', () => ({
	deleteBalance: jest.fn(),
}));

jest.mock('@/components/ui/use-toast', () => ({
	toast: jest.fn(() => ({ id: '1', dismiss: jest.fn(), update: jest.fn() })),
}));

jest.mock('@/lib/error-translator', () => ({
	translateError: (e: any) => `translated: ${e?.message || e}`,
}));

const mockBalance = {
	id: 1,
	client_id: 5,
	balance_amount_ars: 100000,
	balance_amount_usd: 5000,
};

describe('useBalanceHandlers', () => {
	const onBalanceDeleted = jest.fn();
	const onRefresh = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('starts with default state', () => {
		const { result } = renderHook(() => useBalanceHandlers({ onBalanceDeleted, onRefresh }));

		expect(result.current.selectedBalance).toBeNull();
		expect(result.current.isDetailsModalOpen).toBe(false);
		expect(result.current.balanceToDelete).toBeNull();
		expect(result.current.isDeleteDialogOpen).toBe(false);
		expect(result.current.isDollarUpdateModalOpen).toBe(false);
		expect(result.current.balanceToUpdate).toBeNull();
	});

	it('opens details modal', () => {
		const { result } = renderHook(() => useBalanceHandlers({ onBalanceDeleted, onRefresh }));

		act(() => {
			result.current.openDetailsModal(mockBalance as any);
		});

		expect(result.current.selectedBalance).toEqual(mockBalance);
		expect(result.current.isDetailsModalOpen).toBe(true);
	});

	it('opens delete dialog', () => {
		const { result } = renderHook(() => useBalanceHandlers({ onBalanceDeleted, onRefresh }));

		act(() => {
			result.current.openDeleteDialog(mockBalance as any);
		});

		expect(result.current.balanceToDelete).toEqual(mockBalance);
		expect(result.current.isDeleteDialogOpen).toBe(true);
	});

	it('opens dollar update modal', () => {
		const { result } = renderHook(() => useBalanceHandlers({ onBalanceDeleted, onRefresh }));

		act(() => {
			result.current.openDollarUpdateModal(mockBalance as any);
		});

		expect(result.current.balanceToUpdate).toEqual(mockBalance);
		expect(result.current.isDollarUpdateModalOpen).toBe(true);
	});

	it('deletes a balance successfully', async () => {
		(deleteBalance as jest.Mock).mockResolvedValue({ error: null });

		const { result } = renderHook(() => useBalanceHandlers({ onBalanceDeleted, onRefresh }));

		act(() => {
			result.current.openDeleteDialog(mockBalance as any);
		});

		await act(async () => {
			await result.current.handleDeleteBalance();
		});

		expect(deleteBalance).toHaveBeenCalledWith(1);
		expect(onRefresh).toHaveBeenCalled();
		expect(onBalanceDeleted).toHaveBeenCalled();
		expect(result.current.isDeleteDialogOpen).toBe(false);
		expect(result.current.balanceToDelete).toBeNull();
	});

	it('does not delete when no balance is selected', async () => {
		const { result } = renderHook(() => useBalanceHandlers({ onBalanceDeleted, onRefresh }));

		await act(async () => {
			await result.current.handleDeleteBalance();
		});

		expect(deleteBalance).not.toHaveBeenCalled();
	});

	it('shows error toast when delete fails', async () => {
		const { toast } = jest.requireMock('@/components/ui/use-toast');
		const mockUpdate = jest.fn();
		(toast as jest.Mock).mockReturnValue({ id: '1', dismiss: jest.fn(), update: mockUpdate });
		(deleteBalance as jest.Mock).mockResolvedValue({ error: new Error('Delete failed') });

		const { result } = renderHook(() => useBalanceHandlers({ onBalanceDeleted, onRefresh }));

		act(() => {
			result.current.openDeleteDialog(mockBalance as any);
		});

		await act(async () => {
			await result.current.handleDeleteBalance();
		});

		expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Eliminando saldo...' }));
		expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
		expect(onRefresh).not.toHaveBeenCalled();
	});

	it('handles balance update by calling onRefresh', () => {
		const { result } = renderHook(() => useBalanceHandlers({ onBalanceDeleted, onRefresh }));

		act(() => {
			result.current.handleBalanceUpdate();
		});

		expect(onRefresh).toHaveBeenCalled();
	});

	it('calls onBalanceDeleted only when provided', async () => {
		(deleteBalance as jest.Mock).mockResolvedValue({ error: null });

		const { result } = renderHook(() =>
			useBalanceHandlers({ onBalanceDeleted: undefined, onRefresh })
		);

		act(() => {
			result.current.openDeleteDialog(mockBalance as any);
		});

		await act(async () => {
			await result.current.handleDeleteBalance();
		});

		expect(deleteBalance).toHaveBeenCalled();
		expect(onRefresh).toHaveBeenCalled();
	});
});
