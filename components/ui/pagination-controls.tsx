'use client';

import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from '@/components/ui/pagination';

const MAX_VISIBLE_PAGES = 5;

interface PaginationControlsProps {
	currentPage: number;
	totalPages: number;
	totalItems: number;
	itemsPerPage: number;
	onPageChange: (page: number) => void;
	/** Plural noun shown in the summary, e.g. "empleados". */
	itemLabel?: string;
}

function getVisiblePages(currentPage: number, totalPages: number): number[] {
	const visibleCount = Math.min(MAX_VISIBLE_PAGES, totalPages);

	return Array.from({ length: visibleCount }, (_, index) => {
		if (totalPages <= MAX_VISIBLE_PAGES) return index + 1;
		if (currentPage <= 3) return index + 1;
		if (currentPage >= totalPages - 2) return totalPages - MAX_VISIBLE_PAGES + 1 + index;

		return currentPage - 2 + index;
	});
}

export function PaginationControls({
	currentPage,
	totalPages,
	totalItems,
	itemsPerPage,
	onPageChange,
	itemLabel = 'resultados',
}: PaginationControlsProps) {
	if (totalItems <= itemsPerPage) return null;

	const firstItem = Math.min((currentPage - 1) * itemsPerPage + 1, totalItems);
	const lastItem = Math.min(currentPage * itemsPerPage, totalItems);

	return (
		<div className="flex flex-col gap-2 px-2 mt-6 sm:flex-row sm:items-center sm:justify-between">
			<div className="text-sm text-muted-foreground">
				Mostrando {firstItem}-{lastItem} de {totalItems} {itemLabel}
			</div>

			<Pagination className="mx-0 w-auto">
				<PaginationContent>
					<PaginationItem>
						<PaginationPrevious
							onClick={() => onPageChange(Math.max(1, currentPage - 1))}
							className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
						/>
					</PaginationItem>

					{getVisiblePages(currentPage, totalPages).map((page) => (
						<PaginationItem key={page}>
							<PaginationLink
								isActive={currentPage === page}
								className="cursor-pointer"
								onClick={() => onPageChange(page)}
							>
								{page}
							</PaginationLink>
						</PaginationItem>
					))}

					<PaginationItem>
						<PaginationNext
							onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
							className={
								currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'
							}
						/>
					</PaginationItem>
				</PaginationContent>
			</Pagination>
		</div>
	);
}
