import { useEffect, useMemo, useState } from 'react';
import { listBankAccounts, type BankAccount } from '@/lib/cash-flow/cash-flow';
import { listPaymentMethods, type PaymentMethod } from '@/lib/payment-methods/payment-methods';
import { listCategories, type CashFlowCategory } from '@/lib/categories/categories';
import { listWorks, type Work } from '@/lib/works/works';
import { listVoucherTypes, type VoucherType } from '@/lib/voucher-types/voucher-types';

// Loaded once per dialog open; mutations don't need fresh bank accounts/methods/categories/works.
export function useSupplierPaymentOptions(open: boolean) {
	const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
	const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
	const [expenseCategories, setExpenseCategories] = useState<CashFlowCategory[]>([]);
	const [paymentCategories, setPaymentCategories] = useState<CashFlowCategory[]>([]);
	const [works, setWorks] = useState<Work[]>([]);
	const [voucherTypes, setVoucherTypes] = useState<VoucherType[]>([]);

	useEffect(() => {
		if (!open) return;
		let cancelled = false;
		(async () => {
			const [
				bankAccountsRes,
				paymentMethodsRes,
				expenseCategoriesRes,
				paymentCategoriesRes,
				worksRes,
				voucherTypesRes,
			] = await Promise.all([
				listBankAccounts(),
				listPaymentMethods(),
				listCategories('expense'),
				listCategories('payment'),
				listWorks(),
				listVoucherTypes(),
			]);
			if (cancelled) return;
			if (!bankAccountsRes.error) setBankAccounts(bankAccountsRes.data ?? []);
			if (!paymentMethodsRes.error) setPaymentMethods(paymentMethodsRes.data ?? []);
			if (!expenseCategoriesRes.error) setExpenseCategories(expenseCategoriesRes.data ?? []);
			if (!paymentCategoriesRes.error) setPaymentCategories(paymentCategoriesRes.data ?? []);
			if (!worksRes.error) setWorks(worksRes.data ?? []);
			if (!voucherTypesRes.error) setVoucherTypes(voucherTypesRes.data ?? []);
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
	const paymentCategoryById = useMemo(
		() => new Map(paymentCategories.map((category) => [category.id, category])),
		[paymentCategories]
	);
	const activeBankAccounts = useMemo(
		() => bankAccounts.filter((account) => account.is_active),
		[bankAccounts]
	);
	const activePaymentMethods = useMemo(
		() => paymentMethods.filter((method) => method.is_active),
		[paymentMethods]
	);
	const activeExpenseCategories = useMemo(
		() => expenseCategories.filter((category) => category.is_active),
		[expenseCategories]
	);
	const activePaymentCategories = useMemo(
		() => paymentCategories.filter((category) => category.is_active),
		[paymentCategories]
	);
	const activeVoucherTypes = useMemo(
		() => voucherTypes.filter((voucherType) => voucherType.is_active),
		[voucherTypes]
	);

	return {
		bankAccountById,
		paymentMethodById,
		paymentCategoryById,
		bankAccounts,
		activeBankAccounts,
		paymentMethods,
		activePaymentMethods,
		expenseCategories,
		activeExpenseCategories,
		paymentCategories,
		activePaymentCategories,
		works,
		voucherTypes,
		activeVoucherTypes,
	};
}
