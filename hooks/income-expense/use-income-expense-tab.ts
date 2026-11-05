'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CashFlowCategory, CategoryKind, listCategories } from '@/lib/categories/categories';
import { VoucherType, listVoucherTypes } from '@/lib/voucher-types/voucher-types';
import { Work, listWorks } from '@/lib/works/works';
import { PaymentMethod, listPaymentMethods } from '@/lib/payment-methods/payment-methods';
import { BankAccount, listBankAccounts } from '@/lib/cash-flow/cash-flow';
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
import type { StagedFile } from '@/components/business/shared/attachments/file-attachments';
import { uploadFileExpense } from '@/lib/expenses/files-expenses';
import { uploadFileIncome } from '@/lib/incomes/files-incomes';
import { pluralFiles, attachments, notAttachments } from '@/helpers/attachments/attachments';

const UPLOAD_FILE_BY_KIND = {
	expense: uploadFileExpense,
	income: uploadFileIncome,
} as const;

export type PartyOption = { id: number; name: string; isSettled?: boolean };

// Normalized shape shared by incomes and expenses; party_* is client/supplier depending on kind.
export type IncomeExpenseEntry = {
	id: number;
	date: string;
	voucher_number: string | null;
	voucher_type_id: number | null;
	voucher_type_name: string;
	work_id: number | null;
	work_name: string | null;
	party_id: number | null;
	party_name: string;
	category_id: number | null;
	category_name: string;
	description: string | null;
	net_amount: number;
	iva_percent: number;
	iva_amount: number;
	total_amount: number;
	payment_method_id: number | null;
	payment_method_name: string | null;
	bank_account_id: number | null;
	bank_account_name: string | null;
};

// Boolean flags for fields that fail validation on submit; drives inline field errors in the dialog.
export type IncomeExpenseFormErrors = Partial<Record<'date' | 'netAmount', boolean>>;

export type EntrySavePayload = {
	date: string;
	voucher_number: string | null;
	voucher_type_id: number | null;
	work_id: number | null;
	party_id: number | null;
	category_id: number | null;
	description: string | null;
	net_amount: number;
	iva_percent: number;
	iva_amount: number;
	total_amount: number;
	payment_method_id: number | null;
	bank_account_id: number | null;
};

