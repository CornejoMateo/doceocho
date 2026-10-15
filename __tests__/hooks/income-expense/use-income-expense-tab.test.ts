import type { FormEvent } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import {
	IncomeExpenseEntry,
	useIncomeExpenseTab,
} from '@/hooks/income-expense/use-income-expense-tab';
import { listCategories } from '@/lib/categories/categories';
import { listVoucherTypes } from '@/lib/voucher-types/voucher-types';
import { listWorks } from '@/lib/works/works';
import { getLocalDate } from '@/utils/format-date';

jest.mock('@/lib/categories/categories', () => ({
	listCategories: jest.fn(),
}));
jest.mock('@/lib/voucher-types/voucher-types', () => ({
	listVoucherTypes: jest.fn(),
}));
jest.mock('@/lib/works/works', () => ({
	listWorks: jest.fn(),
}));
jest.mock('@/components/ui/use-toast', () => ({
	useToast: () => ({ toast: mockToast }),
}));

const mockToast = jest.fn();

function entry(overrides: Partial<IncomeExpenseEntry> = {}): IncomeExpenseEntry {
	return {
		id: 1,
		date: '2026-05-10',
		voucher_number: 'A-0001',
		voucher_type_id: 1,
		voucher_type_name: 'Factura A',
		work_id: 7,
		work_name: 'Obra Norte',
		party_id: 3,
		party_name: 'Juan Perez',
		category_id: 10,
		category_name: 'Materiales',
		description: 'Compra de materiales',
		net_amount: 1000,
		iva_percent: 21,
		iva_amount: 210,
		total_amount: 1210,
		...overrides,
	};
}

function baseConfig(overrides: Partial<Parameters<typeof useIncomeExpenseTab>[0]> = {}) {
	return {
		categoryKind: 'income' as const,
		listEntries: jest.fn().mockResolvedValue({ data: [], error: null }),
		createEntry: jest.fn().mockResolvedValue({ error: null }),
		updateEntry: jest.fn().mockResolvedValue({ error: null }),
		deleteEntry: jest.fn().mockResolvedValue({ error: null }),
		listParties: jest.fn().mockResolvedValue({ data: [], error: null }),
		labels: {
			entityLabel: 'ingreso',
			loadError: 'No se pudieron cargar los ingresos.',
			saveError: 'No se pudo guardar el ingreso.',
			deleteError: 'No se pudo eliminar el ingreso.',
			createdToast: 'Ingreso creado',
			updatedToast: 'Ingreso actualizado',
			deletedToast: 'Ingreso eliminado',
		},
		...overrides,
	};
}

