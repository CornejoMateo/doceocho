'use client';

import { useEffect, useMemo, useState } from 'react';
import { PaymentMethod, listPaymentMethods } from '@/lib/payment-methods/payment-methods';
import { BankAccount, listBankAccounts } from '@/lib/cash-flow/cash-flow';
import { IVA_RATES, computeIvaAndTotal } from '@/constants/cashflow/fixed-expenses';
import {
	FixedExpensePaymentWithDetails,
	deleteFixedExpensePayment,
	markFixedExpensePaid,
	unmarkFixedExpensePaid,
	updateFixedExpensePayment,
} from '@/lib/fixed-expenses/fixed-expense-payments';
import { FixedExpenseWithCategory } from '@/lib/fixed-expenses/fixed-expenses';
import { getLocalDate } from '@/utils/format-date';
import { useToast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';
import { formatCurrencyWithoutSymbol, parseArsToNumber } from '@/utils/formats-money';

export function useFixedExpensePaymentDialog(onChanged: () => Promise<unknown>) {
	const { toast } = useToast();

	const [expenseToPay, setExpenseToPay] = useState<FixedExpenseWithCategory | null>(null);
	const [paymentToEdit, setPaymentToEdit] = useState<FixedExpensePaymentWithDetails | null>(null);
	const [paymentToDelete, setPaymentToDelete] = useState<FixedExpensePaymentWithDetails | null>(
		null
	);
	const [expenseToUnmark, setExpenseToUnmark] = useState<FixedExpenseWithCategory | null>(null);
	const [deletingPayment, setDeletingPayment] = useState(false);
	const [togglingId, setTogglingId] = useState<number | null>(null);
	const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
	const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
	const [paymentMonth, setPaymentMonth] = useState('');
	const [paymentDate, setPaymentDate] = useState('');
	const [paymentNet, setPaymentNet] = useState('');
	const [paymentIvaPercent, setPaymentIvaPercent] = useState(String(IVA_RATES[0]));
	const [paymentMethodId, setPaymentMethodId] = useState('');
	const [paymentBankAccountId, setPaymentBankAccountId] = useState('none');
	const [payingSaving, setPayingSaving] = useState(false);

	const activePaymentMethods = useMemo(
		() => paymentMethods.filter((m) => m.is_active),
		[paymentMethods]
	);
	const activeBankAccounts = useMemo(() => bankAccounts.filter((b) => b.is_active), [bankAccounts]);
	const unmarking = !!expenseToUnmark && togglingId === expenseToUnmark.id;
	const paymentTotal = useMemo(
		() => computeIvaAndTotal(parseArsToNumber(paymentNet), Number(paymentIvaPercent)).totalAmount,
		[paymentNet, paymentIvaPercent]
	);

	useEffect(() => {
		if (!expenseToPay && !paymentToEdit) return;
		(async () => {
			try {
				// Fetches all accounts (not just active) so an edit can still show an account that was deactivated later.
				const [methodsRes, accountsRes] = await Promise.all([
					listPaymentMethods(),
					listBankAccounts(),
				]);
				if (methodsRes.error) throw methodsRes.error;
				if (accountsRes.error) throw accountsRes.error;
				setPaymentMethods(methodsRes.data ?? []);
				setBankAccounts(accountsRes.data ?? []);
			} catch (error) {
				toast({
					title: 'Error',
					description: translateError(error) || 'No se pudieron cargar los medios de pago.',
					variant: 'destructive',
				});
			}
		})();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [expenseToPay, paymentToEdit]);

	const openPaymentDialog = (expense: FixedExpenseWithCategory) => {
		const today = getLocalDate();
		setPaymentToEdit(null);
		setExpenseToPay(expense);
		setPaymentMonth(today.slice(0, 7));
		setPaymentDate(today);
		setPaymentNet(formatCurrencyWithoutSymbol(expense.amount));
		setPaymentIvaPercent(String(IVA_RATES[0]));
		setPaymentMethodId('');
		setPaymentBankAccountId('none');
	};

	const openEditPaymentDialog = (payment: FixedExpensePaymentWithDetails) => {
		setExpenseToPay(null);
		setPaymentToEdit(payment);
		setPaymentMonth(payment.period.slice(0, 7));
		setPaymentDate(payment.paid_date);
		setPaymentNet(formatCurrencyWithoutSymbol(payment.net_amount));
		setPaymentIvaPercent(String(payment.iva_percent));
		setPaymentMethodId(String(payment.payment_method_id));
		setPaymentBankAccountId(payment.bank_account_id ? String(payment.bank_account_id) : 'none');
	};

	const handlePayDialogOpenChange = (open: boolean) => {
		if (!open && !payingSaving) {
			setExpenseToPay(null);
			setPaymentToEdit(null);
		}
	};

	// Marking as paid registers a payment; unmarking requires confirmation (deletes it)
	const handleTogglePaid = (expense: FixedExpenseWithCategory, checked: boolean) => {
		if (checked) {
			openPaymentDialog(expense);
			return;
		}
		setExpenseToUnmark(expense);
	};

	const handleSubmitPayment = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!expenseToPay && !paymentToEdit) return;
		const parsedNet = parseArsToNumber(paymentNet);
		if (
			!paymentMonth ||
			!paymentDate ||
			!Number.isFinite(parsedNet) ||
			parsedNet < 0 ||
			!paymentMethodId
		)
			return;
		setPayingSaving(true);
		try {
			const payload = {
				paid_date: paymentDate,
				period: `${paymentMonth}-01`,
				net_amount: parsedNet,
				iva_percent: Number(paymentIvaPercent),
				payment_method_id: Number(paymentMethodId),
				bank_account_id: paymentBankAccountId === 'none' ? null : Number(paymentBankAccountId),
			};
			const { error } = paymentToEdit
				? await updateFixedExpensePayment({ payment_id: paymentToEdit.id, ...payload })
				: await markFixedExpensePaid({ fixed_expense_id: expenseToPay!.id, ...payload });
			if (error) throw error;
			toast({
				title: paymentToEdit ? 'Pago actualizado' : 'Pago registrado',
				description: paymentToEdit
					? 'El pago del costo fijo ha sido actualizado correctamente.'
					: 'El pago del costo fijo ha sido registrado correctamente.',
			});
			setExpenseToPay(null);
			setPaymentToEdit(null);
			await onChanged();
		} catch (error) {
			toast({
				title: 'Error',
				description:
					translateError(error) ||
					(paymentToEdit ? 'No se pudo actualizar el pago.' : 'No se pudo registrar el pago.'),
				variant: 'destructive',
			});
		} finally {
			setPayingSaving(false);
		}
	};

	const confirmDeletePayment = async () => {
		if (!paymentToDelete) return;
		setDeletingPayment(true);
		try {
			const { error } = await deleteFixedExpensePayment(paymentToDelete.id);
			if (error) throw error;
			toast({
				title: 'Pago eliminado',
				description: 'El pago del costo fijo ha sido eliminado correctamente.',
			});
			setPaymentToDelete(null);
			await onChanged();
		} catch (error) {
			toast({
				title: 'Error',
				description: translateError(error) || 'No se pudo eliminar el pago.',
				variant: 'destructive',
			});
		} finally {
			setDeletingPayment(false);
		}
	};

	const confirmUnmark = async () => {
		if (!expenseToUnmark) return;
		setTogglingId(expenseToUnmark.id);
		try {
			const { error } = await unmarkFixedExpensePaid(expenseToUnmark.id);
			if (error) throw error;
			toast({
				title: 'Pago eliminado',
				description: 'El pago del mes actual fue eliminado y el costo fijo quedó pendiente.',
			});
			await onChanged();
			setExpenseToUnmark(null);
		} catch (error) {
			toast({
				title: 'Error',
				description: translateError(error) || 'No se pudo desmarcar el costo fijo.',
				variant: 'destructive',
			});
		} finally {
			setTogglingId(null);
		}
	};

	return {
		expenseToPay,
		paymentToEdit,
		paymentToDelete,
		setPaymentToDelete,
		expenseToUnmark,
		setExpenseToUnmark,
		deletingPayment,
		togglingId,
		bankAccounts,
		activeBankAccounts,
		activePaymentMethods,
		paymentMonth,
		setPaymentMonth,
		paymentDate,
		setPaymentDate,
		paymentNet,
		setPaymentNet,
		paymentIvaPercent,
		setPaymentIvaPercent,
		paymentMethodId,
		setPaymentMethodId,
		paymentBankAccountId,
		setPaymentBankAccountId,
		payingSaving,
		paymentTotal,
		unmarking,
		openEditPaymentDialog,
		handlePayDialogOpenChange,
		handleTogglePaid,
		handleSubmitPayment,
		confirmDeletePayment,
		confirmUnmark,
	};
}
