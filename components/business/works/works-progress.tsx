'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, Settings2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ChecklistModal } from '@/components/business/works/checklists/checklist-modal';
import { ItemsPredefinedDialog } from '@/components/business/works/checklists/items-predefined-dialog';
import {
	createChecklist,
	createChecklistItems,
	deleteChecklist,
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
import { toast } from '@/components/ui/use-toast';
import { EventFormModal } from '@/components/business/calendar/event-form-modal';
import { useLoadEventTypes } from '@/hooks/calendar/use-load-event-types';
import { WorkWithProgress } from '@/lib/works/works';

export function WorksOpenings() {
	const [searchQuery, setSearchQuery] = useState('');
	const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
	const [onlyWithoutBudget, setOnlyWithoutBudget] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;

	const { user } = useAuth();
	const { works, loading, reload } = useWorksWithProgress();
	const { eventTypes } = useLoadEventTypes();

	const [isEventModalOpen, setIsEventModalOpen] = useState(false);
	const [selectedWorkForEvent, setSelectedWorkForEvent] = useState<WorkWithProgress | null>(null);

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

			const matchesBudget = !onlyWithoutBudget || !item.hasBudget;

			const matchesSearch =
				!search ||
				item.address?.toLowerCase().includes(search) ||
				item.client_name?.toLowerCase().includes(search) ||
				item.client_last_name?.toLowerCase().includes(search) ||
				false;

			return matchesStatus && matchesSearch && matchesBudget;
		}
	);

	const stats = useMemo(() => {
		return {
			pendingCount: works.filter((w) => w.status === 'pending').length,
			inProgressCount: works.filter((w) => w.status === 'in_progress').length,
			completedCount: works.filter((w) => w.status === 'completed').length,
			totalCount: works.length,
			withoutBudgetCount: works.filter((w) => !w.hasBudget).length,
		};
	}, [works]);

	// Reset to page 1 when filters change
	useEffect(() => {
		setCurrentPage(1);
	}, [searchQuery, statusFilter, onlyWithoutBudget]);

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
		const { data, error } = await listItemsPredefined();
		if (error) {
			toast({
				title: 'Error',
				description: translateError(error) || 'Error al cargar los items predefinidos',
				variant: 'destructive',
			});
		}
		if (data) setItemsPredefinedData(data);
	}, []);

	const refreshMaterials = useCallback(async () => {
		const { data, error } = await listMaterials();
		if (data) setMaterialsData(data);
		if (error) {
			toast({
				title: 'Error',
				description: translateError(error) || 'Error al cargar los materiales',
				variant: 'destructive',
			});
		}
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
				// Attempt to clean up the newly created checklist if items creation fails
				try {
					await deleteChecklist(newChecklist.id);
				} catch (cleanupError) {
					console.error('Failed to clean up orphaned checklist:', cleanupError);
				}
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

	const handleAddToCalendar = (work: WorkWithProgress) => {
		setSelectedWorkForEvent(work);
		setIsEventModalOpen(true);
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

			<div className="flex items-center justify-between gap-2">
				<label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
					<Switch checked={onlyWithoutBudget} onCheckedChange={setOnlyWithoutBudget} />
					<span>Mostrar obras sin presupuesto</span>
					<Badge variant="secondary">{stats.withoutBudgetCount}</Badge>
				</label>
			</div>

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
								onAddToCalendar={handleAddToCalendar}
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

			<EventFormModal
				open={isEventModalOpen}
				onOpenChange={setIsEventModalOpen}
				eventTypes={eventTypes}
				mode="create"
				initialWork={selectedWorkForEvent}
				onSave={async (eventData) => {
					try {
						const selectedEventType = eventTypes.find(
							(eventType) => eventType.name === eventData.type
						);
						const dateStr =
							typeof eventData.date === 'string'
								? eventData.date
								: eventData.date instanceof Date
									? `${eventData.date.getDate()}-${eventData.date.getMonth() + 1}-${eventData.date.getFullYear()}`
									: '';

						const [day, month, year] = dateStr.split('-').map(Number);
						const formattedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

						const { createEvent } = await import('@/lib/calendar/events');
						const { data: newEvent, error } = await createEvent({
							title: eventData.title || 'Sin título',
							type_id: selectedEventType?.id ?? null,
							description: eventData.description,
							client_id: eventData.client_id,
							client_name: eventData.client_name,
							date: formattedDate,
							remember: eventData.remember,
							work_id: eventData.work_id,
							work_location: eventData.work_location,
						});

						if (error) {
							console.error('Error al crear el evento:', error);
							toast({
								title: 'Error',
								description: translateError(error) || 'No se pudo crear el evento.',
								variant: 'destructive',
							});
							return false;
						}

						if (newEvent) {
							return true;
						}

						return false;
					} catch (error) {
						console.error('Error inesperado al crear el evento:', error);
						toast({
							title: 'Error',
							description: translateError(error) || 'No se pudo crear el evento.',
							variant: 'destructive',
						});
						return false;
					}
				}}
			/>
		</div>
	);
}
