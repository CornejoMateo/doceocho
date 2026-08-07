import { useEffect, useRef } from 'react';
import { BalanceWithBudget, getBalancesByClientId } from '@/lib/balances/balances';
import { useOptimizedRealtime } from '@/hooks/use-optimized-realtime';

export function useClientBalances(clientId?: number) {
	const {
		data: balances,
		loading: isLoading,
		refresh,
		invalidateCache,
	} = useOptimizedRealtime<BalanceWithBudget>(
		'balances',
		async () => {
			if (!clientId) return [];
			const { data, error } = await getBalancesByClientId(clientId);
			if (error) throw error;
			return data ?? [];
		},
		clientId ? `balances_${clientId}` : undefined
	);

	const previousClientId = useRef(clientId);

	useEffect(() => {
		const clientChanged = previousClientId.current !== clientId;
		previousClientId.current = clientId;

		if (clientChanged && clientId) {
			invalidateCache();
		}
	}, [clientId, invalidateCache]);

	return { balances, isLoading, refresh };
}
