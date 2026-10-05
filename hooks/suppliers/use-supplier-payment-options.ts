import { useEffect, useMemo, useState } from 'react';
import { listBankAccounts, type BankAccount } from '@/lib/cash-flow/cash-flow';
import { listPaymentMethods, type PaymentMethod } from '@/lib/payment-methods/payment-methods';

// Loaded once per dialog open; mutations don't need fresh bank accounts/methods.
export function useSupplierPaymentOptions(open: boolean) {
	const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
	const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

	useEffect(() => {
		if (!open) return;
		let cancelled = false;
		(async () => {
			const [bankAccountsRes, paymentMethodsRes] = await Promise.all([
				listBankAccounts(),
				listPaymentMethods(),
			]);
			if (cancelled) return;
			if (!bankAccountsRes.error) setBankAccounts(bankAccountsRes.data ?? []);
			if (!paymentMethodsRes.error) setPaymentMethods(paymentMethodsRes.data ?? []);
		})();
		return () => {
			cancelled = true;
		};
	}, [open]);

	const bankAccountById = useMemo(
		() => new Map(bankAccounts.map((account) => [account.id, account])),
		[bankAccounts]
	);
	const paymentMethodById = useMemo(
		() => new Map(paymentMethods.map((method) => [method.id, method])),
		[paymentMethods]
	);
	const activeBankAccounts = useMemo(
		() => bankAccounts.filter((account) => account.is_active),
		[bankAccounts]
	);
	const activePaymentMethods = useMemo(
		() => paymentMethods.filter((method) => method.is_active),
		[paymentMethods]
	);

	return { bankAccountById, paymentMethodById, activeBankAccounts, activePaymentMethods };
}
