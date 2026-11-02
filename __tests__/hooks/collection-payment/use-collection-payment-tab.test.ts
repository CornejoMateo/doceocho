import type { FormEvent } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import {
	CollectionPaymentEntry,
	useCollectionPaymentTab,
} from '@/hooks/collection-payment/use-collection-payment-tab';
import { listCategories } from '@/lib/categories/categories';
import { listWorks } from '@/lib/works/works';
import { listPaymentMethods } from '@/lib/payment-methods/payment-methods';
import { listBankAccounts } from '@/lib/cash-flow/cash-flow';
import { getLocalDate } from '@/utils/format-date';
import { uploadFilePayment } from '@/lib/payments/files-payments';
import type { StagedFile } from '@/components/business/shared/attachments/file-attachments';

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
	listBankAccounts: jest.fn(),
}));
jest.mock('@/components/ui/use-toast', () => ({
	useToast: () => ({ toast: mockToast }),
}));
jest.mock('@/lib/payments/files-payments', () => ({
	uploadFilePayment: jest.fn(),
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
		(listBankAccounts as jest.Mock).mockResolvedValue({ data: [], error: null });
		(uploadFilePayment as jest.Mock).mockResolvedValue({ data: { id: 1 }, error: null });
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
			expect(result.current.errors.amount).toBe(true);
		});

		it('sets a party field error and shows a toast when a required party is missing', async () => {
			const config = baseConfig();
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			act(() => {
				result.current.handleAdd();
				result.current.setPaymentMethodId('2');
				result.current.setAmount('1000');
			});
			await act(async () => result.current.handleSubmit(fakeEvent()));

			expect(result.current.errors.partyId).toBe(true);
			expect(mockToast).toHaveBeenCalledWith(
				expect.objectContaining({
					title: 'Completá los campos obligatorios',
					variant: 'destructive',
				})
			);
		});

		it('clears the amount field error once a valid amount is entered', async () => {
			const config = baseConfig();
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			act(() => {
				result.current.handleAdd();
				result.current.setPartyId('3');
				result.current.setPaymentMethodId('2');
			});
			await act(async () => result.current.handleSubmit(fakeEvent()));
			expect(result.current.errors.amount).toBe(true);

			act(() => result.current.setAmount('1000'));

			expect(result.current.errors.amount).toBeFalsy();
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

			expect(config.updateEntry).toHaveBeenCalledWith(
				5,
				expect.objectContaining({ party_id: 3 }),
				target
			);
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

	describe('double-submit guard', () => {
		function fakeEvent() {
			return { preventDefault: jest.fn() } as unknown as FormEvent;
		}

		function fillValidForm(result: any) {
			result.current.handleAdd();
			result.current.setPartyId('3');
			result.current.setPaymentMethodId('2');
			result.current.setAmount('1000');
		}

		it('calls createEntry only once when handleSubmit fires twice in the same tick', async () => {
			const config = baseConfig();
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			act(() => fillValidForm(result));
			await act(async () => {
				const first = result.current.handleSubmit(fakeEvent());
				const second = result.current.handleSubmit(fakeEvent());
				await Promise.all([first, second]);
			});

			expect(config.createEntry).toHaveBeenCalledTimes(1);
		});

		it('allows a new submit once the previous one has settled', async () => {
			const config = baseConfig();
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			act(() => fillValidForm(result));
			await act(async () => result.current.handleSubmit(fakeEvent()));
			expect(config.createEntry).toHaveBeenCalledTimes(1);

			act(() => fillValidForm(result));
			await act(async () => result.current.handleSubmit(fakeEvent()));

			expect(config.createEntry).toHaveBeenCalledTimes(2);
		});

		it('does not leave the guard stuck after a validation failure', async () => {
			const config = baseConfig();
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			act(() => result.current.handleAdd());
			await act(async () => result.current.handleSubmit(fakeEvent()));
			expect(config.createEntry).not.toHaveBeenCalled();

			act(() => fillValidForm(result));
			await act(async () => result.current.handleSubmit(fakeEvent()));

			expect(config.createEntry).toHaveBeenCalledTimes(1);
		});
	});

	describe('payments-only: optional party and the "Compra" picker', () => {
		function fakeEvent() {
			return { preventDefault: jest.fn() } as unknown as FormEvent;
		}

		function paymentsConfig(overrides: Partial<ReturnType<typeof baseConfig>> = {}) {
			return baseConfig({
				partyOptional: true,
				loadPurchases: jest
					.fn()
					.mockResolvedValue({ data: [{ id: 9, name: 'Compra 9' }], error: null }),
				...overrides,
			});
		}

		it('submits with no party and no purchase when party is left empty', async () => {
			const config = paymentsConfig();
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			act(() => {
				result.current.handleAdd();
				result.current.setPaymentMethodId('2');
				result.current.setAmount('1000');
			});
			await act(async () => result.current.handleSubmit(fakeEvent()));

			expect(config.createEntry).toHaveBeenCalledWith(
				expect.objectContaining({ party_id: null, purchase_supplier_id: null })
			);
			expect(result.current.errors.partyId).toBeFalsy();
		});

		it('truncates an over-300-char description to 300 when the party is removed before submit', async () => {
			const config = paymentsConfig();
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));
			const longDescription = 'a'.repeat(500);

			act(() => {
				result.current.handleAdd();
				result.current.setPartyId('3');
			});
			await waitFor(() => expect(result.current.purchasesLoading).toBe(false));
			act(() => {
				result.current.setPurchaseId('9');
				result.current.setDescription(longDescription);
				// Simulates clicking "Quitar" on the party field.
				result.current.setPartyId('');
				result.current.setPaymentMethodId('2');
				result.current.setAmount('1000');
			});
			await act(async () => result.current.handleSubmit(fakeEvent()));

			expect(config.createEntry).toHaveBeenCalledWith(
				expect.objectContaining({ description: 'a'.repeat(300), party_id: null })
			);
		});

		it('blocks submit and sets a purchase field error when a party is selected but no purchase is chosen', async () => {
			const config = paymentsConfig();
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			act(() => {
				result.current.handleAdd();
				result.current.setPartyId('3');
				result.current.setPaymentMethodId('2');
				result.current.setAmount('1000');
			});
			await act(async () => result.current.handleSubmit(fakeEvent()));

			expect(config.createEntry).not.toHaveBeenCalled();
			expect(result.current.errors.purchaseId).toBe(true);
		});

		it('clears the purchase field error once a purchase is chosen', async () => {
			const config = paymentsConfig();
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			act(() => {
				result.current.handleAdd();
				result.current.setPartyId('3');
				result.current.setPaymentMethodId('2');
				result.current.setAmount('1000');
			});
			await act(async () => result.current.handleSubmit(fakeEvent()));
			expect(result.current.errors.purchaseId).toBe(true);

			await waitFor(() => expect(result.current.purchases).toEqual([{ id: 9, name: 'Compra 9' }]));
			act(() => result.current.setPurchaseId('9'));

			expect(result.current.errors.purchaseId).toBeFalsy();
		});

		it('loads purchases for the selected party and submits with the chosen purchase', async () => {
			const config = paymentsConfig();
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			act(() => {
				result.current.handleAdd();
				result.current.setPartyId('3');
			});
			await waitFor(() => expect(config.loadPurchases).toHaveBeenCalledWith(3, undefined));
			await waitFor(() => expect(result.current.purchases).toEqual([{ id: 9, name: 'Compra 9' }]));

			act(() => {
				result.current.setPurchaseId('9');
				result.current.setPaymentMethodId('2');
				result.current.setAmount('1000');
			});
			await act(async () => result.current.handleSubmit(fakeEvent()));

			expect(config.createEntry).toHaveBeenCalledWith(
				expect.objectContaining({ party_id: 3, purchase_supplier_id: 9 })
			);
		});

		it('resets the chosen purchase when the party changes', async () => {
			const config = paymentsConfig();
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			act(() => result.current.setPartyId('3'));
			await waitFor(() => expect(result.current.purchases).toEqual([{ id: 9, name: 'Compra 9' }]));
			act(() => result.current.setPurchaseId('9'));

			act(() => result.current.setPartyId('4'));

			expect(result.current.purchaseId).toBe('');
		});

		it('keeps the prefilled purchase when editing a supplier-origin entry', async () => {
			const config = paymentsConfig();
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));
			const target = entry({ id: 5, party_id: 3, purchase_supplier_id: 9, source: 'supplier' });

			act(() => result.current.handleEdit(target));

			expect(result.current.purchaseId).toBe('9');
			await waitFor(() =>
				expect(config.loadPurchases).toHaveBeenCalledWith(3, { purchaseId: 9, amount: 1000 })
			);
		});

		it("excludes a different edited payment's own amount from its purchase on reload", async () => {
			const config = paymentsConfig();
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));
			const target = entry({
				id: 6,
				party_id: 3,
				purchase_supplier_id: 11,
				source: 'supplier',
				amount: 250,
			});

			act(() => result.current.handleEdit(target));

			await waitFor(() =>
				expect(config.loadPurchases).toHaveBeenCalledWith(3, { purchaseId: 11, amount: 250 })
			);
		});

		it('exposes the default linkedLabel ("Compra") when not configured', async () => {
			const config = baseConfig();
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			expect(result.current.linkedLabel).toBe('Compra');
		});

		it('allows party to stay required (unaffected) when partyOptional is not set', async () => {
			const config = baseConfig();
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			act(() => {
				result.current.handleAdd();
				result.current.setPaymentMethodId('2');
				result.current.setAmount('1000');
			});
			await act(async () => result.current.handleSubmit(fakeEvent()));

			expect(config.createEntry).not.toHaveBeenCalled();
		});
	});

	describe('hideParty (Pagos: payments have no party column at all)', () => {
		function fakeEvent() {
			return { preventDefault: jest.fn() } as unknown as FormEvent;
		}

		it('does not require a party on submit, and works without a listParties config', async () => {
			const config = baseConfig({ hideParty: true, listParties: undefined });
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			act(() => {
				result.current.handleAdd();
				result.current.setPaymentMethodId('2');
				result.current.setAmount('1000');
			});
			await act(async () => result.current.handleSubmit(fakeEvent()));

			expect(config.createEntry).toHaveBeenCalled();
			expect(result.current.parties).toEqual([]);
		});

		it('exposes hideParty: false by default (Cobros/other callers unaffected)', async () => {
			const config = baseConfig();
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			expect(result.current.hideParty).toBe(false);
		});

		it('exposes hideParty: true when configured', async () => {
			const config = baseConfig({ hideParty: true });
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			expect(result.current.hideParty).toBe(true);
		});
	});

	describe('collections-only: optional party and the "Cuenta" picker (loadAccounts)', () => {
		function fakeEvent() {
			return { preventDefault: jest.fn() } as unknown as FormEvent;
		}

		function collectionsConfig(overrides: Partial<ReturnType<typeof baseConfig>> = {}) {
			return baseConfig({
				partyOptional: true,
				linkedLabel: 'Cuenta',
				loadAccounts: jest
					.fn()
					.mockResolvedValue({ data: [{ id: 8, name: 'Cuenta 8' }], error: null }),
				...overrides,
			});
		}

		it('exposes linkedLabel "Cuenta" when configured via loadAccounts', async () => {
			const config = collectionsConfig();
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			expect(result.current.linkedLabel).toBe('Cuenta');
		});

		it('submits with no party and no balance_id when party is left empty', async () => {
			const config = collectionsConfig();
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			act(() => {
				result.current.handleAdd();
				result.current.setPaymentMethodId('2');
				result.current.setAmount('1000');
			});
			await act(async () => result.current.handleSubmit(fakeEvent()));

			expect(config.createEntry).toHaveBeenCalledWith(
				expect.objectContaining({ party_id: null, balance_id: null })
			);
		});

		it('blocks submit and sets a purchase field error when a party is selected but no account is chosen', async () => {
			const config = collectionsConfig();
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			act(() => {
				result.current.handleAdd();
				result.current.setPartyId('3');
				result.current.setPaymentMethodId('2');
				result.current.setAmount('1000');
			});
			await act(async () => result.current.handleSubmit(fakeEvent()));

			expect(config.createEntry).not.toHaveBeenCalled();
			expect(result.current.errors.purchaseId).toBe(true);
		});

		it('loads accounts for the selected party and submits with the chosen account and resolved payment_method_name', async () => {
			const config = collectionsConfig();
			(listPaymentMethods as jest.Mock).mockResolvedValue({
				data: [{ id: 2, name: 'Transferencia', is_active: true }],
				error: null,
			});
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			act(() => {
				result.current.handleAdd();
				result.current.setPartyId('3');
			});
			await waitFor(() => expect(config.loadAccounts).toHaveBeenCalledWith(3, undefined));
			await waitFor(() => expect(result.current.purchases).toEqual([{ id: 8, name: 'Cuenta 8' }]));

			act(() => {
				result.current.setPurchaseId('8');
				result.current.setPaymentMethodId('2');
				result.current.setAmount('1000');
			});
			await act(async () => result.current.handleSubmit(fakeEvent()));

			expect(config.createEntry).toHaveBeenCalledWith(
				expect.objectContaining({
					party_id: 3,
					balance_id: 8,
					purchase_supplier_id: 8,
					payment_method_name: 'Transferencia',
				})
			);
		});

		it('keeps the prefilled account when editing a client-origin entry', async () => {
			const config = collectionsConfig();
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));
			const target = entry({ id: 5, party_id: 3, balance_id: 8, source: 'client' });

			act(() => result.current.handleEdit(target));

			expect(result.current.purchaseId).toBe('8');
			await waitFor(() => expect(config.loadAccounts).toHaveBeenCalledWith(3, undefined));
		});
	});

	describe('expense link (Payments-only)', () => {
		function fakeEvent() {
			return { preventDefault: jest.fn() } as unknown as FormEvent;
		}

		function expenseConfig(overrides: Partial<ReturnType<typeof baseConfig>> = {}) {
			return baseConfig({
				partyOptional: true,
				listExpenseOptions: jest
					.fn()
					.mockResolvedValue({ data: [{ id: 42, name: 'Gasto 42' }], error: null }),
				...overrides,
			});
		}

		it('exposes supportsExpenseLink as false when the config has no listExpenseOptions (Collections)', async () => {
			const config = baseConfig();
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			expect(result.current.supportsExpenseLink).toBe(false);
		});

		it('exposes supportsExpenseLink as true and fetches expense options on mount (Payments)', async () => {
			const config = expenseConfig();
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			expect(result.current.supportsExpenseLink).toBe(true);
			await waitFor(() =>
				expect(result.current.expenseOptions).toEqual([{ id: 42, name: 'Gasto 42' }])
			);
		});

		it('refetches expense options when the selected year changes', async () => {
			const config = expenseConfig();
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));
			(config.listExpenseOptions as jest.Mock).mockClear();

			act(() => result.current.setYear(2020));

			await waitFor(() => expect(config.listExpenseOptions).toHaveBeenCalledWith(2020));
		});

		it('handleAdd with a prefill sets amount, work, description, payment method, bank account, receipt number and expense', async () => {
			const config = expenseConfig();
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			act(() =>
				result.current.handleAdd({
					amount: 500,
					work_id: 7,
					description: 'Pago de gasto',
					payment_method_id: 2,
					bank_account_id: 4,
					receipt_number: '0001-00000456',
					expense_id: 99,
					expense_label: 'Gasto 99 (fuera de año)',
				})
			);

			expect(result.current.isFormOpen).toBe(true);
			expect(result.current.amount).toBe('500');
			expect(result.current.workId).toBe('7');
			expect(result.current.description).toBe('Pago de gasto');
			expect(result.current.paymentMethodId).toBe('2');
			expect(result.current.bankAccountId).toBe('4');
			expect(result.current.receiptNumber).toBe('0001-00000456');
			expect(result.current.expenseId).toBe('99');
			expect(result.current.expenseOptions).toEqual(
				expect.arrayContaining([{ id: 99, name: 'Gasto 99 (fuera de año)' }])
			);
		});

		it('handleEdit preloads expenseId and keeps the linked expense selectable even if outside the fetched options', async () => {
			const config = expenseConfig();
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));
			const target = entry({ id: 5, expense_id: 7, expense_label: 'Gasto histórico' });

			act(() => result.current.handleEdit(target));

			expect(result.current.expenseId).toBe('7');
			expect(result.current.expenseOptions).toEqual(
				expect.arrayContaining([{ id: 7, name: 'Gasto histórico' }])
			);
		});

		it('handleEdit defaults expenseId to empty when the entry has no linked expense', async () => {
			const config = expenseConfig();
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));
			const target = entry({ id: 5, expense_id: null });

			act(() => result.current.handleEdit(target));

			expect(result.current.expenseId).toBe('');
		});

		it('submits with expense_id null when none is chosen', async () => {
			const config = expenseConfig();
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			act(() => {
				result.current.handleAdd();
				result.current.setPaymentMethodId('2');
				result.current.setAmount('1000');
			});
			await act(async () => result.current.handleSubmit(fakeEvent()));

			expect(config.createEntry).toHaveBeenCalledWith(
				expect.objectContaining({ expense_id: null })
			);
		});

		it('submits with the chosen expense_id, settable/changeable/clearable via setExpenseId', async () => {
			const config = expenseConfig();
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			act(() => {
				result.current.handleAdd();
				result.current.setPaymentMethodId('2');
				result.current.setAmount('1000');
				result.current.setExpenseId('42');
			});
			await act(async () => result.current.handleSubmit(fakeEvent()));
			expect(config.createEntry).toHaveBeenCalledWith(expect.objectContaining({ expense_id: 42 }));

			// Change to a different expense.
			act(() => result.current.setExpenseId('43'));
			expect(result.current.expenseId).toBe('43');

			// Clear back to none.
			act(() => result.current.setExpenseId(''));
			expect(result.current.expenseId).toBe('');
		});
	});

	describe('paymentMethodOptional (Pagos only; Cobros stays required)', () => {
		function fakeEvent() {
			return { preventDefault: jest.fn() } as unknown as FormEvent;
		}

		it('defaults paymentMethodId to "none" and exposes paymentMethodOptional: true when configured', async () => {
			const config = baseConfig({ hideParty: true, paymentMethodOptional: true });
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			expect(result.current.paymentMethodOptional).toBe(true);
			expect(result.current.paymentMethodId).toBe('none');
		});

		it('exposes paymentMethodOptional: false by default (Cobros/other callers unaffected)', async () => {
			const config = baseConfig();
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			expect(result.current.paymentMethodOptional).toBe(false);
			expect(result.current.paymentMethodId).toBe('');
		});

		it('submits with payment_method_id null when "none" is left selected, without a validation error', async () => {
			const config = baseConfig({ hideParty: true, paymentMethodOptional: true });
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			act(() => {
				result.current.handleAdd();
				result.current.setAmount('1000');
			});
			await act(async () => result.current.handleSubmit(fakeEvent()));

			expect(config.createEntry).toHaveBeenCalledWith(
				expect.objectContaining({ payment_method_id: null })
			);
			expect(result.current.errors.paymentMethodId).toBeFalsy();
		});

		it('submits with the chosen numeric payment_method_id (never NaN) when a real method is picked', async () => {
			const config = baseConfig({ hideParty: true, paymentMethodOptional: true });
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			act(() => {
				result.current.handleAdd();
				result.current.setAmount('1000');
				result.current.setPaymentMethodId('2');
			});
			await act(async () => result.current.handleSubmit(fakeEvent()));

			expect(config.createEntry).toHaveBeenCalledWith(
				expect.objectContaining({ payment_method_id: 2 })
			);
		});

		it('handleEdit defaults paymentMethodId to "none" (not "") when the entry has no payment method', async () => {
			const config = baseConfig({ hideParty: true, paymentMethodOptional: true });
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));
			const target = entry({ id: 5, payment_method_id: null, payment_method_name: null });

			act(() => result.current.handleEdit(target));

			expect(result.current.paymentMethodId).toBe('none');
		});

		it('handleEdit prefills a real paymentMethodId when the entry has one', async () => {
			const config = baseConfig({ hideParty: true, paymentMethodOptional: true });
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));
			const target = entry({ id: 5, payment_method_id: 2 });

			act(() => result.current.handleEdit(target));

			expect(result.current.paymentMethodId).toBe('2');
		});

		it('resetForm (via handleAdd) goes back to "none" after a real method was previously chosen', async () => {
			const config = baseConfig({ hideParty: true, paymentMethodOptional: true });
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			act(() => {
				result.current.handleAdd();
				result.current.setPaymentMethodId('2');
			});
			expect(result.current.paymentMethodId).toBe('2');

			act(() => result.current.handleAdd());

			expect(result.current.paymentMethodId).toBe('none');
		});
	});

	describe('attachments (Pagos only; gated by config.attachmentsKind)', () => {
		function fakeEvent() {
			return { preventDefault: jest.fn() } as unknown as FormEvent;
		}

		function stagedFile(fileName: string): StagedFile {
			return { id: fileName, file: new File(['x'], fileName), fileName };
		}

		function setupCreate(
			configOverrides: Partial<Parameters<typeof useCollectionPaymentTab>[0]> = {}
		) {
			return baseConfig({
				hideParty: true,
				attachmentsKind: 'payment',
				createEntry: jest.fn().mockResolvedValue({ data: { id: 77 }, error: null }),
				labels: {
					entityLabel: 'pago',
					loadError: 'No se pudieron cargar los pagos.',
					saveError: 'No se pudo guardar el pago.',
					deleteError: 'No se pudo eliminar el pago.',
					createdToast: 'Pago creado',
					updatedToast: 'Pago actualizado',
					deletedToast: 'Pago eliminado',
				},
				...configOverrides,
			});
		}

		it('uploads each staged file to the created id, with kind "payment"', async () => {
			const config = setupCreate();
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));
			const files = [stagedFile('a.pdf'), stagedFile('b.pdf')];

			act(() => {
				result.current.handleAdd();
				result.current.setStagedFiles(files);
				result.current.setPaymentMethodId('2');
				result.current.setAmount('1000');
			});
			await act(async () => result.current.handleSubmit(fakeEvent()));

			expect(uploadFilePayment).toHaveBeenCalledTimes(2);
			expect(uploadFilePayment).toHaveBeenCalledWith(77, files[0].file, null, 'a.pdf');
			expect(uploadFilePayment).toHaveBeenCalledWith(77, files[1].file, null, 'b.pdf');
			expect(result.current.stagedFiles).toEqual([]);
			expect(mockToast).toHaveBeenCalledWith(
				expect.objectContaining({ title: 'Pago creado', description: expect.stringContaining('2') })
			);
		});

		it('uploads nothing and shows the plain toast when there are no staged files', async () => {
			const config = setupCreate();
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			act(() => {
				result.current.handleAdd();
				result.current.setPaymentMethodId('2');
				result.current.setAmount('1000');
			});
			await act(async () => result.current.handleSubmit(fakeEvent()));

			expect(uploadFilePayment).not.toHaveBeenCalled();
			expect(mockToast).toHaveBeenCalledWith({ title: 'Pago creado' });
		});

		it('shows a destructive toast counting failed uploads, without undoing the create', async () => {
			(uploadFilePayment as jest.Mock)
				.mockResolvedValueOnce({ data: { id: 1 }, error: null })
				.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
			const config = setupCreate();
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));
			const files = [stagedFile('a.pdf'), stagedFile('b.pdf')];

			act(() => {
				result.current.handleAdd();
				result.current.setStagedFiles(files);
				result.current.setPaymentMethodId('2');
				result.current.setAmount('1000');
			});
			await act(async () => result.current.handleSubmit(fakeEvent()));

			expect(mockToast).toHaveBeenCalledWith(
				expect.objectContaining({
					variant: 'destructive',
					title: 'Archivos adjuntos pendientes',
					description: expect.stringContaining('1'),
				})
			);
			expect(result.current.isFormOpen).toBe(false);
			expect(result.current.stagedFiles).toEqual([]);
		});

		it('uploads nothing and keeps the staged files when the create fails entirely', async () => {
			const config = setupCreate({
				createEntry: jest.fn().mockResolvedValue({ error: { message: 'boom' } }),
			});
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));
			const files = [stagedFile('a.pdf')];

			act(() => {
				result.current.handleAdd();
				result.current.setStagedFiles(files);
				result.current.setPaymentMethodId('2');
				result.current.setAmount('1000');
			});
			await act(async () => result.current.handleSubmit(fakeEvent()));

			expect(uploadFilePayment).not.toHaveBeenCalled();
			expect(result.current.isFormOpen).toBe(true);
			expect(result.current.stagedFiles).toEqual(files);
		});

		it('never stages or uploads when attachmentsKind is not set (Cobros), even if files are staged', async () => {
			const config = baseConfig({
				createEntry: jest.fn().mockResolvedValue({ data: { id: 77 }, error: null }),
			});
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			act(() => {
				result.current.handleAdd();
				result.current.setStagedFiles([stagedFile('a.pdf')]);
				result.current.setPartyId('3');
				result.current.setPaymentMethodId('2');
				result.current.setAmount('1000');
			});
			await act(async () => result.current.handleSubmit(fakeEvent()));

			expect(uploadFilePayment).not.toHaveBeenCalled();
			expect(mockToast).toHaveBeenCalledWith({ title: 'Cobro creado' });
		});

		it('does not touch staged files on an edit submit', async () => {
			const config = setupCreate();
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));
			const target = entry({ id: 5 });

			act(() => {
				result.current.handleEdit(target);
				result.current.setStagedFiles([stagedFile('a.pdf')]);
			});
			await act(async () => result.current.handleSubmit(fakeEvent()));

			expect(uploadFilePayment).not.toHaveBeenCalled();
			expect(config.updateEntry).toHaveBeenCalled();
			expect(mockToast).toHaveBeenCalledWith({ title: 'Pago actualizado' });
		});

		it('clears staged files when handleEdit is called', async () => {
			const config = setupCreate();
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			act(() => {
				result.current.handleAdd();
				result.current.setStagedFiles([stagedFile('a.pdf')]);
			});
			expect(result.current.stagedFiles).toHaveLength(1);

			act(() => result.current.handleEdit(entry({ id: 5 })));

			expect(result.current.stagedFiles).toEqual([]);
		});

		it('clears staged files when the dialog is cancelled/closed', async () => {
			const config = setupCreate();
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			act(() => {
				result.current.handleAdd();
				result.current.setStagedFiles([stagedFile('a.pdf')]);
			});
			expect(result.current.stagedFiles).toHaveLength(1);

			act(() => result.current.handleFormOpenChange(false));

			expect(result.current.stagedFiles).toEqual([]);
		});

		it('creating without an id while files are staged shows an error, uploads nothing, and keeps the staged files', async () => {
			const config = setupCreate({
				createEntry: jest.fn().mockResolvedValue({ data: {}, error: null }),
			});
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));
			const files = [stagedFile('a.pdf')];

			act(() => {
				result.current.handleAdd();
				result.current.setStagedFiles(files);
				result.current.setPaymentMethodId('2');
				result.current.setAmount('1000');
			});
			await act(async () => result.current.handleSubmit(fakeEvent()));

			expect(uploadFilePayment).not.toHaveBeenCalled();
			expect(result.current.isFormOpen).toBe(true);
			expect(result.current.stagedFiles).toEqual(files);
			expect(mockToast).toHaveBeenCalledWith(
				expect.objectContaining({ title: 'Error', variant: 'destructive' })
			);
			expect(mockToast).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'Pago creado' }));
		});

		it('creating without an id but with no staged files still succeeds as a plain create (no attachments to lose)', async () => {
			const config = setupCreate({
				createEntry: jest.fn().mockResolvedValue({ data: {}, error: null }),
			});
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			act(() => {
				result.current.handleAdd();
				result.current.setPaymentMethodId('2');
				result.current.setAmount('1000');
			});
			await act(async () => result.current.handleSubmit(fakeEvent()));

			expect(uploadFilePayment).not.toHaveBeenCalled();
			expect(result.current.isFormOpen).toBe(false);
			expect(mockToast).toHaveBeenCalledWith({ title: 'Pago creado' });
		});
	});

	describe('close/reopen race while a submit is in flight', () => {
		function fakeEvent() {
			return { preventDefault: jest.fn() } as unknown as FormEvent;
		}

		function stagedFile(fileName: string): StagedFile {
			return { id: fileName, file: new File(['x'], fileName), fileName };
		}

		function setupCreate(
			configOverrides: Partial<Parameters<typeof useCollectionPaymentTab>[0]> = {}
		) {
			return baseConfig({
				hideParty: true,
				attachmentsKind: 'payment',
				labels: {
					entityLabel: 'pago',
					loadError: 'No se pudieron cargar los pagos.',
					saveError: 'No se pudo guardar el pago.',
					deleteError: 'No se pudo eliminar el pago.',
					createdToast: 'Pago creado',
					updatedToast: 'Pago actualizado',
					deletedToast: 'Pago eliminado',
				},
				...configOverrides,
			});
		}

		it('ignores handleFormOpenChange(false) while saving, then allows it once the submit settles', async () => {
			let releaseCreate!: (value: any) => void;
			const config = setupCreate({
				createEntry: jest
					.fn()
					.mockImplementation(() => new Promise((resolve) => (releaseCreate = resolve))),
			});
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			act(() => {
				result.current.handleAdd();
				result.current.setStagedFiles([stagedFile('a.pdf')]);
				result.current.setPaymentMethodId('2');
				result.current.setAmount('1000');
			});

			let submitPromise: Promise<void>;
			act(() => {
				submitPromise = result.current.handleSubmit(fakeEvent());
			});
			await waitFor(() => expect(result.current.saving).toBe(true));

			// Escape/overlay-click while saving must not close the dialog or drop the staged files.
			act(() => result.current.handleFormOpenChange(false));
			expect(result.current.isFormOpen).toBe(true);
			expect(result.current.stagedFiles).toHaveLength(1);

			await act(async () => {
				releaseCreate({ data: { id: 77 }, error: null });
				await submitPromise;
			});

			expect(result.current.saving).toBe(false);
			// Once settled, a real close request goes through again.
			act(() => result.current.handleFormOpenChange(false));
			expect(result.current.isFormOpen).toBe(false);
		});

		it('a stale create completion after a reset/reopen mid-flight does not wipe the new session or close the dialog', async () => {
			let releaseCreate!: (value: any) => void;
			const config = setupCreate({
				createEntry: jest
					.fn()
					.mockImplementation(() => new Promise((resolve) => (releaseCreate = resolve))),
			});
			const { result } = renderHook(() => useCollectionPaymentTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			const staleFile = stagedFile('stale.pdf');
			const freshFile = stagedFile('fresh.pdf');

			act(() => {
				result.current.handleAdd();
				result.current.setStagedFiles([staleFile]);
				result.current.setPaymentMethodId('2');
				result.current.setAmount('1000');
			});

			let submitPromise: Promise<void>;
			act(() => {
				submitPromise = result.current.handleSubmit(fakeEvent());
			});
			await waitFor(() => expect(result.current.saving).toBe(true));

			// Defensive: the session changes (new add) while the earlier submit is still pending.
			act(() => {
				result.current.handleAdd();
				result.current.setStagedFiles([freshFile]);
			});

			await act(async () => {
				releaseCreate({ data: { id: 77 }, error: null });
				await submitPromise;
			});

			expect(uploadFilePayment).toHaveBeenCalledWith(77, staleFile.file, null, 'stale.pdf');
			expect(result.current.isFormOpen).toBe(true);
			expect(result.current.stagedFiles).toEqual([freshFile]);
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

			expect(config.deleteEntry).toHaveBeenCalledWith(5, target);
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
