'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, Settings2 } from 'lucide-react';
import { ChecklistModal } from '@/components/business/works/checklists/checklist-modal';
import { ItemsPredefinedDialog } from '@/components/business/works/checklists/items-predefined-dialog';
import {
	createChecklist,
	createChecklistItems,
	getChecklistsByWorkId,
} from '@/lib/checklists/checklists';
import { listItemsPredefined } from '@/lib/checklists/items-predefined';
import { type ItemsPredefined } from '@/lib/checklists/items-predefined';
import { listMaterials } from '@/lib/checklists/materials';
import { type Material } from '@/lib/checklists/materials';
import { updateWorkGeneralNote } from '@/lib/works/works';
import { type StatusFilter } from '@/constants/type-config';
import { EmailNotificationModal } from '@/components/ui/email-notification-modal';
import { WhatsAppNotificationModal } from '@/components/ui/whatsapp-notification-modal';
import { useAuth } from '@/components/provider/auth-provider';
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
	PaginationEllipsis,
} from '@/components/ui/pagination';
import { useWorksWithProgress } from '@/hooks/clients/use-works-with-progress';
import { paginateAndFilter } from '@/utils/pagination';
import { useNotifications } from '@/hooks/clients/use-notifications';
import { StatsCardsWorks } from '@/components/business/works/stats-cards-works';
import { useChecklistModal } from '@/hooks/clients/use-checklist-modal';
import { WorkCard } from '@/components/business/works/work-card';
import { translateError } from '@/lib/error-translator';

