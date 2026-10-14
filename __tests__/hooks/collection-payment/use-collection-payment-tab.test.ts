import type { FormEvent } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import {
	CollectionPaymentEntry,
	useCollectionPaymentTab,
} from '@/hooks/collection-payment/use-collection-payment-tab';
import { listCategories } from '@/lib/categories/categories';
import { listWorks } from '@/lib/works/works';
import { listPaymentMethods } from '@/lib/payment-methods/payment-methods';
import { listActiveBankAccounts } from '@/lib/cash-flow/cash-flow';
import { getLocalDate } from '@/utils/format-date';

jest.mock('@/lib/categories/categories', () => ({
	listCategories: jest.fn(),
}));
jest.mock('@/lib/works/works', () => ({
	listWorks: jest.fn(),
}));
jest.mock('@/lib/payment-methods/payment-methods', () => ({
	listPaymentMethods: jest.fn(),
}));
jest.mock('@/lib/cash-flow/cash-flow', () => ({
	listActiveBankAccounts: jest.fn(),
}));
jest.mock('@/components/ui/use-toast', () => ({
	useToast: () => ({ toast: mockToast }),
}));

const mockToast = jest.fn();

function entry(overrides: Partial<CollectionPaymentEntry> = {}): CollectionPaymentEntry {
	return {
		id: 1,
		date: '2026-05-10',
		receipt_number: 'R-0001',
		work_id: 7,
		work_name: 'Obra Norte',
		party_id: 3,
		party_name: 'Juan Perez',
		category_id: 10,
		category_name: 'Cuota',
		description: 'Cuota mensual',
		amount: 1000,
		payment_method_id: 2,
		payment_method_name: 'Transferencia',
		bank_account_id: 4,
		bank_account_name: 'Banco Nación - Cuenta principal',
		...overrides,
	};
}

function baseConfig(overrides: Partial<Parameters<typeof useCollectionPaymentTab>[0]> = {}) {
	return {
		categoryKind: 'collection' as const,
		listEntries: jest.fn().mockResolvedValue({ data: [], error: null }),
		createEntry: jest.fn().mockResolvedValue({ error: null }),
		updateEntry: jest.fn().mockResolvedValue({ error: null }),
		deleteEntry: jest.fn().mockResolvedValue({ error: null }),
		listParties: jest.fn().mockResolvedValue({ data: [], error: null }),
		labels: {
			entityLabel: 'cobro',
			loadError: 'No se pudieron cargar los cobros.',
			saveError: 'No se pudo guardar el cobro.',
			deleteError: 'No se pudo eliminar el cobro.',
			createdToast: 'Cobro creado',
			updatedToast: 'Cobro actualizado',
			deletedToast: 'Cobro eliminado',
		},
		...overrides,
	};
}

