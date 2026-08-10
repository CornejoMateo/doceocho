'use client';

import { Work } from '@/lib/works/works';
import {
	getChecklistsByWorkId,
	createChecklist,
	createChecklistItems,
	deleteChecklist,
} from '@/lib/checklists/checklists';
import { Building2, Search } from 'lucide-react';
import { ChecklistModal } from '@/components/business/works/checklists/checklist-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState, useMemo, useEffect } from 'react';
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from '@/components/ui/pagination';
import { DeleteWorkDialog } from '@/components/business/works/delete-work-dialog';
import { WorkCardList } from '@/components/business/works/work-card-list';
import { paginateAndFilter } from '@/utils/pagination';
import { useWorkChecklists } from '@/hooks/clients/use-works-checklists';
import { BalanceWithBudget } from '@/lib/balances/balances';
import { useAuth } from '@/components/provider/auth-provider';

interface WorksListProps {
	works: Work[];
	balances?: BalanceWithBudget[];
	onDelete?: (workId: number) => Promise<void>;
	onWorkUpdated?: (updatedWork: Work) => void;
	onCreateWork?: () => void;
	onUpdate?: (workId: number, updates: Partial<Work>) => Promise<Work>;
	onOpenBalance?: (workId: number, balanceId: number) => void;
}

