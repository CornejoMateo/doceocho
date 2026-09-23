'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/components/provider/auth-provider';
import { getSearchProviders } from '@/lib/search/registry';
import { MIN_SEARCH_LENGTH, SEARCH_DEBOUNCE_MS } from '@/constants/search/search';
import type { SearchGroup } from '@/lib/search/types';

export function useGlobalSearch() {
	const { user } = useAuth();

	const [term, setTerm] = useState('');
	const [groups, setGroups] = useState<SearchGroup[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [hasError, setHasError] = useState(false);

	const abortRef = useRef<AbortController | null>(null);

	const providers = useMemo(() => getSearchProviders(user?.role), [user?.role]);

	const reset = useCallback(() => {
		abortRef.current?.abort();
		abortRef.current = null;
		setTerm('');
		setGroups([]);
		setIsSearching(false);
		setHasError(false);
	}, []);

	useEffect(() => {
		const trimmed = term.trim();

		// Cancel whatever the previous keystroke started.
		abortRef.current?.abort();

		if (trimmed.length < MIN_SEARCH_LENGTH) {
			abortRef.current = null;
			setGroups([]);
			setIsSearching(false);
			setHasError(false);
			return;
		}

		const controller = new AbortController();
		abortRef.current = controller;

		setIsSearching(true);
		setHasError(false);

		const timeout = setTimeout(async () => {
			// Providers run together: one slow domain does not hold up the rest.
			const settled = await Promise.allSettled(
				providers.map(async (provider) => ({
					providerId: provider.id,
					label: provider.label,
					results: await provider.search(trimmed, controller.signal),
				}))
			);

			if (controller.signal.aborted) return;

			const fulfilled = settled.filter(
				(entry): entry is PromiseFulfilledResult<SearchGroup> => entry.status === 'fulfilled'
			);

			const failedCount = settled.length - fulfilled.length;

			if (failedCount > 0) {
				console.error(
					'[search] %d of %d providers failed',
					failedCount,
					settled.length,
					settled.filter((entry) => entry.status === 'rejected')
				);
			}

			setGroups(fulfilled.map((entry) => entry.value).filter((group) => group.results.length > 0));
			// Only a total failure is worth telling the user about.
			setHasError(failedCount > 0 && fulfilled.length === 0);
			setIsSearching(false);
		}, SEARCH_DEBOUNCE_MS);

		return () => {
			clearTimeout(timeout);
			controller.abort();
		};
	}, [term, providers]);

	useEffect(() => {
		return () => abortRef.current?.abort();
	}, []);

	const isTermTooShort = term.trim().length > 0 && term.trim().length < MIN_SEARCH_LENGTH;
	const hasResults = groups.length > 0;

	return {
		term,
		setTerm,
		groups,
		isSearching,
		hasError,
		hasResults,
		isTermTooShort,
		reset,
	};
}
