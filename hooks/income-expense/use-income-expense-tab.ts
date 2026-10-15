'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CashFlowCategory, CategoryKind, listCategories } from '@/lib/categories/categories';
import { VoucherType, listVoucherTypes } from '@/lib/voucher-types/voucher-types';
import { Work, listWorks } from '@/lib/works/works';
import { useToast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';
import { computeIvaAndTotal, IVA_RATES } from '@/constants/cashflow/iva';
import {
	formatCurrencyWithoutSymbol,
	parseArsToNumber,
	roundToTwoDecimals,
} from '@/utils/formats-money';
import { getLocalDate } from '@/utils/format-date';
import { FUTURE_YEARS_AHEAD, PAST_YEARS_BACK } from '@/constants/cashflow/fixed-expenses';

export type PartyOption = { id: number; name: string; isSettled?: boolean };

// Normalized shape shared by incomes and expenses; party_* is client/supplier depending on kind.
export type IncomeExpenseEntry = {
	id: number;
	date: string;
	voucher_number: string | null;
	voucher_type_id: number;
	voucher_type_name: string;
	work_id: number | null;
	work_name: string | null;
	party_id: number;
	party_name: string;
	category_id: number;
	category_name: string;
	description: string | null;
	net_amount: number;
	iva_percent: number;
	iva_amount: number;
	total_amount: number;
};

// Boolean flags for fields that fail validation on submit; drives inline field errors in the dialog.
export type IncomeExpenseFormErrors = Partial<
	Record<'date' | 'voucherTypeId' | 'partyId' | 'categoryId' | 'netAmount', boolean>
>;

export type EntrySavePayload = {
	date: string;
	voucher_number: string | null;
	voucher_type_id: number;
	work_id: number | null;
	party_id: number;
	category_id: number;
	description: string | null;
	net_amount: number;
	iva_percent: number;
	iva_amount: number;
	total_amount: number;
};

type UseIncomeExpenseTabConfig = {
	categoryKind: CategoryKind;
	listEntries: (year: number) => Promise<{ data: IncomeExpenseEntry[] | null; error: any }>;
	createEntry: (input: EntrySavePayload) => Promise<{ error: any }>;
	updateEntry: (id: number, input: EntrySavePayload) => Promise<{ error: any }>;
	deleteEntry: (id: number) => Promise<{ error: any }>;
	listParties: () => Promise<{ data: PartyOption[] | null; error: any }>;
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

export function useIncomeExpenseTab(config: UseIncomeExpenseTabConfig) {
	const { toast } = useToast();

	// Year-scoped fetch (mirrors useFixedExpensePayments); other filters stay in-memory.
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

	const [entries, setEntries] = useState<IncomeExpenseEntry[]>([]);
	const [loadingList, setLoadingList] = useState(false);
	const entriesRequestIdRef = useRef(0);

	const [categories, setCategories] = useState<CashFlowCategory[]>([]);
	const [voucherTypes, setVoucherTypes] = useState<VoucherType[]>([]);
	const [works, setWorks] = useState<Work[]>([]);
	const [parties, setParties] = useState<PartyOption[]>([]);

	const activeCategories = useMemo(() => categories.filter((c) => c.is_active), [categories]);
	const activeVoucherTypes = useMemo(() => voucherTypes.filter((v) => v.is_active), [voucherTypes]);

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

	const fetchVoucherTypes = async () => {
		const { data, error } = await listVoucherTypes();
		if (error) return;
		setVoucherTypes(data ?? []);
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

	useEffect(() => {
		void fetchCategories();
		void fetchVoucherTypes();
		void fetchWorks();
		void fetchParties();
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
	const [search, setSearch] = useState('');
	const [filterDialogOpen, setFilterDialogOpen] = useState(false);

	const activeFilterCount = useMemo(() => {
		return [dateFrom, dateTo, filterWorkId, filterPartyId, filterCategoryId].filter(Boolean).length;
	}, [dateFrom, dateTo, filterWorkId, filterPartyId, filterCategoryId]);

	const visibleEntries = useMemo(() => {
		return entries.filter((entry) => {
			if (dateFrom && entry.date < dateFrom) return false;
			if (dateTo && entry.date > dateTo) return false;
			if (filterWorkId && String(entry.work_id ?? '') !== filterWorkId) return false;
			if (filterPartyId && String(entry.party_id) !== filterPartyId) return false;
			if (filterCategoryId && String(entry.category_id) !== filterCategoryId) return false;
			if (search) {
				const term = search.trim().toLowerCase();
				const haystack =
					`${entry.voucher_number ?? ''} ${entry.description ?? ''} ${entry.party_name}`.toLowerCase();
				if (term && !haystack.includes(term)) return false;
			}
			return true;
		});
	}, [entries, dateFrom, dateTo, filterWorkId, filterPartyId, filterCategoryId, search]);

	const summary = useMemo(() => {
		const count = visibleEntries.length;
		const totalNet = visibleEntries.reduce((sum, e) => sum + Number(e.net_amount), 0);
		const totalIva = visibleEntries.reduce((sum, e) => sum + Number(e.iva_amount), 0);
		const totalGross = visibleEntries.reduce((sum, e) => sum + Number(e.total_amount), 0);
		return { count, totalNet, totalIva, totalGross, average: count > 0 ? totalGross / count : 0 };
	}, [visibleEntries]);

	// Clears only the modal filters, not search (mirrors balances-tab's resetFilters leaving searchTerm untouched).
	const clearFilters = () => {
		setDateFrom('');
		setDateTo('');
		setFilterWorkId('');
		setFilterPartyId('');
		setFilterCategoryId('');
	};

	// Form dialog state
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [editingEntry, setEditingEntry] = useState<IncomeExpenseEntry | null>(null);
	const [date, setDate] = useState(getLocalDate());
	const [voucherNumber, setVoucherNumber] = useState('');
	const [voucherTypeId, setVoucherTypeId] = useState('');
	const [workId, setWorkId] = useState('');
	const [partyId, setPartyId] = useState('');
	const [categoryId, setCategoryId] = useState('');
	const [description, setDescription] = useState('');
	const [netAmount, setNetAmount] = useState('');
	const [ivaPercent, setIvaPercent] = useState<number>(IVA_RATES[0]);
	const [saving, setSaving] = useState(false);
	const [errors, setErrors] = useState<IncomeExpenseFormErrors>({});
	const clearError = (field: keyof IncomeExpenseFormErrors) => {
		setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
	};

	// Net is capped to 2 decimals (DB check requires it); iva/total here are preview only, DB recomputes authoritatively.
	const parsedNetAmount = roundToTwoDecimals(parseArsToNumber(netAmount));
	const { ivaAmount, totalAmount } = computeIvaAndTotal(parsedNetAmount, ivaPercent);

	const resetForm = () => {
		setDate(getLocalDate());
		setVoucherNumber('');
		setVoucherTypeId('');
		setWorkId('');
		setPartyId('');
		setCategoryId('');
		setDescription('');
		setNetAmount('');
		setIvaPercent(IVA_RATES[0]);
		setErrors({});
	};

	const handleAdd = () => {
		setEditingEntry(null);
		resetForm();
		setIsFormOpen(true);
	};

	const handleEdit = (entry: IncomeExpenseEntry) => {
		setEditingEntry(entry);
		setDate(entry.date);
		setVoucherNumber(entry.voucher_number ?? '');
		setVoucherTypeId(String(entry.voucher_type_id));
		setWorkId(entry.work_id ? String(entry.work_id) : '');
		setPartyId(String(entry.party_id));
		setCategoryId(String(entry.category_id));
		setDescription(entry.description ?? '');
		setNetAmount(formatCurrencyWithoutSymbol(entry.net_amount));
		setIvaPercent(entry.iva_percent);
		setErrors({});
		setIsFormOpen(true);
	};

	const handleFormOpenChange = (open: boolean) => {
		setIsFormOpen(open);
		if (!open) setEditingEntry(null);
	};

	// re-fetch so edits made in VoucherTypesConfig/CategoriesConfig show up immediately
	useEffect(() => {
		if (!isFormOpen) return;
		void fetchCategories();
		void fetchVoucherTypes();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isFormOpen]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const nextErrors: IncomeExpenseFormErrors = {};
		if (!date) nextErrors.date = true;
		if (!voucherTypeId) nextErrors.voucherTypeId = true;
		if (!partyId) nextErrors.partyId = true;
		if (!categoryId) nextErrors.categoryId = true;
		if (!Number.isFinite(parsedNetAmount) || parsedNetAmount < 0) nextErrors.netAmount = true;
		if (Object.keys(nextErrors).length > 0) {
			setErrors(nextErrors);
			toast({ title: 'Completá los campos obligatorios', variant: 'destructive' });
			return;
		}
		setErrors({});
		setSaving(true);
		try {
			const payload: EntrySavePayload = {
				date,
				voucher_number: voucherNumber.trim() || null,
				voucher_type_id: Number(voucherTypeId),
				work_id: workId ? Number(workId) : null,
				party_id: Number(partyId),
				category_id: Number(categoryId),
				description: description.trim() || null,
				net_amount: parsedNetAmount,
				iva_percent: ivaPercent,
				iva_amount: ivaAmount,
				total_amount: totalAmount,
			};
			const { error } = editingEntry
				? await config.updateEntry(editingEntry.id, payload)
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
	const [entryToDelete, setEntryToDelete] = useState<IncomeExpenseEntry | null>(null);
	const [deleting, setDeleting] = useState(false);

	const confirmDelete = async () => {
		if (!entryToDelete) return;
		setDeleting(true);
		try {
			const { error } = await config.deleteEntry(entryToDelete.id);
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

	return {
		year,
		setYear,
		yearOptions,
		loadingList,
		visibleEntries,
		fetchEntries,
		categories,
		activeCategories,
		voucherTypes,
		activeVoucherTypes,
		works,
		parties,
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
		voucherNumber,
		setVoucherNumber,
		voucherTypeId,
		setVoucherTypeId: (value: string) => {
			setVoucherTypeId(value);
			clearError('voucherTypeId');
		},
		workId,
		setWorkId,
		partyId,
		setPartyId: (value: string) => {
			setPartyId(value);
			clearError('partyId');
		},
		categoryId,
		setCategoryId: (value: string) => {
			setCategoryId(value);
			clearError('categoryId');
		},
		description,
		setDescription,
		netAmount,
		setNetAmount: (value: string) => {
			setNetAmount(value);
			clearError('netAmount');
		},
		errors,
		ivaPercent,
		setIvaPercent,
		ivaAmount,
		totalAmount,
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
