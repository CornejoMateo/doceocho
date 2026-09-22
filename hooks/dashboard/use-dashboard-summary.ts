'use client';

import { useCallback, useEffect, useState } from 'react';
import { EMPTY_PENDING_ACTIONS, getPendingActions } from '@/lib/dashboard/pending-actions';
import { getReceivables } from '@/lib/dashboard/receivables';
import type { PendingActions } from '@/lib/dashboard/pending-actions';
import { EMPTY_RECEIVABLES, type Receivables } from '@/helpers/dashboard/receivables';

type DashboardSummary = {
	pending: PendingActions;
	receivables: Receivables;
	isLoading: boolean;
	/** True only when nothing at all could be read. */
	hasError: boolean;
	refresh: () => void;
};

/**
 * Feeds the top of the panel. The two halves load independently so a failure
 * on one side still leaves the other visible.
 */
export function useDashboardSummary(): DashboardSummary {
	const [pending, setPending] = useState<PendingActions>(EMPTY_PENDING_ACTIONS);
	const [receivables, setReceivables] = useState<Receivables>(EMPTY_RECEIVABLES);
	const [isLoading, setIsLoading] = useState(true);
	const [hasError, setHasError] = useState(false);

	const load = useCallback(async () => {
		setIsLoading(true);
		setHasError(false);

		const [pendingResult, receivablesResult] = await Promise.allSettled([
			getPendingActions(),
			getReceivables(),
		]);

		if (pendingResult.status === 'fulfilled') {
			setPending(pendingResult.value);
		} else {
			console.error('[dashboard] Could not read pending actions:', pendingResult.reason);
		}

		if (receivablesResult.status === 'fulfilled') {
			setReceivables(receivablesResult.value);
		} else {
			console.error('[dashboard] Could not read receivables:', receivablesResult.reason);
		}

		setHasError(pendingResult.status === 'rejected' && receivablesResult.status === 'rejected');
		setIsLoading(false);
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	return { pending, receivables, isLoading, hasError, refresh: load };
}