export function WorksList({
	works: initialWorks,
	balances = [],
	onDelete,
	onWorkUpdated,
	onCreateWork,
	onUpdate,
	onOpenBalance,
}: WorksListProps) {
	const [workToDelete, setWorkToDelete] = useState<{ id: number; name: string } | null>(null);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);
	const [searchTerm, setSearchTerm] = useState('');
	const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
	const [selectedWorkId, setSelectedWorkId] = useState<number | null>(null);
	const itemsPerPage = 6;
	const { user } = useAuth();

	const isAuthorized = useMemo(() => {
		return user?.role === 'Admin';
	}, [user]);

	const { workChecklists, loadingChecklists } = useWorkChecklists(initialWorks);

	const balancesByWork = useMemo(() => {
		const map: Record<number, BalanceWithBudget[]> = {};
		for (const balance of balances) {
			const workId = balance.budget?.folder_budget?.work_id;
			if (workId) {
				map[workId] = [...(map[workId] ?? []), balance];
			}
		}
		return map;
	}, [balances]);

	const handleDeleteConfirm = async () => {
		if (workToDelete) {
			await onDelete?.(workToDelete.id);
			setIsDeleteDialogOpen(false);
			setWorkToDelete(null);
		}
	};

	const handleUpdateWork = async (workId: number, updates: Partial<Work>) => {
		if (onUpdate) {
			try {
				const updatedWork = await onUpdate(workId, updates);
				if (onWorkUpdated) {
					onWorkUpdated(updatedWork);
				}
			} catch (error) {
				console.error('Error updating work:', error);
			}
		}
	};

	const {
		filteredData: filteredClients,
		paginatedData: currentItems,
		totalPages,
		totalItems,
	} = useMemo(
		() =>
			paginateAndFilter(initialWorks, searchTerm, currentPage, itemsPerPage, (work, search) => {
				// Filter by search term
				const matchesSearch =
					work.address?.toLowerCase().includes(search) ||
					work.architect?.toLowerCase().includes(search) ||
					work.status?.toLowerCase().includes(search) ||
					work.zone?.toLowerCase().includes(search) ||
					work.hood?.toLowerCase().includes(search) ||
					false;

				return matchesSearch;
			}),
		[initialWorks, currentPage, itemsPerPage, searchTerm]
	);

	useEffect(() => {
		setCurrentPage(1);
	}, [initialWorks.length, searchTerm]);

	return (
		<div className="space-y-4 max-w-3xl mx-auto w-full">
			{/* Search and Filter Bar */}
			<div className="flex flex-col sm:flex-row gap-4 mb-6">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						type="search"
						placeholder="Buscar por dirección, arquitecto, zona, barrio o estado..."
						className="pl-9 w-full"
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
					/>
				</div>
				{isAuthorized && (
					<div className="flex-shrink-0">
						{onCreateWork && (
							<Button onClick={onCreateWork} className="w-full sm:w-[140px] whitespace-nowrap h-9">
								<Building2 className="h-4 w-4 mr-1" />
								Crear Obra
							</Button>
						)}
					</div>
				)}
			</div>

			<DeleteWorkDialog
				isOpen={isDeleteDialogOpen}
				onOpenChange={setIsDeleteDialogOpen}
				onConfirm={handleDeleteConfirm}
				workName={workToDelete?.name || ''}
			/>
			{currentItems.map((work) => (
				<WorkCardList
					key={work.id}
					work={work}
					hasChecklist={!!workChecklists[work.id]}
					loadingChecklist={!!loadingChecklists[work.id]}
					balances={balancesByWork[work.id] ?? []}
					onUpdate={onUpdate ? handleUpdateWork : undefined}
					onOpenChecklist={(workId) => {
						setSelectedWorkId(workId);
						setIsChecklistModalOpen(true);
					}}
					onOpenBalance={onOpenBalance}
					onDeleteWork={
						onDelete
							? (workToDeleteCandidate) => {
									setWorkToDelete({
										id: workToDeleteCandidate.id,
										name: workToDeleteCandidate.name || '',
									});
									setIsDeleteDialogOpen(true);
								}
							: undefined
					}
				/>
			))}

			{/* Checklist Modal */}
			{selectedWorkId && (
				<ChecklistModal
					workId={selectedWorkId}
					existingChecklists={workChecklists[selectedWorkId] ? true : false}
					open={isChecklistModalOpen}
					onOpenChange={setIsChecklistModalOpen}
					onSave={async (checklist) => {
						// Get existing checklists to calculate the next index
						const { data: existingChecklists, error: fetchError } =
							await getChecklistsByWorkId(selectedWorkId);

						if (fetchError) throw fetchError;
						const existingCount = existingChecklists?.length || 0;

						const { data: newChecklist, error } = await createChecklist({
							work_id: selectedWorkId,
							name: checklist.name || `Mobiliario ${existingCount + 1}`,
							description: checklist.description || '',
							notes: '',
							width: checklist.width ?? null,
							height: checklist.height ?? null,
							depth: checklist.depth ?? null,
							type_furniture: checklist.type_furniture ?? null,
						});

						if (error) throw error;

						if (newChecklist && checklist.items.length > 0) {
							const { error: itemsError } = await createChecklistItems(
								checklist.items.map((item) => ({
									description: item.description,
									checklist_id: newChecklist.id,
								}))
							);
							if (itemsError) {
								await deleteChecklist(newChecklist.id);
								throw itemsError;
							}
						}

						// Update local state if needed
						const work = initialWorks.find((w) => w.id === selectedWorkId);
						if (work && onWorkUpdated) {
							const updatedWork = {
								...work,
								has_checklist: true,
								updated_at: new Date().toISOString(),
							};
							onWorkUpdated(updatedWork);
						}
					}}
				/>
			)}

			{/* Pagination */}
			{initialWorks.length > itemsPerPage && (
				<div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 px-2 mt-6">
					<div className="text-xs sm:text-sm text-muted-foreground">
						Mostrando {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}-
						{Math.min(currentPage * itemsPerPage, totalItems)} de {totalItems} obras
					</div>

					<Pagination className="mx-0 w-auto">
						<PaginationContent>
							<PaginationItem>
								<PaginationPrevious
									onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
									className={
										currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'
									}
								/>
							</PaginationItem>

							{Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
								let pageNum = i + 1;
								if (totalPages > 5) {
									if (currentPage <= 3) {
										pageNum = i + 1;
									} else if (currentPage >= totalPages - 2) {
										pageNum = totalPages - 4 + i;
									} else {
										pageNum = currentPage - 2 + i;
									}
								}
								return (
									<PaginationItem key={pageNum}>
										<PaginationLink
											isActive={currentPage === pageNum}
											className="cursor-pointer"
											onClick={() => setCurrentPage(pageNum)}
										>
											{pageNum}
										</PaginationLink>
									</PaginationItem>
								);
							})}

							<PaginationItem>
								<PaginationNext
									onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
									className={
										currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'
									}
								/>
							</PaginationItem>
						</PaginationContent>
					</Pagination>
				</div>
			)}
		</div>
	);
}
