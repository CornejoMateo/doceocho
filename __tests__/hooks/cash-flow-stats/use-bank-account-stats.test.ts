import { renderHook, waitFor, act } from '@testing-library/react';
import { useBankAccountStats } from '@/hooks/cash-flow-stats/use-bank-account-stats';
import { getMovementTotals } from '@/lib/cash-flow-stats/cash-flow-stats';
import { listPaymentMethods } from '@/lib/payment-methods/payment-methods';
import { translateError } from '@/lib/error-translator';
import { getLocalDate } from '@/utils/format-date';
import { BankAccount } from '@/lib/cash-flow/cash-flow';

jest.mock('@/lib/cash-flow-stats/cash-flow-stats', () => ({
	getMovementTotals: jest.fn(),
}));

jest.mock('@/lib/payment-methods/payment-methods', () => ({
	listPaymentMethods: jest.fn(),
}));

jest.mock('@/lib/error-translator', () => ({
	translateError: jest.fn(),
}));

const BANK_ACCOUNTS: BankAccount[] = [
	{
		id: 1,
		name: 'Cuenta A',
		bank: 'Galicia',
		account_number: '1',
		account_type: 'checking',
		is_active: true,
		initial_balance: 0,
	},
];

describe('useBankAccountStats', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(listPaymentMethods as jest.Mock).mockResolvedValue({ data: [], error: null });
		(getMovementTotals as jest.Mock).mockResolvedValue({ data: [], error: null });
	});

	it('defaults to the current year, "Todos" months, and fetches all 4 data sources', async () => {
		const { result } = renderHook(() => useBankAccountStats(BANK_ACCOUNTS));
		await waitFor(() => expect(result.current.loading).toBe(false));

		const currentYear = Number(getLocalDate().slice(0, 4));
		expect(result.current.year).toBe(currentYear);
		expect(result.current.month).toBe(0);
		expect(result.current.monthOptions[0]).toEqual({ value: 0, label: 'Todos' });
		expect(result.current.monthOptions).toHaveLength(13);

		expect(getMovementTotals).toHaveBeenCalledWith('bank_account', null, null);
		expect(getMovementTotals).toHaveBeenCalledWith(
			'bank_account',
			`${currentYear}-01-01`,
			`${currentYear}-12-31`
		);
		expect(getMovementTotals).toHaveBeenCalledWith(
			'payment_method',
			`${currentYear}-01-01`,
			`${currentYear}-12-31`
		);
		expect(result.current.error).toBeNull();
	});

	it('includes one year ahead of the current year in yearOptions, descending', async () => {
		const { result } = renderHook(() => useBankAccountStats(BANK_ACCOUNTS));
		await waitFor(() => expect(result.current.loading).toBe(false));

		const currentYear = Number(getLocalDate().slice(0, 4));
		expect(result.current.yearOptions).toEqual([
			currentYear + 1,
			currentYear,
			currentYear - 1,
			currentYear - 2,
			currentYear - 3,
			currentYear - 4,
		]);
	});

	it('re-fetches the period-scoped RPCs with a month range when month changes', async () => {
		const { result } = renderHook(() => useBankAccountStats(BANK_ACCOUNTS));
		await waitFor(() => expect(result.current.loading).toBe(false));
		(getMovementTotals as jest.Mock).mockClear();

		act(() => result.current.setMonth(3));
		await waitFor(() => expect(result.current.loading).toBe(false));

		const year = result.current.year;
		expect(getMovementTotals).toHaveBeenCalledWith(
			'bank_account',
			`${year}-03-01`,
			`${year}-03-31`
		);
		expect(getMovementTotals).toHaveBeenCalledWith(
			'payment_method',
			`${year}-03-01`,
			`${year}-03-31`
		);
	});

	it('sets an error and stops loading when a data source fails', async () => {
		(getMovementTotals as jest.Mock).mockResolvedValue({ data: null, error: { message: 'boom' } });
		(translateError as jest.Mock).mockReturnValue('No se pudo');

		const { result } = renderHook(() => useBankAccountStats(BANK_ACCOUNTS));
		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.error).toBe('No se pudo');
	});

	it('falls back to a default error message when translateError returns nothing', async () => {
		(getMovementTotals as jest.Mock).mockResolvedValue({ data: null, error: { message: 'boom' } });
		(translateError as jest.Mock).mockReturnValue(undefined);

		const { result } = renderHook(() => useBankAccountStats(BANK_ACCOUNTS));
		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.error).toBe('No se pudieron cargar las estadísticas de cuentas.');
	});

	it('clears a previous error and reloads data on retry', async () => {
		(getMovementTotals as jest.Mock).mockResolvedValueOnce({
			data: null,
			error: { message: 'boom' },
		});
		(getMovementTotals as jest.Mock).mockResolvedValue({ data: [], error: null });
		(translateError as jest.Mock).mockReturnValue('No se pudo');

		const { result } = renderHook(() => useBankAccountStats(BANK_ACCOUNTS));
		await waitFor(() => expect(result.current.loading).toBe(false));
		expect(result.current.error).toBe('No se pudo');

		await act(async () => {
			await result.current.retry();
		});

		expect(result.current.error).toBeNull();
	});

	it('ignores a stale response from a request superseded by a newer one', async () => {
		const staleRow = [{ groupId: 1, totalIn: 999, totalOut: 999 }];
		const freshRow = [{ groupId: 1, totalIn: 1, totalOut: 1 }];
		let resolveStale: (v: any) => void;
		(getMovementTotals as jest.Mock)
			.mockImplementationOnce(
				() =>
					new Promise((resolve) => {
						resolveStale = resolve;
					})
			)
			.mockResolvedValue({ data: freshRow, error: null });

		const { result } = renderHook(() => useBankAccountStats(BANK_ACCOUNTS));

		// trigger a second fetch before the first one resolves
		act(() => result.current.setMonth(5));
		await waitFor(() => expect(result.current.loading).toBe(false));
		expect(result.current.allTimeByAccount).toEqual(freshRow);

		// the stale first request resolving afterwards must not overwrite the fresh state
		act(() => resolveStale!({ data: staleRow, error: null }));

		expect(result.current.loading).toBe(false);
		expect(result.current.allTimeByAccount).toEqual(freshRow);
	});
});
