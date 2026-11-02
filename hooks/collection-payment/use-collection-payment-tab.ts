'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CashFlowCategory, CategoryKind, listCategories } from '@/lib/categories/categories';
import { Work, listWorks } from '@/lib/works/works';
import { PaymentMethod, listPaymentMethods } from '@/lib/payment-methods/payment-methods';
import { BankAccount, listBankAccounts } from '@/lib/cash-flow/cash-flow';
import { PartyOption } from '@/hooks/income-expense/use-income-expense-tab';
import { useToast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';
import {
	formatCurrencyWithoutSymbol,
	parseArsToNumber,
	roundToTwoDecimals,
} from '@/utils/formats-money';
import { getLocalDate } from '@/utils/format-date';
import { FUTURE_YEARS_AHEAD, PAST_YEARS_BACK } from '@/constants/cashflow/fixed-expenses';
import type { StagedFile } from '@/components/business/shared/attachments/file-attachments';
import { uploadFilePayment } from '@/lib/payments/files-payments';
import { pluralArchivos, adjuntaron, noPudieronAdjuntar } from '@/helpers/attachments/attachments';

export type CollectionPaymentEntry = {
	id: number;
	date: string;
	receipt_number: string | null;
	work_id: number | null;
	work_name: string | null;
	party_id: number | null;
	party_name: string | null;
	category_id: number | null;
	category_name: string | null;
	description: string | null;
	amount: number;
	payment_method_id: number | null;
	payment_method_name: string | null;
	bank_account_id: number | null;
	bank_account_name: string | null;
	source?: 'general' | 'supplier' | 'client';
	purchase_supplier_id?: number | null;
	balance_id?: number | null;
	created_at?: string;
	expense_id?: number | null;
	expense_label?: string | null;
};

export type EntrySavePayload = {
	date: string;
	receipt_number: string | null;
	work_id: number | null;
	party_id: number | null;
	purchase_supplier_id?: number | null;
	balance_id?: number | null;
	category_id: number | null;
	description: string | null;
	amount: number;
	payment_method_id: number | null;
	payment_method_name: string | null;
	bank_account_id: number | null;
	expense_id?: number | null;
};

export type EntryPrefill = {
	amount?: number;
	work_id?: number | null;
	description?: string | null;
	payment_method_id?: number | null;
	bank_account_id?: number | null;
	receipt_number?: string | null;
	expense_id?: number | null;
	expense_label?: string | null;
};

export type LinkedEntityExclude = { purchaseId: number; amount: number };

export type CollectionPaymentFormErrors = Partial<
	Record<'date' | 'partyId' | 'purchaseId' | 'paymentMethodId' | 'amount', boolean>
>;

type UseCollectionPaymentTabConfig = {
	categoryKind: CategoryKind;
	listEntries: (year: number) => Promise<{ data: CollectionPaymentEntry[] | null; error: any }>;
	createEntry: (input: EntrySavePayload) => Promise<{ data?: { id: number } | null; error: any }>;
	attachmentsKind?: 'payment';
	updateEntry: (
		id: number,
		input: EntrySavePayload,
		entry: CollectionPaymentEntry
	) => Promise<{ error: any }>;
	deleteEntry: (id: number, entry: CollectionPaymentEntry) => Promise<{ error: any }>;
	listParties?: () => Promise<{ data: PartyOption[] | null; error: any }>;
	partyOptional?: boolean;
	paymentMethodOptional?: boolean;
	hideParty?: boolean;
	listExpenseOptions?: (year: number) => Promise<{ data: PartyOption[] | null; error: any }>;
	loadPurchases?: (
		partyId: number,
		exclude?: LinkedEntityExclude
	) => Promise<{ data: PartyOption[] | null; error: any }>;
	loadAccounts?: (
		partyId: number,
		exclude?: LinkedEntityExclude
	) => Promise<{ data: PartyOption[] | null; error: any }>;
	linkedLabel?: string;
	// Effective max is 2000 on the linked-entity route; otherwise this (default 300).
	descriptionMaxLength?: number;
	labels: {
		entityLabel: string;
		loadError: string;
		saveError: string;
		deleteError: string;
		createdToast: string;
		updatedToast: string;
		deletedToast: string;
	};
};

export function useCollectionPaymentTab(config: UseCollectionPaymentTabConfig) {
	const { toast } = useToast();

	const currentYear = Number(getLocalDate().slice(0, 4));
	const yearOptions = useMemo(
		() =>
			Array.from(
				{ length: FUTURE_YEARS_AHEAD + PAST_YEARS_BACK + 1 },
				(_, i) => currentYear + FUTURE_YEARS_AHEAD - i
			),
		[currentYear]
	);
	const [year, setYear] = useState(currentYear);

	const [entries, setEntries] = useState<CollectionPaymentEntry[]>([]);
	const [loadingList, setLoadingList] = useState(false);
	const entriesRequestIdRef = useRef(0);
	const formSessionRef = useRef(0);
	const submittingRef = useRef(false);

	const [categories, setCategories] = useState<CashFlowCategory[]>([]);
	const [works, setWorks] = useState<Work[]>([]);
	const [parties, setParties] = useState<PartyOption[]>([]);
	const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
	const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
	const [expenseOptions, setExpenseOptions] = useState<PartyOption[]>([]);
	const [expenseOptionsLoading, setExpenseOptionsLoading] = useState(false);
	const supportsExpenseLink = !!config.listExpenseOptions;
	// Options pinned by a prefill/edit (possibly outside the fetched year); kept for the hook's
	// lifetime so a fetch that resolves later never drops the currently selected expense.
	const pinnedExpenseOptionsRef = useRef<Map<number, PartyOption>>(new Map());
	const expenseOptionsRequestIdRef = useRef(0);

	const activeCategories = useMemo(() => categories.filter((c) => c.is_active), [categories]);
	const activePaymentMethods = useMemo(
		() => paymentMethods.filter((m) => m.is_active),
		[paymentMethods]
	);
	const activeBankAccounts = useMemo(() => bankAccounts.filter((b) => b.is_active), [bankAccounts]);

	const fetchEntries = async (targetYear: number) => {
		const requestId = ++entriesRequestIdRef.current;
		setLoadingList(true);
		try {
			const { data, error } = await config.listEntries(targetYear);
			if (error) throw error;
			if (requestId !== entriesRequestIdRef.current) return;
			setEntries(data ?? []);
		} catch (error) {
			if (requestId !== entriesRequestIdRef.current) return;
			toast({
				title: 'Error',
				description: translateError(error) || config.labels.loadError,
				variant: 'destructive',
			});
		} finally {
			if (requestId === entriesRequestIdRef.current) setLoadingList(false);
		}
	};

	const fetchCategories = async () => {
		const { data, error } = await listCategories(config.categoryKind);
		if (error) return;
		setCategories(data ?? []);
	};

	const fetchWorks = async () => {
		const { data, error } = await listWorks();
		if (error) return;
		setWorks(data ?? []);
	};

	const fetchParties = async () => {
		if (!config.listParties) return;
		const { data, error } = await config.listParties();
		if (error) return;
		setParties(data ?? []);
	};

	const fetchPaymentMethods = async () => {
		const { data, error } = await listPaymentMethods();
		if (error) return;
		setPaymentMethods(data ?? []);
	};

	// Fetches all accounts (not just active) so an edit can still show an account that was deactivated later.
	const fetchBankAccounts = async () => {
		const { data, error } = await listBankAccounts();
		if (error) return;
		setBankAccounts(data ?? []);
	};

	const fetchExpenseOptions = async (targetYear: number) => {
		if (!config.listExpenseOptions) return;
		const requestId = ++expenseOptionsRequestIdRef.current;
		setExpenseOptionsLoading(true);
		try {
			const { data, error } = await config.listExpenseOptions(targetYear);
			if (requestId !== expenseOptionsRequestIdRef.current) return;
			if (error) return;
			const fetched = data ?? [];
			// Merge, never replace: keep pinned (prefill/edit) options missing from this year's
			// fetch; the fetched label wins when the same id appears in both.
			const fetchedIds = new Set(fetched.map((o) => o.id));
			const stillPinned = Array.from(pinnedExpenseOptionsRef.current.values()).filter(
				(o) => !fetchedIds.has(o.id)
			);
			setExpenseOptions([...fetched, ...stillPinned]);
		} finally {
			if (requestId === expenseOptionsRequestIdRef.current) setExpenseOptionsLoading(false);
		}
	};

	useEffect(() => {
		void fetchCategories();
		void fetchWorks();
		void fetchParties();
		void fetchPaymentMethods();
		void fetchBankAccounts();
	}, []);

	useEffect(() => {
		void fetchEntries(year);
		void fetchExpenseOptions(year);
	}, [year]);

	// Filters (applied in-memory over the fetched list)
	const [dateFrom, setDateFrom] = useState('');
	const [dateTo, setDateTo] = useState('');
	const [filterWorkId, setFilterWorkId] = useState('');
	const [filterPartyId, setFilterPartyId] = useState('');
	const [filterCategoryId, setFilterCategoryId] = useState('');
	const [filterPaymentMethodId, setFilterPaymentMethodId] = useState('');
	const [search, setSearch] = useState('');
	const [filterDialogOpen, setFilterDialogOpen] = useState(false);

	const activeFilterCount = useMemo(() => {
		return [
			dateFrom,
			dateTo,
			filterWorkId,
			filterPartyId,
			filterCategoryId,
			filterPaymentMethodId,
		].filter(Boolean).length;
	}, [dateFrom, dateTo, filterWorkId, filterPartyId, filterCategoryId, filterPaymentMethodId]);

	const visibleEntries = useMemo(() => {
		return entries.filter((entry) => {
			if (dateFrom && entry.date < dateFrom) return false;
			if (dateTo && entry.date > dateTo) return false;
			if (filterWorkId && String(entry.work_id ?? '') !== filterWorkId) return false;
			if (filterPartyId && String(entry.party_id ?? '') !== filterPartyId) return false;
			if (filterCategoryId && String(entry.category_id ?? '') !== filterCategoryId) return false;
			if (filterPaymentMethodId && String(entry.payment_method_id ?? '') !== filterPaymentMethodId)
				return false;
			if (search) {
				const term = search.trim().toLowerCase();
				const haystack =
					`${entry.receipt_number ?? ''} ${entry.description ?? ''} ${entry.party_name ?? ''}`.toLowerCase();
				if (term && !haystack.includes(term)) return false;
			}
			return true;
		});
	}, [
		entries,
		dateFrom,
		dateTo,
		filterWorkId,
		filterPartyId,
		filterCategoryId,
		filterPaymentMethodId,
		search,
	]);

	const summary = useMemo(() => {
		const count = visibleEntries.length;
		const total = visibleEntries.reduce((sum, e) => sum + Number(e.amount), 0);
		const max = visibleEntries.reduce((m, e) => Math.max(m, Number(e.amount)), 0);
		return { count, total, average: count > 0 ? total / count : 0, max };
	}, [visibleEntries]);

	// Clears only the modal filters, not search (mirrors balances-tab's resetFilters leaving searchTerm untouched).
	const clearFilters = () => {
		setDateFrom('');
		setDateTo('');
		setFilterWorkId('');
		setFilterPartyId('');
		setFilterCategoryId('');
		setFilterPaymentMethodId('');
	};

	// Form dialog state
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [editingEntry, setEditingEntry] = useState<CollectionPaymentEntry | null>(null);
	const [date, setDate] = useState(getLocalDate());
	const [receiptNumber, setReceiptNumber] = useState('');
	const [workId, setWorkId] = useState('');
	const [partyId, setPartyId] = useState('');
	const [categoryId, setCategoryId] = useState('');
	const [description, setDescription] = useState('');
	const [amount, setAmount] = useState('');
	const paymentMethodOptional = !!config.paymentMethodOptional;
	// 'none' (not ''): when optional, "Sin medio" is always a real SelectItem, same pattern as
	// use-income-expense-tab.ts. Required (Cobros) keeps '' so Radix shows its native placeholder.
	const [paymentMethodId, setPaymentMethodId] = useState(paymentMethodOptional ? 'none' : '');
	const [bankAccountId, setBankAccountId] = useState('none');
	const [expenseId, setExpenseId] = useState('');
	const [saving, setSaving] = useState(false);
	const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
	const partyOptional = !!config.partyOptional;

	const ensureExpenseOption = (id: number, label: string) => {
		pinnedExpenseOptionsRef.current.set(id, { id, name: label });
		setExpenseOptions((prev) =>
			prev.some((o) => o.id === id) ? prev : [...prev, { id, name: label }]
		);
	};
	const [errors, setErrors] = useState<CollectionPaymentFormErrors>({});
	const clearError = (field: keyof CollectionPaymentFormErrors) => {
		setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
	};

	// Linked-entity picker options for the currently selected party (purchases for Payments, balances for Collections).
	const [purchaseId, setPurchaseId] = useState('');
	const [purchases, setPurchases] = useState<PartyOption[]>([]);
	const [purchasesLoading, setPurchasesLoading] = useState(false);
	// Avoids clearing a just-prefilled purchaseId (handleEdit) when its effect reacts to the partyId change.
	const skipPurchaseResetRef = useRef(false);

	const loadLinkedOptions = config.loadPurchases ?? config.loadAccounts;

	useEffect(() => {
		if (!partyOptional || !loadLinkedOptions) return;
		if (!partyId) {
			setPurchases([]);
			if (!skipPurchaseResetRef.current) setPurchaseId('');
			skipPurchaseResetRef.current = false;
			return;
		}
		if (!skipPurchaseResetRef.current) setPurchaseId('');
		skipPurchaseResetRef.current = false;
		const targetPartyId = Number(partyId);
		// Only Payments entries ever carry purchase_supplier_id; Collections editingEntry never does.
		const exclude: LinkedEntityExclude | undefined = editingEntry?.purchase_supplier_id
			? { purchaseId: editingEntry.purchase_supplier_id, amount: editingEntry.amount }
			: undefined;
		setPurchasesLoading(true);
		void loadLinkedOptions(targetPartyId, exclude)
			.then(({ data, error }) => {
				if (error) {
					setPurchases([]);
					return;
				}
				setPurchases(data ?? []);
			})
			.finally(() => setPurchasesLoading(false));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [partyId]);

	// Amount is capped to 2 decimals (mirrors Neto in incomes/expenses).
	const parsedAmount = roundToTwoDecimals(parseArsToNumber(amount));

	// Single source of truth for the description cap: the linked-entity route (balance_transactions
	// notes) always allows 2000; otherwise it's config.descriptionMaxLength (default 300). Used both
	// for the value returned to the dialog and for the slice on submit, so they can never diverge.
	const getDescriptionMaxLength = (isLinkedEntityRoute: boolean) =>
		isLinkedEntityRoute ? 2000 : (config.descriptionMaxLength ?? 300);

	const resetForm = () => {
		setDate(getLocalDate());
		setReceiptNumber('');
		setWorkId('');
		setPartyId('');
		setPurchaseId('');
		setPurchases([]);
		setCategoryId('');
		setDescription('');
		setAmount('');
		setPaymentMethodId(paymentMethodOptional ? 'none' : '');
		setBankAccountId('none');
		setExpenseId('');
		setErrors({});
		setStagedFiles([]);
	};

	const handleAdd = (prefill?: EntryPrefill) => {
		formSessionRef.current += 1;
		setEditingEntry(null);
		resetForm();
		if (prefill) {
			if (prefill.amount !== undefined) setAmount(formatCurrencyWithoutSymbol(prefill.amount));
			if (prefill.work_id !== undefined) setWorkId(prefill.work_id ? String(prefill.work_id) : '');
			if (prefill.description !== undefined) setDescription(prefill.description ?? '');
			if (prefill.payment_method_id !== undefined)
				setPaymentMethodId(
					prefill.payment_method_id
						? String(prefill.payment_method_id)
						: paymentMethodOptional
							? 'none'
							: ''
				);
			if (prefill.bank_account_id !== undefined)
				setBankAccountId(prefill.bank_account_id ? String(prefill.bank_account_id) : 'none');
			if (prefill.receipt_number !== undefined) setReceiptNumber(prefill.receipt_number ?? '');
			if (prefill.expense_id) {
				setExpenseId(String(prefill.expense_id));
				if (prefill.expense_label) ensureExpenseOption(prefill.expense_id, prefill.expense_label);
			}
		}
		setIsFormOpen(true);
	};

	const handleEdit = (entry: CollectionPaymentEntry) => {
		formSessionRef.current += 1;
		setEditingEntry(entry);
		setDate(entry.date);
		setReceiptNumber(entry.receipt_number ?? '');
		setWorkId(entry.work_id ? String(entry.work_id) : '');
		skipPurchaseResetRef.current = true;
		setPartyId(entry.party_id ? String(entry.party_id) : '');
		setPurchaseId(
			entry.purchase_supplier_id
				? String(entry.purchase_supplier_id)
				: entry.balance_id
					? String(entry.balance_id)
					: ''
		);
		setCategoryId(entry.category_id ? String(entry.category_id) : '');
		setDescription(entry.description ?? '');
		setAmount(formatCurrencyWithoutSymbol(entry.amount));
		setPaymentMethodId(
			entry.payment_method_id
				? String(entry.payment_method_id)
				: paymentMethodOptional
					? 'none'
					: ''
		);
		setBankAccountId(entry.bank_account_id ? String(entry.bank_account_id) : 'none');
		setExpenseId(entry.expense_id ? String(entry.expense_id) : '');
		if (entry.expense_id && entry.expense_label)
			ensureExpenseOption(entry.expense_id, entry.expense_label);
		setErrors({});
		setStagedFiles([]);
		setIsFormOpen(true);
	};

	const handleFormOpenChange = (open: boolean) => {
		if (!open && saving) return;
		setIsFormOpen(open);
		if (!open) {
			formSessionRef.current += 1;
			setEditingEntry(null);
			setStagedFiles([]);
		}
	};

	const uploadStagedFiles = async (staged: StagedFile[], entityId: number): Promise<number> => {
		let failed = 0;
		for (const entry of staged) {
			try {
				const { error } = await uploadFilePayment(entityId, entry.file, null, entry.fileName);
				if (error) failed += 1;
			} catch {
				failed += 1;
			}
		}
		return failed;
	};

	// re-fetch so edits made in CategoriesConfig show up immediately
	useEffect(() => {
		if (!isFormOpen) return;
		void fetchCategories();
		void fetchPaymentMethods();
		void fetchBankAccounts();
	}, [isFormOpen]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (submittingRef.current) return;
		submittingRef.current = true;
		const nextErrors: CollectionPaymentFormErrors = {};
		if (!date) nextErrors.date = true;
		if (!paymentMethodOptional && !paymentMethodId) nextErrors.paymentMethodId = true;
		if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) nextErrors.amount = true;
		if (!config.hideParty && !partyOptional && !partyId) nextErrors.partyId = true;
		if (partyOptional && partyId && !purchaseId) nextErrors.purchaseId = true;
		if (Object.keys(nextErrors).length > 0) {
			setErrors(nextErrors);
			toast({ title: 'Completá los campos obligatorios', variant: 'destructive' });
			submittingRef.current = false;
			return;
		}
		setErrors({});
		const submissionSession = formSessionRef.current;
		const stagedAtSubmit = stagedFiles;
		setSaving(true);
		try {
			const isLinkedEntityRoute = partyOptional && !!partyId;
			const trimmedDescription = description.trim();
			const normalizedDescription = trimmedDescription.slice(
				0,
				getDescriptionMaxLength(isLinkedEntityRoute)
			);
			const payload: EntrySavePayload = {
				date,
				receipt_number: receiptNumber.trim() || null,
				work_id: workId ? Number(workId) : null,
				party_id: partyId ? Number(partyId) : null,
				purchase_supplier_id: partyOptional && partyId ? Number(purchaseId) : null,
				balance_id: partyOptional && partyId ? Number(purchaseId) : null,
				category_id: categoryId ? Number(categoryId) : null,
				description: normalizedDescription || null,
				amount: parsedAmount,
				// 'none'/'' (optional, cleared) must resolve to null, never Number('none') === NaN.
				payment_method_id: paymentMethodOptional
					? paymentMethodId && paymentMethodId !== 'none'
						? Number(paymentMethodId)
						: null
					: Number(paymentMethodId),
				payment_method_name:
					paymentMethods.find((m) => String(m.id) === paymentMethodId)?.name ?? null,
				bank_account_id: bankAccountId === 'none' ? null : Number(bankAccountId),
				expense_id: expenseId ? Number(expenseId) : null,
			};
			if (editingEntry) {
				const { error } = await config.updateEntry(editingEntry.id, payload, editingEntry);
				if (error) throw error;
				toast({ title: config.labels.updatedToast });
			} else {
				const { data, error } = await config.createEntry(payload);
				if (error) throw error;
				if (!config.attachmentsKind) {
					toast({ title: config.labels.createdToast });
				} else if (data?.id === undefined && stagedAtSubmit.length > 0) {
					throw new Error(
						`No se pudo obtener el identificador del ${config.labels.entityLabel} creado; los archivos adjuntos no se subieron.`
					);
				} else {
					const failed =
						data?.id !== undefined && stagedAtSubmit.length > 0
							? await uploadStagedFiles(stagedAtSubmit, data.id)
							: 0;
					if (submissionSession === formSessionRef.current) setStagedFiles([]);
					if (failed > 0) {
						toast({
							variant: 'destructive',
							title: 'Archivos adjuntos pendientes',
							description: `El ${config.labels.entityLabel} se creó, pero ${failed} de ${pluralArchivos(stagedAtSubmit.length)} ${noPudieronAdjuntar(failed)}. Podés reintentarlos desde la vista de edición.`,
						});
					} else if (stagedAtSubmit.length > 0) {
						toast({
							title: config.labels.createdToast,
							description: `${adjuntaron(stagedAtSubmit.length)} ${pluralArchivos(stagedAtSubmit.length)}.`,
						});
					} else {
						toast({ title: config.labels.createdToast });
					}
				}
			}
			if (submissionSession === formSessionRef.current) {
				setIsFormOpen(false);
				setEditingEntry(null);
			}
			await fetchEntries(year);
		} catch (error) {
			toast({
				title: 'Error',
				description: translateError(error) || config.labels.saveError,
				variant: 'destructive',
			});
		} finally {
			setSaving(false);
			submittingRef.current = false;
		}
	};

	// Delete confirm state
	const [entryToDelete, setEntryToDelete] = useState<CollectionPaymentEntry | null>(null);
	const [deleting, setDeleting] = useState(false);

	const confirmDelete = async () => {
		if (!entryToDelete) return;
		setDeleting(true);
		try {
			const { error } = await config.deleteEntry(entryToDelete.id, entryToDelete);
			if (error) throw error;
			toast({ title: config.labels.deletedToast });
			await fetchEntries(year);
		} catch (error) {
			toast({
				title: 'Error',
				description: translateError(error) || config.labels.deleteError,
				variant: 'destructive',
			});
		} finally {
			setDeleting(false);
			setEntryToDelete(null);
		}
	};

	const descriptionMaxLength = getDescriptionMaxLength(partyOptional && !!partyId);

	return {
		year,
		setYear,
		yearOptions,
		partyOptional,
		hideParty: !!config.hideParty,
		linkedLabel: config.linkedLabel ?? 'Compra',
		purchaseId,
		setPurchaseId: (value: string) => {
			setPurchaseId(value);
			clearError('purchaseId');
		},
		purchases,
		purchasesLoading,
		descriptionMaxLength,
		loadingList,
		entries,
		visibleEntries,
		fetchEntries,
		categories,
		activeCategories,
		works,
		parties,
		paymentMethods,
		activePaymentMethods,
		bankAccounts,
		activeBankAccounts,
		summary,
		dateFrom,
		setDateFrom,
		dateTo,
		setDateTo,
		filterWorkId,
		setFilterWorkId,
		filterPartyId,
		setFilterPartyId,
		filterCategoryId,
		setFilterCategoryId,
		filterPaymentMethodId,
		setFilterPaymentMethodId,
		search,
		setSearch,
		clearFilters,
		activeFilterCount,
		filterDialogOpen,
		setFilterDialogOpen,
		isFormOpen,
		editingEntry,
		date,
		setDate: (value: string) => {
			setDate(value);
			clearError('date');
		},
		receiptNumber,
		setReceiptNumber,
		workId,
		setWorkId,
		partyId,
		setPartyId: (value: string) => {
			setPartyId(value);
			clearError('partyId');
			clearError('purchaseId');
		},
		categoryId,
		setCategoryId,
		description,
		setDescription,
		amount,
		setAmount: (value: string) => {
			setAmount(value);
			clearError('amount');
		},
		paymentMethodId,
		setPaymentMethodId: (value: string) => {
			setPaymentMethodId(value);
			clearError('paymentMethodId');
		},
		paymentMethodOptional,
		bankAccountId,
		setBankAccountId,
		supportsExpenseLink,
		expenseId,
		setExpenseId,
		expenseOptions,
		expenseOptionsLoading,
		errors,
		saving,
		stagedFiles,
		setStagedFiles,
		handleAdd,
		handleEdit,
		handleFormOpenChange,
		handleSubmit,
		entryToDelete,
		setEntryToDelete,
		deleting,
		confirmDelete,
	};
}
