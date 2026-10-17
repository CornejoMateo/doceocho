'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CashFlowCategory, CategoryKind, listCategories } from '@/lib/categories/categories';
import { Work, listWorks } from '@/lib/works/works';
import { PaymentMethod, listPaymentMethods } from '@/lib/payment-methods/payment-methods';
import { BankAccount, listActiveBankAccounts } from '@/lib/cash-flow/cash-flow';
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
	payment_method_id: number;
	payment_method_name: string | null;
	bank_account_id: number | null;
};

export type LinkedEntityExclude = { purchaseId: number; amount: number };

export type CollectionPaymentFormErrors = Partial<
	Record<'date' | 'partyId' | 'purchaseId' | 'paymentMethodId' | 'amount', boolean>
>;

type UseCollectionPaymentTabConfig = {
	categoryKind: CategoryKind;
	listEntries: (year: number) => Promise<{ data: CollectionPaymentEntry[] | null; error: any }>;
	createEntry: (input: EntrySavePayload) => Promise<{ error: any }>;
	updateEntry: (
		id: number,
		input: EntrySavePayload,
		entry: CollectionPaymentEntry
	) => Promise<{ error: any }>;
	deleteEntry: (id: number, entry: CollectionPaymentEntry) => Promise<{ error: any }>;
	listParties: () => Promise<{ data: PartyOption[] | null; error: any }>;
	partyOptional?: boolean;
	loadPurchases?: (
		partyId: number,
		exclude?: LinkedEntityExclude
	) => Promise<{ data: PartyOption[] | null; error: any }>;
	loadAccounts?: (
		partyId: number,
		exclude?: LinkedEntityExclude
	) => Promise<{ data: PartyOption[] | null; error: any }>;
	linkedLabel?: string;
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

	// Year-scoped fetch (mirrors useIncomeExpenseTab); other filters stay in-memory.
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

	const [categories, setCategories] = useState<CashFlowCategory[]>([]);
	const [works, setWorks] = useState<Work[]>([]);
	const [parties, setParties] = useState<PartyOption[]>([]);
	const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
	const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

	const activeCategories = useMemo(() => categories.filter((c) => c.is_active), [categories]);
	const activePaymentMethods = useMemo(
		() => paymentMethods.filter((m) => m.is_active),
		[paymentMethods]
	);

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
		const { data, error } = await config.listParties();
		if (error) return;
		setParties(data ?? []);
	};

	const fetchPaymentMethods = async () => {
		const { data, error } = await listPaymentMethods();
		if (error) return;
		setPaymentMethods(data ?? []);
	};

	const fetchBankAccounts = async () => {
		const { data, error } = await listActiveBankAccounts();
		if (error) return;
		setBankAccounts(data ?? []);
	};

	useEffect(() => {
		void fetchCategories();
		void fetchWorks();
		void fetchParties();
		void fetchPaymentMethods();
		void fetchBankAccounts();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Refetch entries whenever the selected year changes (and on mount).
	useEffect(() => {
		void fetchEntries(year);
		// eslint-disable-next-line react-hooks/exhaustive-deps
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
	const [paymentMethodId, setPaymentMethodId] = useState('');
	const [bankAccountId, setBankAccountId] = useState('none');
	const [saving, setSaving] = useState(false);
	const partyOptional = !!config.partyOptional;
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
		setPaymentMethodId('');
		setBankAccountId('none');
		setErrors({});
	};

	const handleAdd = () => {
		setEditingEntry(null);
		resetForm();
		setIsFormOpen(true);
	};

	const handleEdit = (entry: CollectionPaymentEntry) => {
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
		setPaymentMethodId(entry.payment_method_id ? String(entry.payment_method_id) : '');
		setBankAccountId(entry.bank_account_id ? String(entry.bank_account_id) : 'none');
		setErrors({});
		setIsFormOpen(true);
	};

	const handleFormOpenChange = (open: boolean) => {
		setIsFormOpen(open);
		if (!open) setEditingEntry(null);
	};

	// re-fetch so edits made in CategoriesConfig show up immediately
	useEffect(() => {
		if (!isFormOpen) return;
		void fetchCategories();
		void fetchPaymentMethods();
		void fetchBankAccounts();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isFormOpen]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const nextErrors: CollectionPaymentFormErrors = {};
		if (!date) nextErrors.date = true;
		if (!paymentMethodId) nextErrors.paymentMethodId = true;
		if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) nextErrors.amount = true;
		if (!partyOptional && !partyId) nextErrors.partyId = true;
		if (partyOptional && partyId && !purchaseId) nextErrors.purchaseId = true;
		if (Object.keys(nextErrors).length > 0) {
			setErrors(nextErrors);
			toast({ title: 'Completá los campos obligatorios', variant: 'destructive' });
			return;
		}
		setErrors({});
		setSaving(true);
		try {
			const isLinkedEntityRoute = partyOptional && !!partyId;
			const trimmedDescription = description.trim();
			const normalizedDescription = isLinkedEntityRoute
				? trimmedDescription
				: trimmedDescription.slice(0, 300);
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
				payment_method_id: Number(paymentMethodId),
				payment_method_name:
					paymentMethods.find((m) => String(m.id) === paymentMethodId)?.name ?? null,
				bank_account_id: bankAccountId === 'none' ? null : Number(bankAccountId),
			};
			const { error } = editingEntry
				? await config.updateEntry(editingEntry.id, payload, editingEntry)
				: await config.createEntry(payload);
			if (error) throw error;
			toast({ title: editingEntry ? config.labels.updatedToast : config.labels.createdToast });
			setIsFormOpen(false);
			setEditingEntry(null);
			await fetchEntries(year);
		} catch (error) {
			toast({
				title: 'Error',
				description: translateError(error) || config.labels.saveError,
				variant: 'destructive',
			});
		} finally {
			setSaving(false);
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

	const descriptionMaxLength = partyOptional && partyId ? 2000 : 300;

	return {
		year,
		setYear,
		yearOptions,
		partyOptional,
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
		bankAccountId,
		setBankAccountId,
		errors,
		saving,
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
