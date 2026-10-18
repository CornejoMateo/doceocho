import { useEffect, useState } from 'react';
import { paginateAndFilter } from '@/utils/pagination';

// Client-side pagination over an already-filtered list. resetKey should change whenever
// filters/search/year change, so the page resets to 1; CRUD refetches don't change it, so a
// delete/edit that empties the current page just clamps via paginateAndFilter's safePage.
export function usePaginatedRows<T>(items: T[], pageSize: number, resetKey: string) {
	const [page, setPage] = useState(1);

	useEffect(() => {
		setPage(1);
	}, [resetKey]);

	const { paginatedData, totalPages, totalItems } = paginateAndFilter(
		items,
		'',
		page,
		pageSize,
		() => true
	);
	const currentPage = Math.min(Math.max(page, 1), totalPages || 1);

	return { paginatedData, currentPage, totalPages, totalItems, setPage };
}
