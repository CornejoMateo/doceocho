'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CashFlowCategory, listCategories } from '@/lib/categories/categories';
import {
	FixedExpenseWithCategory,
	createFixedExpense,
	deactivateFixedExpense,
	listFixedExpenses,
	markFixedExpenseExpenseCreated,
	reactivateFixedExpense,
	updateFixedExpense,
} from '@/lib/fixed-expenses/fixed-expenses';
import { useToast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';
import {
	formatCurrencyWithoutSymbol,
	parseArsToNumber,
	roundToTwoDecimals,
} from '@/utils/formats-money';
import { IVA_RATES, computeIvaAndTotal } from '@/constants/cashflow/iva';
import {
	computeFixedExpenseTotals,
	groupFixedExpensesByCategory,
} from '@/helpers/fixed-expenses/fixed-expenses-summary';

export function useFixedExpenses() {
	const { toast } = useToast();

	const [expenses, setExpenses] = useState<FixedExpenseWithCategory[]>([]);
	const [loadingList, setLoadingList] = useState(false);
	const [showInactive, setShowInactive] = useState(false);
	const [actionLoading, setActionLoading] = useState(false);
	const [expenseToDeactivate, setExpenseToDeactivate] = useState<FixedExpenseWithCategory | null>(
		null
	);

	const [categories, setCategories] = useState<CashFlowCategory[]>([]);
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [editingExpense, setEditingExpense] = useState<FixedExpenseWithCategory | null>(null);
	const [categoryId, setCategoryId] = useState('');
	const [netAmount, setNetAmount] = useState('');
	const [ivaPercent, setIvaPercent] = useState<number>(IVA_RATES[0]);
	const [description, setDescription] = useState('');
	const [saving, setSaving] = useState(false);

	const parsedNetAmount = roundToTwoDecimals(parseArsToNumber(netAmount));
	const { totalAmount } = computeIvaAndTotal(parsedNetAmount, ivaPercent);

	const expensesRequestIdRef = useRef(0);
	const categoriesRequestIdRef = useRef(0);

	const visibleExpenses = useMemo(
		() => (showInactive ? expenses : expenses.filter((e) => e.is_active)),
		[expenses, showInactive]
	);
	const activeCategories = useMemo(() => categories.filter((c) => c.is_active), [categories]);
	const activeExpenses = useMemo(() => expenses.filter((e) => e.is_active), [expenses]);
	const expenseTotals = useMemo(() => computeFixedExpenseTotals(activeExpenses), [activeExpenses]);
	const expensesByCategory = useMemo(
		() => groupFixedExpensesByCategory(activeExpenses, categories),
		[activeExpenses, categories]
	);

	const fetchExpenses = async () => {
		const requestId = ++expensesRequestIdRef.current;
		setLoadingList(true);
		try {
			const { data, error } = await listFixedExpenses();
			if (error) throw error;
			if (requestId !== expensesRequestIdRef.current) return;
			setExpenses(data ?? []);
		} catch (error) {
			if (requestId !== expensesRequestIdRef.current) return;
			toast({
				title: 'Error',
				description: translateError(error) || 'No se pudieron cargar los costos fijos.',
				variant: 'destructive',
			});
		} finally {
			if (requestId === expensesRequestIdRef.current) setLoadingList(false);
		}
	};

	useEffect(() => {
		void fetchExpenses();
	}, []);

	const fetchCategories = async () => {
		const requestId = ++categoriesRequestIdRef.current;
		try {
			const { data, error } = await listCategories('expense');
			if (error) throw error;
			if (requestId !== categoriesRequestIdRef.current) return;
			setCategories(data ?? []);
		} catch (error) {
			if (requestId !== categoriesRequestIdRef.current) return;
			toast({
				title: 'Error',
				description: translateError(error) || 'No se pudieron cargar las categorías.',
				variant: 'destructive',
			});
		}
	};

	useEffect(() => {
		void fetchCategories();
	}, []);

	// re-fetch when the form dialog opens so edits made in CategoriesConfig show up immediately
	useEffect(() => {
		if (!isFormOpen) return;
		void fetchCategories();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isFormOpen]);

	const handleAdd = () => {
		setEditingExpense(null);
		setCategoryId('');
		setNetAmount('');
		setIvaPercent(IVA_RATES[0]);
		setDescription('');
		setIsFormOpen(true);
	};

	const handleEdit = (expense: FixedExpenseWithCategory) => {
		setEditingExpense(expense);
		setCategoryId(String(expense.category_id));
		setNetAmount(formatCurrencyWithoutSymbol(expense.net_amount));
		setIvaPercent(expense.iva_percent);
		setDescription(expense.description);
		setIsFormOpen(true);
	};

	const handleFormOpenChange = (open: boolean) => {
		setIsFormOpen(open);
		if (!open) setEditingExpense(null);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const trimmedDescription = description.trim();
		if (
			!categoryId ||
			!trimmedDescription ||
			!Number.isFinite(parsedNetAmount) ||
			parsedNetAmount <= 0
		)
			return;
		setSaving(true);
		try {
			const payload = {
				category_id: Number(categoryId),
				net_amount: parsedNetAmount,
				iva_percent: ivaPercent,
				description: trimmedDescription,
			};
			const { error } = editingExpense
				? await updateFixedExpense(editingExpense.id, payload)
				: await createFixedExpense(payload);
			if (error) throw error;
			toast({
				title: editingExpense ? 'Costo fijo actualizado' : 'Costo fijo creado',
				description: editingExpense
					? 'El costo fijo ha sido actualizado correctamente.'
					: 'El costo fijo ha sido creado correctamente.',
			});
			setIsFormOpen(false);
			setEditingExpense(null);
			await fetchExpenses();
		} catch (error) {
			toast({
				title: 'Error',
				description: translateError(error) || 'No se pudo guardar el costo fijo.',
				variant: 'destructive',
			});
		} finally {
			setSaving(false);
		}
	};

	const confirmDeactivate = async () => {
		if (!expenseToDeactivate) return;
		setActionLoading(true);
		try {
			const { error } = await deactivateFixedExpense(expenseToDeactivate.id);
			if (error) throw error;
			toast({
				title: 'Costo fijo desactivado',
				description: 'El costo fijo ha sido desactivado correctamente.',
			});
			await fetchExpenses();
		} catch (error) {
			toast({
				title: 'Error',
				description: translateError(error) || 'No se pudo desactivar el costo fijo.',
				variant: 'destructive',
			});
		} finally {
			setActionLoading(false);
			setExpenseToDeactivate(null);
		}
	};

	const markExpenseCreated = async (fixedExpenseId: number) => {
		const { error } = await markFixedExpenseExpenseCreated(fixedExpenseId);
		if (error) {
			toast({
				title: 'Error',
				description: translateError(error) || 'No se pudo actualizar el costo fijo.',
				variant: 'destructive',
			});
			return;
		}
		await fetchExpenses();
	};

	const handleReactivate = async (expense: FixedExpenseWithCategory) => {
		setActionLoading(true);
		try {
			const { error } = await reactivateFixedExpense(expense.id);
			if (error) throw error;
			toast({
				title: 'Costo fijo reactivado',
				description: 'El costo fijo ha sido reactivado correctamente.',
			});
			await fetchExpenses();
		} catch (error) {
			toast({
				title: 'Error',
				description: translateError(error) || 'No se pudo reactivar el costo fijo.',
				variant: 'destructive',
			});
		} finally {
			setActionLoading(false);
		}
	};

	return {
		loadingList,
		showInactive,
		setShowInactive,
		visibleExpenses,
		categories,
		activeCategories,
		expenseTotals,
		expensesByCategory,
		fetchExpenses,
		isFormOpen,
		editingExpense,
		categoryId,
		setCategoryId,
		netAmount,
		setNetAmount,
		ivaPercent,
		setIvaPercent,
		totalAmount,
		description,
		setDescription,
		saving,
		handleAdd,
		handleEdit,
		handleFormOpenChange,
		handleSubmit,
		actionLoading,
		expenseToDeactivate,
		setExpenseToDeactivate,
		confirmDeactivate,
		handleReactivate,
		markExpenseCreated,
	};
}