describe('useIncomeExpenseTab', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(listCategories as jest.Mock).mockResolvedValue({ data: [], error: null });
		(listVoucherTypes as jest.Mock).mockResolvedValue({ data: [], error: null });
		(listWorks as jest.Mock).mockResolvedValue({ data: [], error: null });
	});

	describe('fetching by year', () => {
		it('fetches entries for the current year on mount', async () => {
			const config = baseConfig();
			const currentYear = Number(getLocalDate().slice(0, 4));

			const { result } = renderHook(() => useIncomeExpenseTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			expect(config.listEntries).toHaveBeenCalledWith(currentYear);
			expect(result.current.year).toBe(currentYear);
		});

		it('refetches entries when the selected year changes', async () => {
			const config = baseConfig();
			const { result } = renderHook(() => useIncomeExpenseTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));
			(config.listEntries as jest.Mock).mockClear();

			act(() => result.current.setYear(2020));
			await waitFor(() => expect(config.listEntries).toHaveBeenCalledWith(2020));
		});

		it('discards a stale response that resolves after a newer request', async () => {
			let resolveFirst: (v: any) => void;
			const firstPromise = new Promise((resolve) => (resolveFirst = resolve));
			const config = baseConfig({
				listEntries: jest
					.fn()
					.mockReturnValueOnce(firstPromise)
					.mockResolvedValueOnce({ data: [entry({ id: 99 })], error: null }),
			});

			const { result } = renderHook(() => useIncomeExpenseTab(config));
			act(() => result.current.setYear(2020));
			await waitFor(() => expect(config.listEntries).toHaveBeenCalledTimes(2));
			await waitFor(() => expect(result.current.visibleEntries).toHaveLength(1));

			await act(async () => {
				resolveFirst({ data: [entry({ id: 1 })], error: null });
			});

			expect(result.current.visibleEntries.map((e) => e.id)).toEqual([99]);
		});

		it('shows a toast with the load error when fetching fails', async () => {
			const config = baseConfig({
				listEntries: jest.fn().mockResolvedValue({ data: null, error: { message: 'boom' } }),
			});

			renderHook(() => useIncomeExpenseTab(config));

			await waitFor(() =>
				expect(mockToast).toHaveBeenCalledWith(
					expect.objectContaining({ title: 'Error', variant: 'destructive' })
				)
			);
		});
	});

	describe('filters', () => {
		async function setupWithEntries() {
			const entries = [
				entry({
					id: 1,
					date: '2026-01-10',
					voucher_number: 'A-0001',
					party_id: 3,
					party_name: 'Juan Perez',
					category_id: 10,
					description: 'Materiales',
					work_id: 7,
				}),
				entry({
					id: 2,
					date: '2026-06-15',
					voucher_number: 'B-0002',
					party_id: 4,
					party_name: 'Maria Gomez',
					category_id: 11,
					description: 'Mano de obra',
					work_id: 8,
				}),
			];
			const config = baseConfig({
				listEntries: jest.fn().mockResolvedValue({ data: entries, error: null }),
			});
			const { result } = renderHook(() => useIncomeExpenseTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));
			return { result, entries };
		}

		it('filters by search matching the voucher number', async () => {
			const { result } = await setupWithEntries();

			act(() => result.current.setSearch('B-0002'));

			expect(result.current.visibleEntries.map((e) => e.id)).toEqual([2]);
		});

		it('filters by search matching the description', async () => {
			const { result } = await setupWithEntries();

			act(() => result.current.setSearch('mano de obra'));

			expect(result.current.visibleEntries.map((e) => e.id)).toEqual([2]);
		});

		it('filters by date range', async () => {
			const { result } = await setupWithEntries();

			act(() => {
				result.current.setDateFrom('2026-05-01');
				result.current.setDateTo('2026-12-31');
			});

			expect(result.current.visibleEntries.map((e) => e.id)).toEqual([2]);
		});

		it('filters by work', async () => {
			const { result } = await setupWithEntries();

			act(() => result.current.setFilterWorkId('8'));

			expect(result.current.visibleEntries.map((e) => e.id)).toEqual([2]);
		});

		it('filters by party', async () => {
			const { result } = await setupWithEntries();

			act(() => result.current.setFilterPartyId('3'));

			expect(result.current.visibleEntries.map((e) => e.id)).toEqual([1]);
		});

		it('filters by category', async () => {
			const { result } = await setupWithEntries();

			act(() => result.current.setFilterCategoryId('11'));

			expect(result.current.visibleEntries.map((e) => e.id)).toEqual([2]);
		});

		it('counts active modal filters but excludes search', async () => {
			const { result } = await setupWithEntries();

			act(() => {
				result.current.setSearch('something');
				result.current.setFilterWorkId('8');
				result.current.setFilterPartyId('4');
			});

			expect(result.current.activeFilterCount).toBe(2);
		});

		it('clearFilters resets modal filters but leaves search untouched', async () => {
			const { result } = await setupWithEntries();

			act(() => {
				result.current.setSearch('mano de obra');
				result.current.setFilterWorkId('8');
				result.current.setFilterPartyId('4');
				result.current.setFilterCategoryId('11');
				result.current.setDateFrom('2026-01-01');
				result.current.setDateTo('2026-12-31');
			});
			act(() => result.current.clearFilters());

			expect(result.current.search).toBe('mano de obra');
			expect(result.current.activeFilterCount).toBe(0);
		});
	});

	describe('summary', () => {
		it('computes totals and average over the visible (filtered) entries only', async () => {
			const entries = [
				entry({ id: 1, net_amount: 1000, iva_amount: 210, total_amount: 1210, party_id: 3 }),
				entry({ id: 2, net_amount: 500, iva_amount: 0, total_amount: 500, party_id: 4 }),
			];
			const config = baseConfig({
				listEntries: jest.fn().mockResolvedValue({ data: entries, error: null }),
			});
			const { result } = renderHook(() => useIncomeExpenseTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			act(() => result.current.setFilterPartyId('3'));

			expect(result.current.summary).toEqual({
				count: 1,
				totalNet: 1000,
				totalIva: 210,
				totalGross: 1210,
				average: 1210,
			});
		});

		it('returns an average of 0 when there are no visible entries', async () => {
			const config = baseConfig();
			const { result } = renderHook(() => useIncomeExpenseTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			expect(result.current.summary).toEqual({
				count: 0,
				totalNet: 0,
				totalIva: 0,
				totalGross: 0,
				average: 0,
			});
		});
	});

	describe('add / edit form', () => {
		it('handleAdd clears the form and opens the dialog', async () => {
			const config = baseConfig();
			const { result } = renderHook(() => useIncomeExpenseTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			act(() => result.current.handleAdd());

			expect(result.current.isFormOpen).toBe(true);
			expect(result.current.editingEntry).toBeNull();
			expect(result.current.netAmount).toBe('');
		});

		it('handleEdit populates the form with the entry data, formatting the net amount', async () => {
			const config = baseConfig();
			const { result } = renderHook(() => useIncomeExpenseTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));
			const target = entry({ id: 5, net_amount: 1234.5, iva_percent: 10.5 });

			act(() => result.current.handleEdit(target));

			expect(result.current.isFormOpen).toBe(true);
			expect(result.current.editingEntry).toEqual(target);
			expect(result.current.netAmount).toBe('1.234,5');
			expect(result.current.ivaPercent).toBe(10.5);
			expect(result.current.partyId).toBe('3');
		});
	});

	describe('handleSubmit', () => {
		function fakeEvent() {
			return { preventDefault: jest.fn() } as unknown as FormEvent;
		}

		it('does not call createEntry when required fields are missing', async () => {
			const config = baseConfig();
			const { result } = renderHook(() => useIncomeExpenseTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			act(() => result.current.handleAdd());
			await act(async () => result.current.handleSubmit(fakeEvent()));

			expect(config.createEntry).not.toHaveBeenCalled();
		});

		it('sets a party field error and shows a toast when the client is missing', async () => {
			const config = baseConfig();
			const { result } = renderHook(() => useIncomeExpenseTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			act(() => {
				result.current.handleAdd();
				result.current.setVoucherTypeId('1');
				result.current.setCategoryId('10');
				result.current.setNetAmount('1000');
			});
			await act(async () => result.current.handleSubmit(fakeEvent()));

			expect(config.createEntry).not.toHaveBeenCalled();
			expect(result.current.errors.partyId).toBe(true);
			expect(mockToast).toHaveBeenCalledWith(
				expect.objectContaining({
					title: 'Completá los campos obligatorios',
					variant: 'destructive',
				})
			);
		});

		it('sets an amount field error when the net amount is negative', async () => {
			const config = baseConfig();
			const { result } = renderHook(() => useIncomeExpenseTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			act(() => {
				result.current.handleAdd();
				result.current.setVoucherTypeId('1');
				result.current.setPartyId('3');
				result.current.setCategoryId('10');
				result.current.setNetAmount('-100');
			});
			await act(async () => result.current.handleSubmit(fakeEvent()));

			expect(config.createEntry).not.toHaveBeenCalled();
			expect(result.current.errors.netAmount).toBe(true);
		});

		it('clears the party field error once a client is selected', async () => {
			const config = baseConfig();
			const { result } = renderHook(() => useIncomeExpenseTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			act(() => {
				result.current.handleAdd();
				result.current.setVoucherTypeId('1');
				result.current.setCategoryId('10');
				result.current.setNetAmount('1000');
			});
			await act(async () => result.current.handleSubmit(fakeEvent()));
			expect(result.current.errors.partyId).toBe(true);

			act(() => result.current.setPartyId('3'));

			expect(result.current.errors.partyId).toBeFalsy();
		});

		it('creates a new entry with the rounded net amount and computed iva/total', async () => {
			const config = baseConfig();
			const { result } = renderHook(() => useIncomeExpenseTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			act(() => {
				result.current.handleAdd();
				result.current.setVoucherTypeId('1');
				result.current.setPartyId('3');
				result.current.setCategoryId('10');
				result.current.setNetAmount('1000,125');
				result.current.setIvaPercent(21);
			});
			await act(async () => result.current.handleSubmit(fakeEvent()));

			expect(config.createEntry).toHaveBeenCalledWith(
				expect.objectContaining({ net_amount: 1000.13, iva_amount: 210.03, total_amount: 1210.16 })
			);
			expect(mockToast).toHaveBeenCalledWith({ title: 'Ingreso creado' });
		});

		it('updates the editing entry instead of creating one', async () => {
			const config = baseConfig();
			const { result } = renderHook(() => useIncomeExpenseTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));
			const target = entry({ id: 5 });

			act(() => result.current.handleEdit(target));
			await act(async () => result.current.handleSubmit(fakeEvent()));

			expect(config.updateEntry).toHaveBeenCalledWith(5, expect.objectContaining({ party_id: 3 }));
			expect(config.createEntry).not.toHaveBeenCalled();
			expect(mockToast).toHaveBeenCalledWith({ title: 'Ingreso actualizado' });
		});

		it('shows an error toast and keeps the dialog open when saving fails', async () => {
			const config = baseConfig({
				createEntry: jest.fn().mockResolvedValue({ error: { message: 'boom' } }),
			});
			const { result } = renderHook(() => useIncomeExpenseTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			act(() => {
				result.current.handleAdd();
				result.current.setVoucherTypeId('1');
				result.current.setPartyId('3');
				result.current.setCategoryId('10');
				result.current.setNetAmount('1000');
			});
			await act(async () => result.current.handleSubmit(fakeEvent()));

			expect(result.current.isFormOpen).toBe(true);
			expect(mockToast).toHaveBeenCalledWith(
				expect.objectContaining({ title: 'Error', variant: 'destructive' })
			);
		});
	});

	describe('confirmDelete', () => {
		it('does nothing when there is no entry marked for deletion', async () => {
			const config = baseConfig();
			const { result } = renderHook(() => useIncomeExpenseTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			await act(async () => result.current.confirmDelete());

			expect(config.deleteEntry).not.toHaveBeenCalled();
		});

		it('deletes the selected entry, toasts, and refetches', async () => {
			const config = baseConfig();
			const { result } = renderHook(() => useIncomeExpenseTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));
			const target = entry({ id: 5 });

			act(() => result.current.setEntryToDelete(target));
			await act(async () => result.current.confirmDelete());

			expect(config.deleteEntry).toHaveBeenCalledWith(5);
			expect(mockToast).toHaveBeenCalledWith({ title: 'Ingreso eliminado' });
			expect(result.current.entryToDelete).toBeNull();
		});

		it('shows an error toast when deletion fails', async () => {
			const config = baseConfig({
				deleteEntry: jest.fn().mockResolvedValue({ error: { message: 'boom' } }),
			});
			const { result } = renderHook(() => useIncomeExpenseTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));
			const target = entry({ id: 5 });

			act(() => result.current.setEntryToDelete(target));
			await act(async () => result.current.confirmDelete());

			expect(mockToast).toHaveBeenCalledWith(
				expect.objectContaining({ title: 'Error', variant: 'destructive' })
			);
			expect(result.current.entryToDelete).toBeNull();
		});
	});
});
