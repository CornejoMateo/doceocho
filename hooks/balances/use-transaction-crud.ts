'use client';

import { useState, useEffect, useRef } from 'react';
import {
	BalanceTransaction,
	getTransactionsByBalanceId,
	createTransaction,
	deleteTransaction,
	updateTransaction,
	BalanceTransactionWithBankAccount,
} from '@/lib/balances/balance_transactions';
import {
	BalanceWithBudget,
	updateBalance,
	markBalanceAsSettled,
	unmarkBalanceAsSettled,
} from '@/lib/balances/balances';
import { useToast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';
import { format, set } from 'date-fns';
import { formatNumber, parseArsToNumber } from '@/utils/formats-money';
import { calculateBalanceSummary } from '@/helpers/balances/balance-calculations';

export function useTransactionCrud(
	balance: BalanceWithBudget | null,
	isOpen: boolean,
	uploadFilesForTransaction?: (transactionId: number, files: File[]) => Promise<void>,
	onTransactionCreated?: () => void
) {
	const { toast } = useToast();

	const [transactions, setTransactions] = useState<BalanceTransactionWithBankAccount[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
	const [addingMode, setAddingMode] = useState<'transaction' | null>(null);
	const [transactionToDelete, setTransactionToDelete] = useState<BalanceTransaction | null>(null);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [isEditingNotes, setIsEditingNotes] = useState(false);
	const [balanceNotes, setBalanceNotes] = useState('');
	const [editingTransaction, setEditingTransaction] = useState<BalanceTransaction | null>(null);
	const [transactionFilesToUpload, setTransactionFilesToUpload] = useState<File[]>([]);
	const [isSavingTransaction, setIsSavingTransaction] = useState(false);
	const [isDeletingTransaction, setIsDeletingTransaction] = useState(false);
	const [showSettledReminder, setShowSettledReminder] = useState(false);

	const [isTogglingSettled, setIsTogglingSettled] = useState(false);

	const skipNextAutoCalcRef = useRef(false);

	const [transactionDate, setTransactionDate] = useState<Date>(new Date());
	const [transactionAmount, setTransactionAmount] = useState('');
	const [paymentMethod, setPaymentMethod] = useState('');
	const [notes, setNotes] = useState('');
	const [quoteUsd, setQuoteUsd] = useState('');
	const [usdAmount, setUsdAmount] = useState('');
	const [bankAccountId, setBankAccountId] = useState<string>('');

	useEffect(() => {
		if (balance && isOpen) {
			loadTransactions();
			setBalanceNotes(balance.notes ?? '');
		}
	}, [balance?.id, isOpen]);

	useEffect(() => {
		if (skipNextAutoCalcRef.current) {
			skipNextAutoCalcRef.current = false;
			return;
		}
		if (transactionAmount && quoteUsd && addingMode) {
			const normalizedAmount = transactionAmount.replace(/\./g, '').replace(',', '.');
			const normalizedQuote = quoteUsd.replace(/\./g, '').replace(',', '.');
			const amountNumber = Number(normalizedAmount);
			const rateNumber = Number(normalizedQuote);
			if (!isNaN(amountNumber) && !isNaN(rateNumber)) {
				setUsdAmount(formatNumber((amountNumber / rateNumber).toFixed(3).replace('.', ',')));
			}
		} else {
			if (!transactionAmount || !quoteUsd) {
				setUsdAmount('');
			}
		}
	}, [quoteUsd, transactionAmount, addingMode, editingTransaction]);

	const loadTransactions = async (): Promise<BalanceTransactionWithBankAccount[]> => {
		if (!balance) return [];
		try {
			setIsLoading(true);
			const { data, error } = await getTransactionsByBalanceId(balance.id);
			if (error) {
				console.error('Error al cargar transacciones:', error);
				toast({
					variant: 'destructive',
					title: 'Error al cargar transacciones',
					description:
						translateError(error) ||
						'Hubo un problema al cargar las transacciones. Intente nuevamente.',
				});
				setTransactions([]);
				return [];
			}
			const fetched = data || [];
			setTransactions(fetched);
			return fetched;
		} catch (error) {
			console.error('Error inesperado al cargar transacciones:', error);
			return [];
		} finally {
			setIsLoading(false);
			setHasLoadedOnce(true);
		}
	};

	const buildSummaryFromTransactions = (txs: BalanceTransactionWithBankAccount[]) => {
		const paidArs = txs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
		const paidUsd = txs.reduce((sum, t) => sum + (Number(t.usd_amount) || 0), 0);

		return calculateBalanceSummary({
			budgetAmountArs: balance?.balance_amount_ars,
			budgetAmountUsd: balance?.balance_amount_usd,
			budgetInitialArs: balance?.budget?.amount_ars,
			usdCurrent: balance?.usd_current,
			totalPaidArs: paidArs,
			totalPaidUsd: paidUsd,
			isSettled: balance?.is_settled,
		});
	};

	const detectSettledTransition = (
		beforeType: string,
		freshTransactions: BalanceTransactionWithBankAccount[]
	) => {
		const afterType = buildSummaryFromTransactions(freshTransactions).type;

		if (beforeType !== 'Saldado' && afterType === 'Saldado' && balance?.is_settled !== true) {
			setShowSettledReminder(true);
		}
	};

	const dismissSettledReminder = () => {
		setShowSettledReminder(false);
	};

	const handleMarkAsSettled = async () => {
		if (!balance) return;

		setIsTogglingSettled(true);

		try {
			const { error } = await markBalanceAsSettled(balance.id);

			if (error) {
				toast({
					variant: 'destructive',
					title: 'Error al marcar como saldado',
					description:
						translateError(error) || 'Hubo un problema al marcar la cuenta corriente como saldada.',
				});
				return;
			}

			toast({
				title: 'Cuenta corriente saldada',
				description: 'La cuenta corriente se marcó como saldada exitosamente.',
			});

			setShowSettledReminder(false);
			onTransactionCreated?.();
		} catch (error) {
			toast({
				variant: 'destructive',
				title: 'Error inesperado',
				description: translateError(error) || 'Ocurrió un error inesperado. Intente nuevamente.',
			});
		} finally {
			setIsTogglingSettled(false);
		}
	};

	const handleUnmarkAsSettled = async () => {
		if (!balance) return;

		setIsTogglingSettled(true);

		try {
			const { error } = await unmarkBalanceAsSettled(balance.id);

			if (error) {
				toast({
					variant: 'destructive',
					title: 'Error al desmarcar como saldado',
					description:
						translateError(error) ||
						'Hubo un problema al desmarcar la cuenta corriente como saldada.',
				});
				return;
			}

			toast({
				title: 'Cuenta corriente desmarcada',
				description: 'La cuenta corriente se desmarcó como saldada exitosamente.',
			});

			onTransactionCreated?.();
		} catch (error) {
			toast({
				variant: 'destructive',
				title: 'Error inesperado',
				description: translateError(error) || 'Ocurrió un error inesperado. Intente nuevamente.',
			});
		} finally {
			setIsTogglingSettled(false);
		}
	};

	const handleAddTransaction = async () => {
		if (!balance || isSavingTransaction) return;

		const beforeType = summary.type;

		if (!quoteUsd) {
			toast({
				variant: 'destructive',
				title: 'Error al crear transacción',
				description: 'El campo "Cotización USD" es obligatorio.',
			});
			return;
		}

		setIsSavingTransaction(true);

		try {
			const { data, error } = await createTransaction({
				balance_id: balance.id,
				date: format(transactionDate, 'yyyy-MM-dd'),
				amount: parseArsToNumber(transactionAmount),
				payment_method: paymentMethod || null,
				notes: notes || null,
				quote_usd: quoteUsd ? parseArsToNumber(quoteUsd) : null,
				usd_amount: usdAmount ? parseArsToNumber(usdAmount) : null,
				bank_account_id: bankAccountId ? Number(bankAccountId) : null,
			});

			if (error) {
				toast({
					variant: 'destructive',
					title: 'Error al crear transacción',
					description:
						translateError(error) ||
						'Hubo un problema al crear la transacción. Intente nuevamente.',
				});
				return;
			}

			let fileUploadError: unknown = null;
			if (data && transactionFilesToUpload.length > 0) {
				try {
					await uploadFilesForTransaction?.(data.id, transactionFilesToUpload);
				} catch (uploadError) {
					fileUploadError = uploadError;
				}
			}

			toast({
				title: 'Transacción creada',
				description: fileUploadError
					? 'Se creó, pero hubo un problema al subir los archivos adjuntos.'
					: 'La transacción se ha creado exitosamente.',
				variant: fileUploadError ? 'destructive' : undefined,
			});

			resetTransactionForm();
			const freshTransactions = await loadTransactions();
			detectSettledTransition(beforeType, freshTransactions);
			onTransactionCreated?.();
		} catch (error) {
			toast({
				variant: 'destructive',
				title: 'Error inesperado',
				description: translateError(error) || 'Ocurrió un error inesperado. Intente nuevamente.',
			});
		} finally {
			setIsSavingTransaction(false);
		}
	};

	const handleDeleteTransaction = async () => {
		if (!transactionToDelete) return;

		const beforeType = summary.type;

		setIsDeletingTransaction(true);

		const loadingToast = toast({
			title: 'Eliminando transacción...',
		});

		try {
			const { error } = await deleteTransaction(transactionToDelete.id);

			if (error) {
				loadingToast.update({
					id: loadingToast.id,
					variant: 'destructive',
					title: 'Error al eliminar transacción',
					description:
						translateError(error) ||
						'Hubo un problema al eliminar la transacción. Intente nuevamente.',
				});
				return;
			}

			loadingToast.update({
				id: loadingToast.id,
				title: 'Transacción eliminada',
				description: 'La transacción se ha eliminado exitosamente.',
			});

			const freshTransactions = await loadTransactions();
			detectSettledTransition(beforeType, freshTransactions);
			onTransactionCreated?.();
		} catch (error) {
			loadingToast.update({
				id: loadingToast.id,
				variant: 'destructive',
				title: 'Error inesperado',
				description: translateError(error) || 'Ocurrió un error inesperado. Intente nuevamente.',
			});
		} finally {
			setIsDeleteDialogOpen(false);
			setTransactionToDelete(null);
			setIsDeletingTransaction(false);
		}
	};

	const handleUpdateBalanceNotes = async () => {
		if (!balance) return;

		try {
			const { error } = await updateBalance(balance.id, {
				notes: balanceNotes ? balanceNotes : null,
			});

			if (error) {
				toast({
					variant: 'destructive',
					title: 'Error al actualizar notas',
					description: translateError(error) || 'Hubo un problema al actualizar las notas.',
				});
				return;
			}

			toast({
				title: 'Notas actualizadas',
				description: 'Las notas se han actualizado exitosamente.',
			});

			setIsEditingNotes(false);
			onTransactionCreated?.();
		} catch (error) {
			toast({
				variant: 'destructive',
				title: 'Error inesperado',
				description: translateError(error) || 'Ocurrió un error inesperado. Intente nuevamente.',
			});
		}
	};

	const resetTransactionForm = () => {
		setEditingTransaction(null);
		setTransactionDate(new Date());
		setTransactionAmount('');
		setPaymentMethod('');
		setNotes('');
		setQuoteUsd('');
		setUsdAmount('');
		setBankAccountId('');
		setTransactionFilesToUpload([]);
		setAddingMode(null);
	};

	const handleEditTransaction = (transaction: BalanceTransaction) => {
		setEditingTransaction(transaction);
		skipNextAutoCalcRef.current = true;
		setTransactionDate(transaction.date ? new Date(transaction.date + 'T00:00:00') : new Date());
		setTransactionAmount(
			transaction.amount
				? transaction.amount.toLocaleString('es-AR', {
						minimumFractionDigits: 0,
						maximumFractionDigits: 3,
					})
				: ''
		);
		setPaymentMethod(transaction.payment_method || '');
		setBankAccountId(transaction.bank_account_id ? String(transaction.bank_account_id) : '');
		setNotes(transaction.notes || '');
		setQuoteUsd(
			transaction.quote_usd
				? transaction.quote_usd.toLocaleString('es-AR', {
						minimumFractionDigits: 0,
						maximumFractionDigits: 3,
					})
				: ''
		);
		setUsdAmount(
			transaction.usd_amount
				? transaction.usd_amount.toLocaleString('es-AR', {
						minimumFractionDigits: 0,
						maximumFractionDigits: 3,
					})
				: ''
		);
		setTransactionFilesToUpload([]);
		setAddingMode('transaction');
	};

	const handleUpdateTransaction = async () => {
		if (!balance || !editingTransaction || isSavingTransaction) return;

		const beforeType = summary.type;

		setIsSavingTransaction(true);

		try {
			const { error } = await updateTransaction(editingTransaction.id, {
				date: format(transactionDate, 'yyyy-MM-dd'),
				amount: parseArsToNumber(transactionAmount),
				payment_method: paymentMethod || null,
				notes: notes || null,
				quote_usd: quoteUsd ? parseArsToNumber(quoteUsd) : null,
				usd_amount: usdAmount ? parseArsToNumber(usdAmount) : null,
				bank_account_id: bankAccountId ? Number(bankAccountId) : null,
			});

			if (error) {
				toast({
					variant: 'destructive',
					title: 'Error al actualizar transacción',
					description:
						translateError(error) ||
						'Hubo un problema al actualizar la transacción. Intente nuevamente.',
				});
				return;
			}

			let fileUploadError: unknown = null;
			if (transactionFilesToUpload.length > 0) {
				try {
					await uploadFilesForTransaction?.(editingTransaction.id, transactionFilesToUpload);
				} catch (uploadError) {
					fileUploadError = uploadError;
				}
			}

			toast({
				title: 'Transacción actualizada',
				description: fileUploadError
					? 'Se actualizó, pero hubo un problema al subir los archivos adjuntos.'
					: 'La transacción se ha actualizado exitosamente.',
				variant: fileUploadError ? 'destructive' : undefined,
			});

			resetTransactionForm();
			const freshTransactions = await loadTransactions();
			detectSettledTransition(beforeType, freshTransactions);
			onTransactionCreated?.();
		} catch (error) {
			toast({
				variant: 'destructive',
				title: 'Error inesperado',
				description: translateError(error) || 'Ocurrió un error inesperado. Intente nuevamente.',
			});
		} finally {
			setIsSavingTransaction(false);
		}
	};

	const totalPaid = transactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
	const totalPaidUSD = transactions.reduce((sum, t) => sum + (Number(t.usd_amount) || 0), 0);

	const summary = calculateBalanceSummary({
		budgetAmountArs: balance?.balance_amount_ars,
		budgetAmountUsd: balance?.balance_amount_usd,
		budgetInitialArs: balance?.budget?.amount_ars,
		usdCurrent: balance?.usd_current,
		totalPaidArs: totalPaid,
		totalPaidUsd: totalPaidUSD,
		isSettled: balance?.is_settled,
	});

	const work = balance?.budget?.folder_budget?.work;

	return {
		transactions,
		isLoading,
		isInitialLoading: !hasLoadedOnce,
		addingMode,
		setAddingMode,
		transactionToDelete,
		setTransactionToDelete,
		isDeleteDialogOpen,
		setIsDeleteDialogOpen,
		isEditingNotes,
		setIsEditingNotes,
		balanceNotes,
		setBalanceNotes,
		editingTransaction,
		setEditingTransaction,
		transactionFilesToUpload,
		setTransactionFilesToUpload,
		isSavingTransaction,
		isDeletingTransaction,
		transactionDate,
		setTransactionDate,
		transactionAmount,
		setTransactionAmount,
		paymentMethod,
		setPaymentMethod,
		setBankAccountId,
		bankAccountId,
		notes,
		setNotes,
		quoteUsd,
		setQuoteUsd,
		usdAmount,
		setUsdAmount,
		loadTransactions,
		handleAddTransaction,
		handleDeleteTransaction,
		handleUpdateBalanceNotes,
		resetTransactionForm,
		handleEditTransaction,
		handleUpdateTransaction,
		totalPaid,
		totalPaidUSD,
		summary,
		work,
		showSettledReminder,
		isTogglingSettled,
		dismissSettledReminder,
		handleMarkAsSettled,
		handleUnmarkAsSettled,
	};
}
