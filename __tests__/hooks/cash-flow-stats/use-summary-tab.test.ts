import { renderHook, waitFor, act } from '@testing-library/react';
import { useSummaryTab } from '@/hooks/cash-flow-stats/use-summary-tab';
import { getSummaryMonthly, getFixedCostsMonthly } from '@/lib/cash-flow-stats/cash-flow-summary';
import { listWorks } from '@/lib/works/works';
import { translateError } from '@/lib/error-translator';
import { getLocalDate } from '@/utils/format-date';

jest.mock('@/lib/cash-flow-stats/cash-flow-summary', () => ({
	getSummaryMonthly: jest.fn(),
	getFixedCostsMonthly: jest.fn(),
}));

jest.mock('@/lib/works/works', () => ({
	listWorks: jest.fn(),
}));

jest.mock('@/lib/error-translator', () => ({
	translateError: jest.fn(),
}));

describe('useSummaryTab', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(listWorks as jest.Mock).mockResolvedValue({ data: [], error: null });
		(getSummaryMonthly as jest.Mock).mockResolvedValue({ data: [], error: null });
		(getFixedCostsMonthly as jest.Mock).mockResolvedValue({ data: [], error: null });
	});

	it('defaults to the current year, "Todos" month/obra, and fetches all 3 sources', async () => {
		const { result } = renderHook(() => useSummaryTab());
		await waitFor(() => expect(result.current.loading).toBe(false));

		const currentYear = Number(getLocalDate().slice(0, 4));
		expect(result.current.year).toBe(currentYear);
		expect(result.current.month).toBe(0);
		expect(result.current.workId).toBe(0);
		expect(result.current.monthOptions[0]).toEqual({ value: 0, label: 'Todos los meses' });
		expect(result.current.monthOptions).toHaveLength(13);
		expect(result.current.workOptions[0]).toEqual({ value: 0, label: 'Todas las obras' });

		expect(listWorks).toHaveBeenCalledTimes(1);
		expect(getSummaryMonthly).toHaveBeenCalledWith(currentYear);
		expect(getFixedCostsMonthly).toHaveBeenCalledWith(currentYear);
		expect(result.current.error).toBeNull();
	});

	it('includes one year ahead of the current year in yearOptions, descending', async () => {
		const { result } = renderHook(() => useSummaryTab());
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

	it('maps works into workOptions with id/name, falling back when name is null', async () => {
		(listWorks as jest.Mock).mockResolvedValue({
			data: [
				{ id: 1, name: 'Casa Belgrano' },
				{ id: 2, name: null },
			],
			error: null,
		});

		const { result } = renderHook(() => useSummaryTab());
		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.workOptions).toEqual([
			{ value: 0, label: 'Todas las obras' },
			{ value: 1, label: 'Casa Belgrano' },
			{ value: 2, label: 'Obra #2' },
		]);
	});

	it('re-fetches the RPCs when year changes, without re-fetching on month/obra change', async () => {
		const { result } = renderHook(() => useSummaryTab());
		await waitFor(() => expect(result.current.loading).toBe(false));

		act(() => result.current.setMonth(3));
		act(() => result.current.setWorkId(5));
		expect(getSummaryMonthly).toHaveBeenCalledTimes(1);

		act(() => result.current.setYear(2020));
		await waitFor(() => expect(getSummaryMonthly).toHaveBeenCalledWith(2020));
		expect(getSummaryMonthly).toHaveBeenCalledTimes(2);
	});

	it('sets a translated error message and stops loading when a fetch fails', async () => {
		(getSummaryMonthly as jest.Mock).mockResolvedValue({ data: null, error: { message: 'boom' } });
		(translateError as jest.Mock).mockReturnValue('Error traducido');

		const { result } = renderHook(() => useSummaryTab());
		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.error).toBe('Error traducido');
	});

	it('discards a stale in-flight response when year changes again before it resolves', async () => {
		let resolveFirst: (value: any) => void = () => {};
		(getSummaryMonthly as jest.Mock)
			.mockImplementationOnce(
				() =>
					new Promise((resolve) => {
						resolveFirst = resolve;
					})
			)
			.mockResolvedValueOnce({
				data: [
					{
						month: 1,
						workId: null,
						incomeNet: 1,
						incomeIva: 0,
						expenseNet: 0,
						expenseIva: 0,
						collectionAmount: 0,
						paymentAmount: 0,
					},
				],
				error: null,
			});

		const { result } = renderHook(() => useSummaryTab());

		act(() => result.current.setYear(2020));
		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.cards.incomeNet).toBe(1);

		act(() =>
			resolveFirst({
				data: [
					{
						month: 1,
						workId: null,
						incomeNet: 999,
						incomeIva: 0,
						expenseNet: 0,
						expenseIva: 0,
						collectionAmount: 0,
						paymentAmount: 0,
					},
				],
				error: null,
			})
		);

		expect(result.current.cards.incomeNet).toBe(1);
	});

	it('recomputes cards/chartData/workResultRows from rows already fetched, filtered by month/obra', async () => {
		(getSummaryMonthly as jest.Mock).mockResolvedValue({
			data: [
				{
					month: 3,
					workId: 1,
					incomeNet: 100,
					incomeIva: 0,
					expenseNet: 40,
					expenseIva: 0,
					collectionAmount: 0,
					paymentAmount: 0,
				},
			],
			error: null,
		});

		const { result } = renderHook(() => useSummaryTab());
		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.cards.incomeNet).toBe(100);
		expect(result.current.workResultRows).toHaveLength(1);

		act(() => result.current.setMonth(4));
		expect(result.current.cards.incomeNet).toBe(0);
		expect(result.current.workResultRows).toHaveLength(0);
	});
});