type UseIncomeExpenseTabConfig = {
	categoryKind: CategoryKind;
	listEntries: (year: number) => Promise<{ data: IncomeExpenseEntry[] | null; error: any }>;
	createEntry: (input: EntrySavePayload) => Promise<{ data?: { id: number } | null; error: any }>;
	updateEntry: (id: number, input: EntrySavePayload) => Promise<{ error: any }>;
	deleteEntry: (id: number) => Promise<{ error: any; orphanedPaths?: string[] }>;
	listParties: () => Promise<{ data: PartyOption[] | null; error: any }>;
	attachmentsKind?: 'expense' | 'income';
	// Caps the description field; defaults to 300. Gastos sets 2000 (expenses.description).
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
	const formSessionRef = useRef(0);
	const submittingRef = useRef(false);

	const [categories, setCategories] = useState<CashFlowCategory[]>([]);
	const [voucherTypes, setVoucherTypes] = useState<VoucherType[]>([]);
	const [works, setWorks] = useState<Work[]>([]);
	const [parties, setParties] = useState<PartyOption[]>([]);
	const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
	const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

	const activeCategories = useMemo(() => categories.filter((c) => c.is_active), [categories]);
	const activeVoucherTypes = useMemo(() => voucherTypes.filter((v) => v.is_active), [voucherTypes]);
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

	const fetchPaymentMethods = async () => {
		const { data, error } = await listPaymentMethods();
		if (error) {
			// Surface the failure; otherwise the selector stays empty with no explanation on submit.
			toast({
				title: 'Error',
				description: translateError(error) || 'No se pudieron cargar los medios de pago',
				variant: 'destructive',
			});
			return;
		}
		setPaymentMethods(data ?? []);
	};

	// Fetches all accounts (not just active) so an edit can still show an account that was deactivated later.
	const fetchBankAccounts = async () => {
		const { data, error } = await listBankAccounts();
		if (error) return;
		setBankAccounts(data ?? []);
	};

	useEffect(() => {
		void fetchCategories();
		void fetchVoucherTypes();
		void fetchWorks();
		void fetchParties();
		void fetchPaymentMethods();
		void fetchBankAccounts();
	}, []);

	useEffect(() => {
		void fetchEntries(year);
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
	const [paymentMethodId, setPaymentMethodId] = useState('none');
	const [bankAccountId, setBankAccountId] = useState('none');
	const [saving, setSaving] = useState(false);
	const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
	const [errors, setErrors] = useState<IncomeExpenseFormErrors>({});
	const clearError = (field: keyof IncomeExpenseFormErrors) => {
		setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
	};

	const parsedNetAmount = roundToTwoDecimals(parseArsToNumber(netAmount));
	const { ivaAmount, totalAmount } = computeIvaAndTotal(parsedNetAmount, ivaPercent);
	const descriptionMaxLength = config.descriptionMaxLength ?? 300;

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
		setPaymentMethodId('none');
		setBankAccountId('none');
		setErrors({});
		setStagedFiles([]);
	};

	const handleAdd = () => {
		formSessionRef.current += 1;
		setEditingEntry(null);
		resetForm();
		setIsFormOpen(true);
	};

	const handleEdit = (entry: IncomeExpenseEntry) => {
		formSessionRef.current += 1;
		setEditingEntry(entry);
		setDate(entry.date);
		setVoucherNumber(entry.voucher_number ?? '');
		setVoucherTypeId(entry.voucher_type_id ? String(entry.voucher_type_id) : '');
		setWorkId(entry.work_id ? String(entry.work_id) : '');
		setPartyId(entry.party_id ? String(entry.party_id) : '');
		setCategoryId(entry.category_id ? String(entry.category_id) : '');
		setDescription(entry.description ?? '');
		setNetAmount(formatCurrencyWithoutSymbol(entry.net_amount));
		setIvaPercent(entry.iva_percent);
		setPaymentMethodId(entry.payment_method_id ? String(entry.payment_method_id) : 'none');
		setBankAccountId(entry.bank_account_id ? String(entry.bank_account_id) : 'none');
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
		const uploadFile = config.attachmentsKind ? UPLOAD_FILE_BY_KIND[config.attachmentsKind] : null;
		if (!uploadFile) return 0;
		let failed = 0;
		for (const entry of staged) {
			try {
				const { error } = await uploadFile(entityId, entry.file, null, entry.fileName);
				if (error) failed += 1;
			} catch {
				failed += 1;
			}
		}
		return failed;
	};

	useEffect(() => {
		if (!isFormOpen) return;
		void fetchCategories();
		void fetchVoucherTypes();
		void fetchPaymentMethods();
		void fetchBankAccounts();
	}, [isFormOpen]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (submittingRef.current) return;
		submittingRef.current = true;
		const nextErrors: IncomeExpenseFormErrors = {};
		if (!date) nextErrors.date = true;
		if (!Number.isFinite(parsedNetAmount) || parsedNetAmount < 0) nextErrors.netAmount = true;
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
			const payload: EntrySavePayload = {
				date,
				voucher_number: voucherNumber.trim() || null,
				voucher_type_id: voucherTypeId ? Number(voucherTypeId) : null,
				work_id: workId ? Number(workId) : null,
				party_id: partyId ? Number(partyId) : null,
				category_id: categoryId ? Number(categoryId) : null,
				description: description.trim().slice(0, descriptionMaxLength) || null,
				net_amount: parsedNetAmount,
				iva_percent: ivaPercent,
				iva_amount: ivaAmount,
				total_amount: totalAmount,
				payment_method_id: paymentMethodId === 'none' ? null : Number(paymentMethodId),
				bank_account_id: bankAccountId === 'none' ? null : Number(bankAccountId),
			};
			if (editingEntry) {
				const { error } = await config.updateEntry(editingEntry.id, payload);
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
							description: `El ${config.labels.entityLabel} se creó, pero ${failed} de ${pluralFiles(stagedAtSubmit.length)} ${notAttachments(failed)}. Podés reintentarlos desde la vista de edición.`,
						});
					} else if (stagedAtSubmit.length > 0) {
						toast({
							title: config.labels.createdToast,
							description: `${attachments(stagedAtSubmit.length)} ${pluralFiles(stagedAtSubmit.length)}.`,
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
			// `year` is the one from this submit's render; the dialog blocks changing it while saving.
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
	const [entryToDelete, setEntryToDelete] = useState<IncomeExpenseEntry | null>(null);
	const [deleting, setDeleting] = useState(false);

	const confirmDelete = async () => {
		if (!entryToDelete) return;
		setDeleting(true);
		try {
			const { error, orphanedPaths } = await config.deleteEntry(entryToDelete.id);
			if (error) throw error;
			toast({ title: config.labels.deletedToast });
			if (orphanedPaths && orphanedPaths.length > 0) {
				toast({
					title: 'Archivos no eliminados',
					description: `${orphanedPaths.length} ${orphanedPaths.length === 1 ? 'no se pudo' : 'no se pudieron'} eliminar del almacenamiento.`,
					variant: 'destructive',
				});
			}
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
		entries,
		visibleEntries,
		fetchEntries,
		categories,
		activeCategories,
		voucherTypes,
		activeVoucherTypes,
		works,
		parties,
		paymentMethods,
		activePaymentMethods,
		bankAccounts,
		activeBankAccounts,
		descriptionMaxLength,
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
		setVoucherTypeId,
		workId,
		setWorkId,
		partyId,
		setPartyId,
		categoryId,
		setCategoryId,
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
		paymentMethodId,
		setPaymentMethodId,
		bankAccountId,
		setBankAccountId,
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
