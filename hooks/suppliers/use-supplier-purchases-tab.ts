import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';
import {
	listSupplierPurchasesPage,
	type PurchaseSupplierWithBalance,
	type SupplierPurchaseStatus,
} from '@/lib/suppliers/purchases-suppliers';
import { listFilesByPurchaseSupplierIds } from '@/lib/suppliers/files-purchases-suppliers';

const PAGE_SIZE = 20;

interface UseSupplierPurchasesTabArgs {
	supplierId: number | null;
	status: SupplierPurchaseStatus;
	from: string;
	to: string;
	isCurrentTab: boolean;
}

export function useSupplierPurchasesTab({
	supplierId,
	status,
	from,
	to,
	isCurrentTab,
}: UseSupplierPurchasesTabArgs) {
	const { toast } = useToast();
	const [purchases, setPurchases] = useState<PurchaseSupplierWithBalance[]>([]);
	const [totalCount, setTotalCount] = useState(0);
	const [loading, setLoading] = useState(false);
	const [loadingMore, setLoadingMore] = useState(false);
	const [error, setError] = useState<any>(null);
	const [fileCounts, setFileCounts] = useState<Map<number, number>>(new Map());
	const [staleTick, setStaleTick] = useState(0);

	const loadedOnceRef = useRef(false);
	const staleRef = useRef(true);
	const offsetRef = useRef(0);
	const requestIdRef = useRef(0);
	const filtersRef = useRef({ from, to });

	const loadFileCounts = async (ids: number[]) => {
		if (ids.length === 0) return;
		const { data, error: filesError } = await listFilesByPurchaseSupplierIds(ids);
		if (filesError) return;
		setFileCounts((current) => {
			const next = new Map(current);
			for (const id of ids) next.set(id, 0);
			for (const file of data ?? []) {
				next.set(file.purchase_supplier_id, (next.get(file.purchase_supplier_id) ?? 0) + 1);
			}
			return next;
		});
	};

	const fetchPage = async (offset: number, replace: boolean) => {
		if (!supplierId) return;
		const requestId = ++requestIdRef.current;
		if (replace) setLoading(true);
		else setLoadingMore(true);
		setError(null);
		const { data, error: fetchError } = await listSupplierPurchasesPage({
			supplierId,
			status,
			from: from || null,
			to: to || null,
			limit: PAGE_SIZE,
			offset,
		});
		if (requestId !== requestIdRef.current) return;
		if (fetchError) {
			setError(fetchError);
			toast({
				title: 'Error',
				description: translateError(fetchError) || 'No se pudieron cargar las compras.',
				variant: 'destructive',
			});
			setLoading(false);
			setLoadingMore(false);
			return;
		}
		setPurchases((current) => {
			if (replace) return data!.purchases;
			const existingIds = new Set(current.map((purchase) => purchase.id));
			return [...current, ...data!.purchases.filter((purchase) => !existingIds.has(purchase.id))];
		});
		setTotalCount(data!.totalCount);
		offsetRef.current = offset + data!.purchases.length;
		loadedOnceRef.current = true;
		staleRef.current = false;
		setLoading(false);
		setLoadingMore(false);
		void loadFileCounts(data!.purchases.map((purchase) => purchase.id));
	};

	useEffect(() => {
		const filtersChanged = filtersRef.current.from !== from || filtersRef.current.to !== to;
		filtersRef.current = { from, to };
		if (filtersChanged) {
			offsetRef.current = 0;
			if (isCurrentTab) {
				void fetchPage(0, true);
			} else {
				loadedOnceRef.current = false;
				staleRef.current = true;
			}
			return;
		}
		if (isCurrentTab && (!loadedOnceRef.current || staleRef.current)) {
			void fetchPage(0, true);
		}
	}, [isCurrentTab, from, to, supplierId, status, staleTick]);

	const loadMore = () => void fetchPage(offsetRef.current, false);
	const refetchFirstPage = () => fetchPage(0, true);
	const invalidate = () => {
		loadedOnceRef.current = false;
		staleRef.current = true;
		setStaleTick((tick) => tick + 1);
	};
	const reset = () => {
		requestIdRef.current += 1;
		setPurchases([]);
		setTotalCount(0);
		setFileCounts(new Map());
		setLoading(false);
		setLoadingMore(false);
		setError(null);
		loadedOnceRef.current = false;
		staleRef.current = true;
		offsetRef.current = 0;
	};
	const setFileCount = (purchaseId: number, count: number) => {
		setFileCounts((current) => new Map(current).set(purchaseId, count));
	};

	return {
		purchases,
		totalCount,
		loading,
		loadingMore,
		error,
		hasMore: purchases.length < totalCount,
		fileCounts,
		loadMore,
		refetchFirstPage,
		invalidate,
		reset,
		setFileCount,
	};
}
