import { renderHook, waitFor } from '@testing-library/react';
import { useFixedExpensePayments } from '@/hooks/fixed-expenses/use-fixed-expense-payments';
import { listFixedExpensePayments } from '@/lib/fixed-expenses/fixed-expense-payments';
import { getLocalDate } from '@/utils/format-date';

jest.mock('@/lib/fixed-expenses/fixed-expense-payments', () => ({
	listFixedExpensePayments: jest.fn(),
}));

describe('useFixedExpensePayments', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(listFixedExpensePayments as jest.Mock).mockResolvedValue({ data: [], error: null });
	});

	it('includes one year ahead of the current year in yearOptions, descending', async () => {
		const { result } = renderHook(() => useFixedExpensePayments([]));
		await waitFor(() => expect(result.current.loadingPayments).toBe(false));

		const currentYear = Number(getLocalDate().slice(0, 4));
		expect(result.current.yearOptions).toEqual([
			currentYear + 1,
			currentYear,
			currentYear - 1,
			currentYear - 2,
			currentYear - 3,
			currentYear - 4,
		]);
		expect(result.current.year).toBe(currentYear);
	});
});
