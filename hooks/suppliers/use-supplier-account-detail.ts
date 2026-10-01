import { useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';
import {
	getSupplierAccountDetail,
	type SupplierAccountDetail,
} from '@/lib/suppliers/account-summary';
import { listBankAccounts, type BankAccount } from '@/lib/cash-flow/cash-flow';
import { listPaymentMethods, type PaymentMethod } from '@/lib/payment-methods/payment-methods';
import { listFilesByPurchaseSupplierIds } from '@/lib/suppliers/files-purchases-suppliers';
import {
	listFilesByPaymentSupplierIds,
	type FilePaymentSupplier,
} from '@/lib/suppliers/files-payments-suppliers';

export function useSupplierAccountDetail(supplierId: number | null, open: boolean) {
	const { toast } = useToast();

	const [detail, setDetail] = useState<SupplierAccountDetail | null>(null);
	const [loadingDetail, setLoadingDetail] = useState(false);
	const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
	const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
	const [purchaseFileCounts, setPurchaseFileCounts] = useState<Map<number, number>>(new Map());
	const [paymentFileCounts, setPaymentFileCounts] = useState<Map<number, number>>(new Map());
	const [paymentFilesByPaymentId, setPaymentFilesByPaymentId] = useState<
		Map<number, FilePaymentSupplier[]>
	>(new Map());

	const fetchRequestIdRef = useRef(0);

	const fetchDetail = async () => {
		if (!supplierId) return;
		const requestId = ++fetchRequestIdRef.current;
		setLoadingDetail(true);
		try {
			const [detailRes, bankAccountsRes, paymentMethodsRes] = await Promise.all([
				getSupplierAccountDetail(supplierId),
				listBankAccounts(),
				listPaymentMethods(),
			]);
			if (requestId !== fetchRequestIdRef.current) return;
			if (detailRes.error) throw detailRes.error;
			if (bankAccountsRes.error) throw bankAccountsRes.error;
			if (paymentMethodsRes.error) throw paymentMethodsRes.error;
			setDetail(detailRes.data);
			setBankAccounts(bankAccountsRes.data ?? []);
			setPaymentMethods(paymentMethodsRes.data ?? []);
		} catch (error) {
			if (requestId !== fetchRequestIdRef.current) return;
			toast({
				title: 'Error',
				description: translateError(error) || 'No se pudo cargar la cuenta corriente.',
				variant: 'destructive',
			});
		} finally {
			if (requestId === fetchRequestIdRef.current) setLoadingDetail(false);
		}
	};

	useEffect(() => {
		if (open && supplierId) {
			void fetchDetail();
		}
	}, [open, supplierId]);

	useEffect(() => {
		if (!detail) {
			setPurchaseFileCounts(new Map());
			setPaymentFileCounts(new Map());
			setPaymentFilesByPaymentId(new Map());
			return;
		}
		let cancelled = false;
		(async () => {
			const purchaseIds = detail.purchases.map((purchase) => purchase.id);
			const purchaseCounts = new Map<number, number>(purchaseIds.map((id) => [id, 0]));
			if (purchaseIds.length > 0) {
				const { data, error } = await listFilesByPurchaseSupplierIds(purchaseIds);
				if (!error) {
					for (const file of data ?? []) {
						purchaseCounts.set(
							file.purchase_supplier_id,
							(purchaseCounts.get(file.purchase_supplier_id) ?? 0) + 1
						);
					}
				}
			}

			const paymentIds = detail.purchases.flatMap((purchase) =>
				purchase.payments.map((payment) => payment.id)
			);
			const paymentCounts = new Map<number, number>(paymentIds.map((id) => [id, 0]));
			const paymentFiles = new Map<number, FilePaymentSupplier[]>();
			if (paymentIds.length > 0) {
				const { data, error } = await listFilesByPaymentSupplierIds(paymentIds);
				if (!error) {
					for (const id of paymentIds) paymentFiles.set(id, []);
					for (const file of data ?? []) {
						paymentCounts.set(
							file.payment_supplier_id,
							(paymentCounts.get(file.payment_supplier_id) ?? 0) + 1
						);
						paymentFiles.get(file.payment_supplier_id)?.push(file);
					}
				}
			}
			if (cancelled) return;
			setPurchaseFileCounts(purchaseCounts);
			setPaymentFileCounts(paymentCounts);
			setPaymentFilesByPaymentId(paymentFiles);
		})();
		return () => {
			cancelled = true;
		};
	}, [detail]);

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

	const invalidateAndReset = () => {
		fetchRequestIdRef.current += 1;
		setDetail(null);
	};

	const setPurchaseFileCount = (purchaseId: number, count: number) => {
		setPurchaseFileCounts((current) => new Map(current).set(purchaseId, count));
	};
	const setPaymentFileCount = (paymentId: number, count: number) => {
		setPaymentFileCounts((current) => new Map(current).set(paymentId, count));
	};

	return {
		detail,
		loadingDetail,
		bankAccounts,
		paymentMethods,
		bankAccountById,
		paymentMethodById,
		activeBankAccounts,
		activePaymentMethods,
		purchaseFileCounts,
		paymentFileCounts,
		paymentFilesByPaymentId,
		setPurchaseFileCount,
		setPaymentFileCount,
		fetchDetail,
		invalidateAndReset,
	};
}