describe('useCollectionPaymentTab', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(listCategories as jest.Mock).mockResolvedValue({ data: [], error: null });
		(listWorks as jest.Mock).mockResolvedValue({ data: [], error: null });
		(listPaymentMethods as jest.Mock).mockResolvedValue({ data: [], error: null });
		(listActiveBankAccounts as jest.Mock).mockResolvedValue({ data: [], error: null });
	});

	describe('fetching by year', () => {
		it('fetches entries for the current year on mount', async () => {
			const config = baseConfig();
			const currentYear = Number(getLocalDate().slice(0, 4));

			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			expect(config.listEntries).toHaveBeenCalledWith(currentYear);
			expect(result.current.year).toBe(currentYear);
		});

		it('refetches entries when the selected year changes', async () => {
			const config = baseConfig();
			const { result } = renderHook(() => useCollectionPaymentTab(config));
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

			const { result } = renderHook(() => useCollectionPaymentTab(config));
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

			renderHook(() => useCollectionPaymentTab(config));

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
					receipt_number: 'R-0001',
					party_id: 3,
					party_name: 'Juan Perez',
					category_id: 10,
					description: 'Cuota',
					work_id: 7,
					payment_method_id: 2,
				}),
				entry({
					id: 2,
					date: '2026-06-15',
					receipt_number: 'R-0002',
					party_id: 4,
					party_name: 'Maria Gomez',
					category_id: 11,
					description: 'Adelanto',
					work_id: 8,
					payment_method_id: 3,
				}),
			];
			const config = baseConfig({
				listEntries: jest.fn().mockResolvedValue({ data: entries, error: null }),
			});
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));
			return { result, entries };
		}

		it('filters by search matching the receipt number', async () => {
			const { result } = await setupWithEntries();

			act(() => result.current.setSearch('R-0002'));

			expect(result.current.visibleEntries.map((e) => e.id)).toEqual([2]);
		});

		it('filters by search matching the detail/description', async () => {
			const { result } = await setupWithEntries();

			act(() => result.current.setSearch('adelanto'));

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

		it('filters by payment method', async () => {
			const { result } = await setupWithEntries();

			act(() => result.current.setFilterPaymentMethodId('3'));

			expect(result.current.visibleEntries.map((e) => e.id)).toEqual([2]);
		});

		it('counts active modal filters but excludes search', async () => {
			const { result } = await setupWithEntries();

			act(() => {
				result.current.setSearch('something');
				result.current.setFilterWorkId('8');
				result.current.setFilterPaymentMethodId('3');
			});

			expect(result.current.activeFilterCount).toBe(2);
		});

		it('clearFilters resets modal filters but leaves search untouched', async () => {
			const { result } = await setupWithEntries();

			act(() => {
				result.current.setSearch('adelanto');
				result.current.setFilterWorkId('8');
				result.current.setFilterPartyId('4');
				result.current.setFilterCategoryId('11');
				result.current.setFilterPaymentMethodId('3');
				result.current.setDateFrom('2026-01-01');
				result.current.setDateTo('2026-12-31');
			});
			act(() => result.current.clearFilters());

			expect(result.current.search).toBe('adelanto');
			expect(result.current.activeFilterCount).toBe(0);
		});
	});

	describe('summary', () => {
		it('computes count, total, average and max over the visible (filtered) entries only', async () => {
			const entries = [
				entry({ id: 1, amount: 1000, party_id: 3 }),
				entry({ id: 2, amount: 500, party_id: 4 }),
			];
			const config = baseConfig({
				listEntries: jest.fn().mockResolvedValue({ data: entries, error: null }),
			});
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			expect(result.current.summary).toEqual({ count: 2, total: 1500, average: 750, max: 1000 });

			act(() => result.current.setFilterPartyId('3'));

			expect(result.current.summary).toEqual({ count: 1, total: 1000, average: 1000, max: 1000 });
		});

		it('returns zeroed summary values when there are no visible entries', async () => {
			const config = baseConfig();
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			expect(result.current.summary).toEqual({ count: 0, total: 0, average: 0, max: 0 });
		});
	});

	describe('add / edit form', () => {
		it('handleAdd clears the form (bank account defaults to "none") and opens the dialog', async () => {
			const config = baseConfig();
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			act(() => result.current.handleAdd());

			expect(result.current.isFormOpen).toBe(true);
			expect(result.current.editingEntry).toBeNull();
			expect(result.current.amount).toBe('');
			expect(result.current.bankAccountId).toBe('none');
		});

		it('handleEdit populates the form with the entry data, formatting the amount', async () => {
			const config = baseConfig();
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));
			const target = entry({ id: 5, amount: 1234.5, bank_account_id: 4 });

			act(() => result.current.handleEdit(target));

			expect(result.current.isFormOpen).toBe(true);
			expect(result.current.editingEntry).toEqual(target);
			expect(result.current.amount).toBe('1.234,5');
			expect(result.current.paymentMethodId).toBe('2');
			expect(result.current.bankAccountId).toBe('4');
		});

		it('handleEdit defaults the bank account to "none" when the entry has none', async () => {
			const config = baseConfig();
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));
			const target = entry({ id: 5, bank_account_id: null });

			act(() => result.current.handleEdit(target));

			expect(result.current.bankAccountId).toBe('none');
		});
	});

	describe('handleSubmit', () => {
		function fakeEvent() {
			return { preventDefault: jest.fn() } as unknown as FormEvent;
		}

		it('does not call createEntry when required fields are missing', async () => {
			const config = baseConfig();
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			act(() => result.current.handleAdd());
			await act(async () => result.current.handleSubmit(fakeEvent()));

			expect(config.createEntry).not.toHaveBeenCalled();
		});

		it('does not call createEntry when the amount is zero', async () => {
			const config = baseConfig();
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			act(() => {
				result.current.handleAdd();
				result.current.setPartyId('3');
				result.current.setPaymentMethodId('2');
				result.current.setAmount('0');
			});
			await act(async () => result.current.handleSubmit(fakeEvent()));

			expect(config.createEntry).not.toHaveBeenCalled();
		});

		it('creates a new entry with the rounded amount, mapping "none" bank account to null', async () => {
			const config = baseConfig();
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			act(() => {
				result.current.handleAdd();
				result.current.setPartyId('3');
				result.current.setPaymentMethodId('2');
				result.current.setAmount('1000,125');
			});
			await act(async () => result.current.handleSubmit(fakeEvent()));

			expect(config.createEntry).toHaveBeenCalledWith(
				expect.objectContaining({ amount: 1000.13, bank_account_id: null })
			);
			expect(mockToast).toHaveBeenCalledWith({ title: 'Cobro creado' });
		});

		it('updates the editing entry instead of creating one', async () => {
			const config = baseConfig();
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));
			const target = entry({ id: 5 });

			act(() => result.current.handleEdit(target));
			await act(async () => result.current.handleSubmit(fakeEvent()));

			expect(config.updateEntry).toHaveBeenCalledWith(5, expect.objectContaining({ party_id: 3 }));
			expect(config.createEntry).not.toHaveBeenCalled();
			expect(mockToast).toHaveBeenCalledWith({ title: 'Cobro actualizado' });
		});

		it('shows an error toast and keeps the dialog open when saving fails', async () => {
			const config = baseConfig({
				createEntry: jest.fn().mockResolvedValue({ error: { message: 'boom' } }),
			});
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			act(() => {
				result.current.handleAdd();
				result.current.setPartyId('3');
				result.current.setPaymentMethodId('2');
				result.current.setAmount('1000');
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
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			await act(async () => result.current.confirmDelete());

			expect(config.deleteEntry).not.toHaveBeenCalled();
		});

		it('deletes the selected entry, toasts, and refetches', async () => {
			const config = baseConfig();
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));
			const target = entry({ id: 5 });

			act(() => result.current.setEntryToDelete(target));
			await act(async () => result.current.confirmDelete());

			expect(config.deleteEntry).toHaveBeenCalledWith(5);
			expect(mockToast).toHaveBeenCalledWith({ title: 'Cobro eliminado' });
			expect(result.current.entryToDelete).toBeNull();
		});

		it('shows an error toast when deletion fails', async () => {
			const config = baseConfig({
				deleteEntry: jest.fn().mockResolvedValue({ error: { message: 'boom' } }),
			});
			const { result } = renderHook(() => useCollectionPaymentTab(config));
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