export function WorksOpenings() {
	const [searchQuery, setSearchQuery] = useState('');
	const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;

	const { user } = useAuth();
	const { works, loading, reload } = useWorksWithProgress();

	const isAdmin = useMemo(() => {
		return user?.role === 'Admin';
	}, [user?.role]);

	const { filteredData, paginatedData, totalPages } = paginateAndFilter(
		works,
		searchQuery,
		currentPage,
		itemsPerPage,
		(item, search) => {
			const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

			const matchesSearch =
				!search ||
				item.address?.toLowerCase().includes(search) ||
				item.client_name?.toLowerCase().includes(search) ||
				item.client_last_name?.toLowerCase().includes(search) ||
				false;

			return matchesStatus && matchesSearch;
		}
	);

	const stats = useMemo(() => {
		return {
			pendingCount: works.filter((w) => w.status === 'pending').length,
			inProgressCount: works.filter((w) => w.status === 'in_progress').length,
			completedCount: works.filter((w) => w.status === 'completed').length,
			totalCount: works.length,
		};
	}, [works]);

	// Reset to page 1 when filters change
	useEffect(() => {
		setCurrentPage(1);
	}, [searchQuery, statusFilter]);

	const handleStatusFilter = (status: StatusFilter) => {
		setStatusFilter(status);
	};

	const {
		activeModal,
		selectedWork,
		selectedClient,
		openEmail,
		openWhatsApp,
		sendEmail,
		sendWhatsApp,
		closeModal,
		loading: notificationLoading,
	} = useNotifications();

	const {
		isOpen: checklistOpen,
		selectedWork: checklistWork,
		openChecklist,
		closeChecklist,
	} = useChecklistModal();

	const [itemsPredefinedOpen, setItemsPredefinedOpen] = useState(false);
	const [itemsPredefinedData, setItemsPredefinedData] = useState<ItemsPredefined[]>([]);
	const [materialsData, setMaterialsData] = useState<Material[]>([]);
	const [itemsPredefinedLoading, setItemsPredefinedLoading] = useState(false);

	const refreshItemsPredefined = useCallback(async () => {
		const { data } = await listItemsPredefined();
		if (data) setItemsPredefinedData(data);
	}, []);

	const refreshMaterials = useCallback(async () => {
		const { data } = await listMaterials();
		if (data) setMaterialsData(data);
	}, []);

	useEffect(() => {
		if (itemsPredefinedOpen) {
			setItemsPredefinedLoading(true);
			Promise.all([refreshItemsPredefined(), refreshMaterials()]).finally(() => {
				setItemsPredefinedLoading(false);
			});
		}
	}, [itemsPredefinedOpen, refreshItemsPredefined, refreshMaterials]);

	const handleSaveChecklist = async (checklist: any) => {
		const { data: existingChecklists } = await getChecklistsByWorkId(checklistWork?.id || -1);
		const existingCount = existingChecklists?.length || 0;

		const { data: newChecklist, error } = await createChecklist({
			work_id: checklistWork?.id || null,
			name: checklist.name || `Mobiliario ${existingCount + 1}`,
			description: checklist.description || '',
			notes: '',
			width: checklist.width ?? null,
			height: checklist.height ?? null,
			depth: checklist.depth ?? null,
			type_furniture: checklist.type_furniture ?? null,
		});

		if (error) {
			const errorMessage = translateError(error);
			console.error('Error creating checklist:', errorMessage);
			throw error;
		}

		if (newChecklist && checklist.items.length > 0) {
			const { error: itemsError } = await createChecklistItems(
				checklist.items.map((item: any) => ({
					description: item.description,
					checklist_id: newChecklist.id,
				}))
			);
			if (itemsError) {
				const errorMessage = translateError(itemsError);
				console.error('Error creating checklist items:', errorMessage);
				throw itemsError;
			}
		}

		reload();
	};

	const handleUpdateGeneralNote = async (workId: number, note: string) => {
		const { error } = await updateWorkGeneralNote(workId, note.trim() || null);

		if (error) {
			const errorMessage = translateError(error);
			console.error('Error updating general note:', errorMessage);
			throw error;
		}

		// Reload data to update the UI
		reload();
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col gap-4">
				<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
					<div>
						<h2 className="text-2xl font-bold text-foreground">Checklists de obras</h2>
						<p className="text-muted-foreground mt-1">Seguimiento de instalaciones y tareas</p>
					</div>
					{isAdmin && (
						<Button variant="outline" size="sm" onClick={() => setItemsPredefinedOpen(true)}>
							<Settings2 className="h-4 w-4 mr-2" />
							Items predefinidos
						</Button>
					)}
				</div>

				{/* Search Bar */}
				<div className="relative">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						type="text"
						placeholder="Buscar por dirección, nombre o apellido del cliente..."
						className="w-full pl-10"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</div>
			</div>

			<StatsCardsWorks
				stats={stats}
				statusFilter={statusFilter}
				onStatusFilterChange={handleStatusFilter}
			/>

			{/* Installations list */}
			{loading ? (
				<div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
					<Loader2 className="h-5 w-5 animate-spin" />
					<span>Cargando obras</span>
				</div>
			) : paginatedData.length === 0 ? (
				<p className="text-center py-12 text-muted-foreground">No hay obras para mostrar</p>
			) : (
				<div className="space-y-4">
					{paginatedData.map((installation) => {
						return (
							<WorkCard
								key={installation.id}
								work={installation}
								user={user}
								onOpenEmail={openEmail}
								onOpenWhatsApp={openWhatsApp}
								onOpenChecklist={openChecklist}
								onUpdateGeneralNote={handleUpdateGeneralNote}
							/>
						);
					})}
				</div>
			)}

			{/* Pagination */}
			{totalPages > 1 && (
				<div className="mt-8">
					<Pagination>
						<PaginationContent>
							<PaginationItem>
								<PaginationPrevious
									href="#"
									onClick={(e) => {
										e.preventDefault();
										if (currentPage > 1) setCurrentPage(currentPage - 1);
									}}
									className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
								/>
							</PaginationItem>

							{Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
								// Show first page, last page, current page, and pages around current
								if (
									page === 1 ||
									page === totalPages ||
									page === currentPage ||
									page === currentPage - 1 ||
									page === currentPage + 1
								) {
									return (
										<PaginationItem key={page}>
											<PaginationLink
												href="#"
												isActive={page === currentPage}
												onClick={(e) => {
													e.preventDefault();
													setCurrentPage(page);
												}}
											>
												{page}
											</PaginationLink>
										</PaginationItem>
									);
								}

								// Show ellipsis for gaps
								if (page === currentPage - 2 || page === currentPage + 2) {
									return (
										<PaginationItem key={`ellipsis-${page}`}>
											<PaginationEllipsis />
										</PaginationItem>
									);
								}

								return null;
							})}

							<PaginationItem>
								<PaginationNext
									href="#"
									onClick={(e) => {
										e.preventDefault();
										if (currentPage < totalPages) setCurrentPage(currentPage + 1);
									}}
									className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
								/>
							</PaginationItem>
						</PaginationContent>
					</Pagination>
				</div>
			)}

			<EmailNotificationModal
				isOpen={activeModal === 'email'}
				onOpenChange={closeModal}
				client={selectedClient}
				work={selectedWork}
				onSendEmail={sendEmail}
			/>

			<WhatsAppNotificationModal
				isOpen={activeModal === 'whatsapp'}
				onOpenChange={closeModal}
				client={selectedClient}
				work={selectedWork}
				onSendWhatsApp={sendWhatsApp}
			/>

			{checklistWork && (
				<ChecklistModal
					workId={checklistWork.id}
					open={checklistOpen}
					onOpenChange={closeChecklist}
					onSave={handleSaveChecklist}
				/>
			)}

			<ItemsPredefinedDialog
				open={itemsPredefinedOpen}
				onOpenChange={setItemsPredefinedOpen}
				materials={materialsData}
				itemsPredefined={itemsPredefinedData}
				refreshMaterials={refreshMaterials}
				refreshItemsPredefined={refreshItemsPredefined}
				isLoading={itemsPredefinedLoading}
			/>
		</div>
	);
}
