import type { FormEvent } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import {
	IncomeExpenseEntry,
	useIncomeExpenseTab,
} from '@/hooks/income-expense/use-income-expense-tab';
import { listCategories } from '@/lib/categories/categories';
import { listVoucherTypes } from '@/lib/voucher-types/voucher-types';
import { listWorks } from '@/lib/works/works';
import { listPaymentMethods } from '@/lib/payment-methods/payment-methods';
import { listBankAccounts } from '@/lib/cash-flow/cash-flow';
import { getLocalDate } from '@/utils/format-date';
import { uploadFileExpense } from '@/lib/expenses/files-expenses';
import type { StagedFile } from '@/components/business/shared/attachments/file-attachments';

jest.mock('@/lib/categories/categories', () => ({
	listCategories: jest.fn(),
}));
jest.mock('@/lib/voucher-types/voucher-types', () => ({
	listVoucherTypes: jest.fn(),
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
jest.mock('@/lib/expenses/files-expenses', () => ({
	uploadFileExpense: jest.fn(),
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
		payment_method_id: null,
		payment_method_name: null,
		bank_account_id: null,
		bank_account_name: null,
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
		(listPaymentMethods as jest.Mock).mockResolvedValue({ data: [], error: null });
		(listBankAccounts as jest.Mock).mockResolvedValue({ data: [], error: null });
		(uploadFileExpense as jest.Mock).mockResolvedValue({ data: { id: 1 }, error: null });
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

			act(() => {
				result.current.handleAdd();
				result.current.setDate('');
			});
			await act(async () => result.current.handleSubmit(fakeEvent()));

			expect(config.createEntry).not.toHaveBeenCalled();
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
				result.current.setPaymentMethodId('2');
			});
			await act(async () => result.current.handleSubmit(fakeEvent()));

			expect(config.createEntry).toHaveBeenCalledWith(
				expect.objectContaining({
					net_amount: 1000.13,
					iva_amount: 210.03,
					total_amount: 1210.16,
					payment_method_id: 2,
				})
			);
			expect(mockToast).toHaveBeenCalledWith({ title: 'Ingreso creado' });
		});

		it('creates a new entry without selecting a payment method, sending null', async () => {
			const config = baseConfig();
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

			expect(config.createEntry).toHaveBeenCalledWith(
				expect.objectContaining({ payment_method_id: null })
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
				result.current.setPaymentMethodId('2');
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
			result.current.setVoucherTypeId('1');
			result.current.setPartyId('3');
			result.current.setCategoryId('10');
			result.current.setNetAmount('1000');
		}

		it('calls createEntry only once when handleSubmit fires twice in the same tick', async () => {
			const config = baseConfig();
			const { result } = renderHook(() => useIncomeExpenseTab(config));
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
			const { result } = renderHook(() => useIncomeExpenseTab(config));
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
			const { result } = renderHook(() => useIncomeExpenseTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			act(() => {
				result.current.handleAdd();
				result.current.setDate('');
			});
			await act(async () => result.current.handleSubmit(fakeEvent()));
			expect(config.createEntry).not.toHaveBeenCalled();

			act(() => fillValidForm(result));
			await act(async () => result.current.handleSubmit(fakeEvent()));

			expect(config.createEntry).toHaveBeenCalledTimes(1);
		});
	});

	describe('attachments (Gastos only; gated by config.attachmentsKind)', () => {
		function fakeEvent() {
			return { preventDefault: jest.fn() } as unknown as FormEvent;
		}

		function stagedFile(fileName: string): StagedFile {
			return { id: fileName, file: new File(['x'], fileName), fileName };
		}

		function setupCreate(configOverrides: Partial<Parameters<typeof useIncomeExpenseTab>[0]> = {}) {
			const config = baseConfig({
				attachmentsKind: 'expense',
				createEntry: jest.fn().mockResolvedValue({ data: { id: 77 }, error: null }),
				labels: {
					entityLabel: 'gasto',
					loadError: 'No se pudieron cargar los gastos.',
					saveError: 'No se pudo guardar el gasto.',
					deleteError: 'No se pudo eliminar el gasto.',
					createdToast: 'Gasto creado',
					updatedToast: 'Gasto actualizado',
					deletedToast: 'Gasto eliminado',
				},
				...configOverrides,
			});
			return config;
		}

		it('uploads each staged file to the created id, with kind "expense"', async () => {
			const config = setupCreate();
			const { result } = renderHook(() => useIncomeExpenseTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));
			const files = [stagedFile('a.pdf'), stagedFile('b.pdf')];

			act(() => {
				result.current.handleAdd();
				result.current.setStagedFiles(files);
				result.current.setPartyId('3');
				result.current.setCategoryId('10');
				result.current.setNetAmount('1000');
			});
			await act(async () => result.current.handleSubmit(fakeEvent()));

			expect(uploadFileExpense).toHaveBeenCalledTimes(2);
			expect(uploadFileExpense).toHaveBeenCalledWith(77, files[0].file, null, 'a.pdf');
			expect(uploadFileExpense).toHaveBeenCalledWith(77, files[1].file, null, 'b.pdf');
			expect(result.current.stagedFiles).toEqual([]);
			expect(mockToast).toHaveBeenCalledWith(
				expect.objectContaining({
					title: 'Gasto creado',
					description: expect.stringContaining('2'),
				})
			);
		});

		it('uploads nothing and shows the plain toast when there are no staged files', async () => {
			const config = setupCreate();
			const { result } = renderHook(() => useIncomeExpenseTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			act(() => {
				result.current.handleAdd();
				result.current.setPartyId('3');
				result.current.setCategoryId('10');
				result.current.setNetAmount('1000');
			});
			await act(async () => result.current.handleSubmit(fakeEvent()));

			expect(uploadFileExpense).not.toHaveBeenCalled();
			expect(mockToast).toHaveBeenCalledWith({ title: 'Gasto creado' });
		});

		it('shows a destructive toast counting failed uploads, without undoing the create', async () => {
			(uploadFileExpense as jest.Mock)
				.mockResolvedValueOnce({ data: { id: 1 }, error: null })
				.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
			const config = setupCreate();
			const { result } = renderHook(() => useIncomeExpenseTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));
			const files = [stagedFile('a.pdf'), stagedFile('b.pdf')];

			act(() => {
				result.current.handleAdd();
				result.current.setStagedFiles(files);
				result.current.setPartyId('3');
				result.current.setCategoryId('10');
				result.current.setNetAmount('1000');
			});
			await act(async () => result.current.handleSubmit(fakeEvent()));

			expect(mockToast).toHaveBeenCalledWith(
				expect.objectContaining({
					variant: 'destructive',
					title: 'Archivos adjuntos pendientes',
					description: expect.stringContaining('1'),
				})
			);
			// The row save is not undone: the dialog closes and the list refetches like any other success.
			expect(result.current.isFormOpen).toBe(false);
			expect(result.current.stagedFiles).toEqual([]);
		});

		it('counts a throwing upload as a failed file, never as a failed create', async () => {
			(uploadFileExpense as jest.Mock).mockRejectedValueOnce(new Error('network'));
			const config = setupCreate();
			const { result } = renderHook(() => useIncomeExpenseTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			act(() => {
				result.current.handleAdd();
				result.current.setStagedFiles([stagedFile('a.pdf')]);
				result.current.setPartyId('3');
				result.current.setCategoryId('10');
				result.current.setNetAmount('1000');
			});
			await act(async () => result.current.handleSubmit(fakeEvent()));

			expect(mockToast).toHaveBeenCalledWith(
				expect.objectContaining({ title: 'Archivos adjuntos pendientes' })
			);
			expect(mockToast).not.toHaveBeenCalledWith(
				expect.objectContaining({ title: 'Error', description: 'No se pudo guardar el gasto.' })
			);
		});

		it('uploads nothing and keeps the staged files when the create fails entirely', async () => {
			const config = setupCreate({
				createEntry: jest.fn().mockResolvedValue({ error: { message: 'boom' } }),
			});
			const { result } = renderHook(() => useIncomeExpenseTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));
			const files = [stagedFile('a.pdf')];

			act(() => {
				result.current.handleAdd();
				result.current.setStagedFiles(files);
				result.current.setPartyId('3');
				result.current.setCategoryId('10');
				result.current.setNetAmount('1000');
			});
			await act(async () => result.current.handleSubmit(fakeEvent()));

			expect(uploadFileExpense).not.toHaveBeenCalled();
			expect(result.current.isFormOpen).toBe(true);
			expect(result.current.stagedFiles).toEqual(files);
		});

		it('never stages or uploads when attachmentsKind is not set (Ingresos), even if files are staged', async () => {
			const config = baseConfig({
				createEntry: jest.fn().mockResolvedValue({ data: { id: 77 }, error: null }),
			});
			const { result } = renderHook(() => useIncomeExpenseTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			act(() => {
				result.current.handleAdd();
				result.current.setStagedFiles([stagedFile('a.pdf')]);
				result.current.setPartyId('3');
				result.current.setCategoryId('10');
				result.current.setNetAmount('1000');
			});
			await act(async () => result.current.handleSubmit(fakeEvent()));

			expect(uploadFileExpense).not.toHaveBeenCalled();
			expect(mockToast).toHaveBeenCalledWith({ title: 'Ingreso creado' });
		});

		it('does not touch staged files on an edit submit', async () => {
			const config = setupCreate();
			const { result } = renderHook(() => useIncomeExpenseTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));
			const target = entry({ id: 5 });

			act(() => {
				result.current.handleEdit(target);
				result.current.setStagedFiles([stagedFile('a.pdf')]);
			});
			await act(async () => result.current.handleSubmit(fakeEvent()));

			expect(uploadFileExpense).not.toHaveBeenCalled();
			expect(config.updateEntry).toHaveBeenCalled();
			expect(mockToast).toHaveBeenCalledWith({ title: 'Gasto actualizado' });
		});

		it('clears staged files when handleEdit is called', async () => {
			const config = setupCreate();
			const { result } = renderHook(() => useIncomeExpenseTab(config));
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
			const { result } = renderHook(() => useIncomeExpenseTab(config));
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
			const { result } = renderHook(() => useIncomeExpenseTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));
			const files = [stagedFile('a.pdf')];

			act(() => {
				result.current.handleAdd();
				result.current.setStagedFiles(files);
				result.current.setPartyId('3');
				result.current.setCategoryId('10');
				result.current.setNetAmount('1000');
			});
			await act(async () => result.current.handleSubmit(fakeEvent()));

			expect(uploadFileExpense).not.toHaveBeenCalled();
			expect(result.current.isFormOpen).toBe(true);
			expect(result.current.stagedFiles).toEqual(files);
			expect(mockToast).toHaveBeenCalledWith(
				expect.objectContaining({ title: 'Error', variant: 'destructive' })
			);
			expect(mockToast).not.toHaveBeenCalledWith(
				expect.objectContaining({ title: 'Gasto creado' })
			);
		});

		it('creating without an id but with no staged files still succeeds as a plain create (no attachments to lose)', async () => {
			const config = setupCreate({
				createEntry: jest.fn().mockResolvedValue({ data: {}, error: null }),
			});
			const { result } = renderHook(() => useIncomeExpenseTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			act(() => {
				result.current.handleAdd();
				result.current.setPartyId('3');
				result.current.setCategoryId('10');
				result.current.setNetAmount('1000');
			});
			await act(async () => result.current.handleSubmit(fakeEvent()));

			expect(uploadFileExpense).not.toHaveBeenCalled();
			expect(result.current.isFormOpen).toBe(false);
			expect(mockToast).toHaveBeenCalledWith({ title: 'Gasto creado' });
		});
	});

	describe('close/reopen race while a submit is in flight', () => {
		function fakeEvent() {
			return { preventDefault: jest.fn() } as unknown as FormEvent;
		}

		function stagedFile(fileName: string): StagedFile {
			return { id: fileName, file: new File(['x'], fileName), fileName };
		}

		function setupCreate(configOverrides: Partial<Parameters<typeof useIncomeExpenseTab>[0]> = {}) {
			return baseConfig({
				attachmentsKind: 'expense',
				labels: {
					entityLabel: 'gasto',
					loadError: 'No se pudieron cargar los gastos.',
					saveError: 'No se pudo guardar el gasto.',
					deleteError: 'No se pudo eliminar el gasto.',
					createdToast: 'Gasto creado',
					updatedToast: 'Gasto actualizado',
					deletedToast: 'Gasto eliminado',
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
			const { result } = renderHook(() => useIncomeExpenseTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			act(() => {
				result.current.handleAdd();
				result.current.setStagedFiles([stagedFile('a.pdf')]);
				result.current.setPartyId('3');
				result.current.setCategoryId('10');
				result.current.setNetAmount('1000');
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
			const { result } = renderHook(() => useIncomeExpenseTab(config));
			await waitFor(() => expect(result.current.loadingList).toBe(false));

			const staleFile = stagedFile('stale.pdf');
			const freshFile = stagedFile('fresh.pdf');

			act(() => {
				result.current.handleAdd();
				result.current.setStagedFiles([staleFile]);
				result.current.setPartyId('3');
				result.current.setCategoryId('10');
				result.current.setNetAmount('1000');
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

			expect(uploadFileExpense).toHaveBeenCalledWith(77, staleFile.file, null, 'stale.pdf');
			expect(result.current.isFormOpen).toBe(true);
			expect(result.current.stagedFiles).toEqual([freshFile]);
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
