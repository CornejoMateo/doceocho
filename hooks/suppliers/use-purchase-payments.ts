import { useRef, useState } from 'react';
import { listPaymentsByExpenseIds, type PaymentWithDetails } from '@/lib/payments/payments';
import { listFilesByPaymentIds, type FilePayment } from '@/lib/payments/files-payments';

/** Lazily loads a purchase's payments (and their file counts) on expand. */
export function usePurchasePayments() {
	const [paymentsByPurchaseId, setPaymentsByPurchaseId] = useState<
		Map<number, PaymentWithDetails[]>
	>(new Map());
	const [loadingPurchaseIds, setLoadingPurchaseIds] = useState<Set<number>>(new Set());
	const [errorByPurchaseId, setErrorByPurchaseId] = useState<Map<number, any>>(new Map());
	const [paymentFileCounts, setPaymentFileCounts] = useState<Map<number, number>>(new Map());
	const [paymentFilesByPaymentId, setPaymentFilesByPaymentId] = useState<
		Map<number, FilePayment[]>
	>(new Map());
	const requestIdByPurchase = useRef<Map<number, number>>(new Map());

	const loadPayments = async (purchaseId: number) => {
		const requestId = (requestIdByPurchase.current.get(purchaseId) ?? 0) + 1;
		requestIdByPurchase.current.set(purchaseId, requestId);
		const isCurrent = () => requestIdByPurchase.current.get(purchaseId) === requestId;

		setLoadingPurchaseIds((current) => new Set(current).add(purchaseId));
		setErrorByPurchaseId((current) => {
			const next = new Map(current);
			next.delete(purchaseId);
			return next;
		});

		const { data, error } = await listPaymentsByExpenseIds([purchaseId]);
		if (!isCurrent()) return;
		if (error) {
			setErrorByPurchaseId((current) => new Map(current).set(purchaseId, error));
			setLoadingPurchaseIds((current) => {
				const next = new Set(current);
				next.delete(purchaseId);
				return next;
			});
			return;
		}

		const payments = data ?? [];
		setPaymentsByPurchaseId((current) => new Map(current).set(purchaseId, payments));
		setLoadingPurchaseIds((current) => {
			const next = new Set(current);
			next.delete(purchaseId);
			return next;
		});

		const paymentIds = payments.map((payment) => payment.id);
		if (paymentIds.length === 0) return;
		const filesRes = await listFilesByPaymentIds(paymentIds);
		if (!isCurrent() || filesRes.error) return;
		const counts = new Map<number, number>(paymentIds.map((id) => [id, 0]));
		const filesByPayment = new Map<number, FilePayment[]>(paymentIds.map((id) => [id, []]));
		for (const file of filesRes.data ?? []) {
			counts.set(file.payment_id, (counts.get(file.payment_id) ?? 0) + 1);
			filesByPayment.get(file.payment_id)?.push(file);
		}
		setPaymentFileCounts((current) => new Map([...current, ...counts]));
		setPaymentFilesByPaymentId((current) => new Map([...current, ...filesByPayment]));
	};

	const ensureLoaded = (purchaseId: number) => {
		if (!paymentsByPurchaseId.has(purchaseId)) void loadPayments(purchaseId);
	};

	const dropPurchase = (purchaseId: number) => {
		setPaymentsByPurchaseId((current) => {
			const next = new Map(current);
			next.delete(purchaseId);
			return next;
		});
		setErrorByPurchaseId((current) => {
			const next = new Map(current);
			next.delete(purchaseId);
			return next;
		});
	};

	const setPaymentFileCount = (paymentId: number, count: number) => {
		setPaymentFileCounts((current) => new Map(current).set(paymentId, count));
	};

	const resetAll = () => {
		requestIdByPurchase.current = new Map();
		setPaymentsByPurchaseId(new Map());
		setLoadingPurchaseIds(new Set());
		setErrorByPurchaseId(new Map());
		setPaymentFileCounts(new Map());
		setPaymentFilesByPaymentId(new Map());
	};

	return {
		paymentsByPurchaseId,
		loadingPurchaseIds,
		errorByPurchaseId,
		paymentFileCounts,
		paymentFilesByPaymentId,
		loadPayments,
		ensureLoaded,
		dropPurchase,
		setPaymentFileCount,
		resetAll,
	};
}
