import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';
import {
	getSupplierAccountTotals,
	type SupplierAccountTotals,
} from '@/lib/suppliers/account-summary';

export function useSupplierAccountTotals(supplierId: number | null, open: boolean) {
	const { toast } = useToast();
	const [totals, setTotals] = useState<SupplierAccountTotals | null>(null);
	const [loadingTotals, setLoadingTotals] = useState(false);
	const requestIdRef = useRef(0);

	const fetchTotals = async () => {
		if (!supplierId) return;
		const requestId = ++requestIdRef.current;
		setLoadingTotals(true);
		const { data, error } = await getSupplierAccountTotals(supplierId);
		if (requestId !== requestIdRef.current) return;
		if (error) {
			toast({
				title: 'Error',
				description: translateError(error) || 'No se pudieron cargar los totales de la cuenta.',
				variant: 'destructive',
			});
			setLoadingTotals(false);
			return;
		}
		setTotals(data);
		setLoadingTotals(false);
	};

	useEffect(() => {
		if (open && supplierId) void fetchTotals();
	}, [open, supplierId]);

	const invalidateAndReset = () => {
		requestIdRef.current += 1;
		setTotals(null);
		setLoadingTotals(false);
	};

	return { totals, loadingTotals, fetchTotals, invalidateAndReset };
}
