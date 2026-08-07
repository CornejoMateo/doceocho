'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Work } from '@/lib/works/works';
import {
	getChecklistsByWorkId,
	createChecklist,
	createChecklistItems,
	deleteChecklist,
} from '@/lib/checklists/checklists';
import {
	MapPin,
	Calendar,
	Building2,
	Trash2,
	ListChecks,
	ChevronDown,
	Search,
	CheckSquare,
	BrickWall,
	Wallet,
} from 'lucide-react';
import { ChecklistModal } from '@/components/business/works/checklists/checklist-modal';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
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
import { EditableField } from '@/components/business/works/editable-field';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { paginateAndFilter } from '@/utils/pagination';
import { useWorkChecklists } from '@/hooks/clients/use-works-checklists';
import { statusConfig } from '@/constants/type-config';
import { BalanceWithBudget } from '@/lib/balances/balances';
import { formatCurrency } from '@/utils/formats-money';

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
	const [workToDelete, setWorkToDelete] = useState<{ id: number; address: string } | null>(null);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);
	const [searchTerm, setSearchTerm] = useState('');
	const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
	const [selectedWorkId, setSelectedWorkId] = useState<number | null>(null);
	const [balancePopoverWorkId, setBalancePopoverWorkId] = useState<number | null>(null);
	const itemsPerPage = 6;

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
				<div className="flex-shrink-0">
					{onCreateWork && (
						<Button onClick={onCreateWork} className="w-full sm:w-[140px] whitespace-nowrap h-9">
							<Building2 className="h-4 w-4 mr-1" />
							Crear Obra
						</Button>
					)}
				</div>
			</div>

			<DeleteWorkDialog
				isOpen={isDeleteDialogOpen}
				onOpenChange={setIsDeleteDialogOpen}
				onConfirm={handleDeleteConfirm}
				workAddress={workToDelete?.address || ''}
			/>
			{currentItems.map((work) => (
				<Card key={work.id} className="hover:shadow-md transition-shadow">
					<CardHeader className="pb-2 sm:pb-3">
						<div className="flex flex-col gap-2">
							<div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
								<div className="flex-1 min-w-0">
									<EditableField
										value={work.name || ''}
										onSave={async (newValue) => {
											await handleUpdateWork(work.id, { name: newValue });
										}}
										className="text-base mt-2 sm:text-lg font-semibold truncate"
									/>
									<EditableField
										value={work.address || ''}
										onSave={async (newValue) => {
											await handleUpdateWork(work.id, { address: newValue });
										}}
										label="Dirección"
										className="text-xs mt-2 sm:text-sm text-muted-foreground truncate"
									/>
									<EditableField
										value={work.locality || ''}
										onSave={async (newValue) => {
											await handleUpdateWork(work.id, { locality: newValue });
										}}
										label="Localidad"
										className="text-xs mt-2 sm:text-sm text-muted-foreground truncate"
									/>
									<EditableField
										value={work.zone || ''}
										onSave={async (newValue) => {
											await handleUpdateWork(work.id, { zone: newValue });
										}}
										formatDisplay={(value) => value || 'Zona no especificada'}
										label="Zona"
										className="text-xs mt-2 sm:text-sm text-muted-foreground truncate"
									/>
									<EditableField
										value={work.hood || ''}
										onSave={async (newValue) => {
											await handleUpdateWork(work.id, { hood: newValue });
										}}
										formatDisplay={(value) => value || 'Barrio no especificado'}
										label="Barrio"
										className="text-xs mt-2 sm:text-sm text-muted-foreground truncate"
									/>
								</div>
								<div className="flex flex-row sm:flex-row gap-2 sm:gap-3 items-center justify-between sm:justify-end">
									<div className="flex items-center justify-end gap-2">
										<div className="flex items-center gap-1 text-[11px] sm:text-sm text-muted-foreground group">
											<select
												value={work.status || 'pending'}
												onChange={async (e) => {
													await handleUpdateWork(work.id, { status: e.target.value });
												}}
												className="bg-transparent border-none focus:ring-0 focus:ring-offset-0 p-0.5 pr-5 sm:p-1 sm:pr-6 appearance-none focus:outline-none cursor-pointer hover:bg-muted rounded-md text-[11px] sm:text-sm"
											>
												{statusConfig.map((option) => (
													<option key={option.value} value={option.value}>
														{option.label}
													</option>
												))}
											</select>
											<ChevronDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 -ml-4 sm:-ml-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
										</div>
										<div className="flex items-center gap-1">
											{loadingChecklists[work.id] ? (
												<div className="h-4 w-4 rounded-full border-2 border-muted-foreground/20 border-t-muted-foreground animate-spin" />
											) : workChecklists[work.id] ? (
												<div
													className="flex items-center gap-1 text-green-600"
													title="Checklists creadas"
												>
													<CheckSquare className="h-4 w-4" />
												</div>
											) : (
												<div
													className="flex items-center gap-1 text-gray-400"
													title="Sin checklist"
												>
													<CheckSquare className="h-4 w-4" />
												</div>
											)}
										</div>
									</div>
									{onDelete && (
										<Button
											variant="ghost"
											size="icon"
											className="h-7 w-7 sm:h-8 sm:w-8"
											onClick={(e) => {
												e.stopPropagation();
												setWorkToDelete({ id: work.id, address: work.address || '' });
												setIsDeleteDialogOpen(true);
											}}
										>
											<Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
										</Button>
									)}
								</div>
							</div>
						</div>
					</CardHeader>
					<CardContent className="pt-3 sm:pt-4">
						<div className="flex flex-col gap-2 sm:grid sm:grid-cols-2 sm:gap-4">
							<div className="flex items-center gap-2 w-full">
								<Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
								<EditableField
									value={work.architect || ''}
									onSave={async (newValue) => {
										await handleUpdateWork(work.id, { architect: newValue });
									}}
								/>
							</div>
							<div className="flex items-center gap-2 w-full">
								<BrickWall className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
								<EditableField
									value={work.furniture || ''}
									onSave={async (newValue) => {
										await handleUpdateWork(work.id, { furniture: newValue });
									}}
								/>
							</div>
							<div className="flex items-center gap-2 w-full">
								<MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
								<EditableField
									value={work.locality || ''}
									onSave={async (newValue) => {
										await handleUpdateWork(work.id, { locality: newValue });
									}}
								/>
							</div>
							<div className="flex items-center gap-2 w-full">
								<Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
								<span className="truncate">
									{work.created_at
										? format(new Date(work.created_at), 'PPP', { locale: es })
										: 'Sin fecha'}
								</span>
							</div>
							<div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-start sm:justify-between w-full sm:-mx-3 sm:px-3 pb-1 sm:col-span-2 gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => {
										setSelectedWorkId(work.id);
										setIsChecklistModalOpen(true);
									}}
									className="w-full sm:w-auto"
								>
									<ListChecks className="h-4 w-4 mr-2" />
									{workChecklists[work.id] ? 'Agregar Checklists' : 'Crear Checklists'}
								</Button>
								{onOpenBalance && (
									<Popover
										open={balancePopoverWorkId === work.id}
										onOpenChange={(open) => setBalancePopoverWorkId(open ? work.id : null)}
									>
										<PopoverTrigger asChild>
											<Button variant="outline" size="sm" className="w-full sm:w-auto">
												<Wallet className="h-4 w-4 mr-2" />
												Saldos
											</Button>
										</PopoverTrigger>
										<PopoverContent align="end" className="p-1 w-72">
											<div className="px-2 py-2 text-xs font-medium text-muted-foreground">
												Saldos de la obra
											</div>
											{(balancesByWork[work.id] ?? []).length === 0 ? (
												<div className="px-2 py-3 text-sm text-muted-foreground text-center">
													No hay saldos asociados
												</div>
											) : (
												<div className="max-h-64 overflow-y-auto">
													{(balancesByWork[work.id] ?? []).map((balance) => {
														const budget = balance.budget;
														const label = budget
															? [budget.number, budget.type].filter(Boolean).join(' · ')
															: 'Saldo sin presupuesto';
														return (
															<button
																key={balance.id}
																type="button"
																onClick={() => {
																	onOpenBalance(work.id, balance.id);
																	setBalancePopoverWorkId(null);
																}}
																className="w-full flex items-center justify-between gap-2 px-2 py-2 rounded-md text-left text-sm hover:bg-muted cursor-pointer"
															>
																<span className="truncate">{label}</span>
																<span className="text-xs text-muted-foreground whitespace-nowrap">
																	{formatCurrency(budget?.amount_ars ?? 0)}
																</span>
															</button>
														);
													})}
												</div>
											)}
										</PopoverContent>
									</Popover>
								)}
							</div>
						</div>
					</CardContent>
				</Card>
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
