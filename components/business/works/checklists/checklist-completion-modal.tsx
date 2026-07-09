'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CheckCircle2, Loader2 } from 'lucide-react';
import {
	Checklist,
	ChecklistItem,
	deleteChecklist,
	editChecklist,
	getItemsByChecklistIds,
	updateChecklistItem,
	setAllChecklistItems as setAllItemsApi,
	deleteChecklistItemsByIds,
	createChecklistItems,
	reorderChecklistItems,
} from '@/lib/checklists/checklists';
import { updateWorkGeneralNote } from '@/lib/works/works';
import { ChecklistPDFButton } from '@/components/ui/checklist-pdf-button';
import { PostItNote } from '@/components/ui/post-it-note';
import { PostItModal } from '@/components/ui/post-it-modal';
import { ChecklistModal } from './checklist-modal';
import { useAuth } from '@/components/provider/auth-provider';
import { toast } from '@/components/ui/use-toast';
import { createClaim } from '@/lib/claims/claims';
import { translateError } from '@/lib/error-translator';
import { useWorkChecklistData } from '@/hooks/clients/use-works-checklists-data';
import { calculateProgress } from '@/helpers/checklists/progress';
import { ChecklistCard } from './checklist-card';

type ChecklistCompletionModalProps = {
	workId: number;
	children?: React.ReactNode;
};

export function ChecklistCompletionModal({ workId, children }: ChecklistCompletionModalProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [saving, setSaving] = useState(false);
	const [savingNotes, setSavingNotes] = useState<Record<string, boolean>>({});
	const [addingClaim, setAddingClaim] = useState<Record<string, boolean>>({});
	const [checklistToDelete, setChecklistToDelete] = useState<Checklist | null>(null);
	const [checklistToEdit, setChecklistToEdit] = useState<Checklist | null>(null);
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [isPostItModalOpen, setIsPostItModalOpen] = useState(false);
	const [isUpdatingNote, setIsUpdatingNote] = useState(false);
	const notesDebounceTimersRef = useRef<Record<string, number>>({});

	const { user } = useAuth();
	const isAuthorized = user?.role === 'Admin';

	// Load checklists when modal opens
	useEffect(() => {
		if (isOpen && workId) {
			reload();
		}
	}, [isOpen, workId]);

	const {
		clientData,
		workData,
		checklists: fetchedChecklists,
		loading,
		reload,
	} = useWorkChecklistData(workId);

	const [checklists, setChecklists] = useState<Checklist[]>(fetchedChecklists ?? []);
	const [itemsMap, setItemsMap] = useState<Record<number, ChecklistItem[]>>({});

	useEffect(() => {
		if (fetchedChecklists) {
			setChecklists(fetchedChecklists);
			const ids = fetchedChecklists.map((c) => c.id);
			if (ids.length > 0) {
				getItemsByChecklistIds(ids)
					.then(({ data, error }) => {
						if (error) {
							console.error('Error loading checklist items:', error);
							return;
						}
						if (data) {
							const map: Record<number, ChecklistItem[]> = {};
							for (const item of data) {
								if (!map[item.checklist_id]) map[item.checklist_id] = [];
								map[item.checklist_id].push(item);
							}
							setItemsMap(map);
						}
					})
					.catch((err) => {
						console.error('Unexpected error loading checklist items:', err);
					});
			}
		}
	}, [fetchedChecklists]);

	const toggleChecklistItem = async (checklistId: number, itemId: number) => {
		const item = itemsMap[checklistId]?.find((i) => i.id === itemId);
		if (!item) return;

		const newDone = !item.done;

		// Optimistic update
		setItemsMap((prev) => ({
			...prev,
			[checklistId]: (prev[checklistId] || []).map((i) =>
				i.id === itemId ? { ...i, done: newDone } : i
			),
		}));

		try {
			setSaving(true);
			const { error } = await updateChecklistItem(itemId, { done: newDone });
			if (error) {
				// Revert
				setItemsMap((prev) => ({
					...prev,
					[checklistId]: (prev[checklistId] || []).map((i) =>
						i.id === itemId ? { ...i, done: !newDone } : i
					),
				}));
				toast({
					title: 'Error al actualizar item',
					description:
						translateError(error) ||
						'No se pudo actualizar el item. Por favor, intenta nuevamente.',
					variant: 'destructive',
				});
			}
		} catch (error) {
			setItemsMap((prev) => ({
				...prev,
				[checklistId]: (prev[checklistId] || []).map((i) =>
					i.id === itemId ? { ...i, done: !newDone } : i
				),
			}));
		} finally {
			setSaving(false);
		}
	};

	const setAllChecklistItems = async (checklistId: number, done: boolean) => {
		const previousItems = itemsMap[checklistId];

		// Optimistic update
		setItemsMap((prev) => ({
			...prev,
			[checklistId]: (prev[checklistId] || []).map((i) => ({ ...i, done })),
		}));

		try {
			setSaving(true);
			const { error } = await setAllItemsApi(checklistId, done);
			if (error) {
				setItemsMap((prev) => ({ ...prev, [checklistId]: previousItems }));
			}
		} catch (error) {
			setItemsMap((prev) => ({ ...prev, [checklistId]: previousItems }));
		} finally {
			setSaving(false);
		}
	};

	const handleReorderItems = async (checklistId: number, items: ChecklistItem[]) => {
		const previousItems = itemsMap[checklistId];

		setItemsMap((prev) => ({ ...prev, [checklistId]: items }));

		const { error } = await reorderChecklistItems(
			items.map((i) => ({ id: i.id, sort_order: i.sort_order }))
		);
		if (error) {
			setItemsMap((prev) => ({ ...prev, [checklistId]: previousItems }));
			toast({
				title: 'Error al reordenar items',
				description:
					translateError(error) || 'No se pudo guardar el orden. Por favor, intenta nuevamente.',
				variant: 'destructive',
			});
		}
	};

	const updateChecklistNotes = (checklistId: number, notes: string) => {
		// Update local state
		setChecklists((prev) => prev.map((c) => (c.id === checklistId ? { ...c, notes } : c)));

		window.clearTimeout(notesDebounceTimersRef.current[checklistId]);

		notesDebounceTimersRef.current[checklistId] = window.setTimeout(async () => {
			try {
				setSavingNotes((prev) => ({ ...prev, [checklistId]: true }));
				const { error } = await editChecklist(checklistId, { notes });
				if (error) {
					toast({
						title: 'Error al guardar notas',
						description:
							translateError(error) ||
							'No se pudieron guardar las notas. Por favor, intenta nuevamente.',
						variant: 'destructive',
					});
				}
			} catch (error) {
				toast({
					title: 'Error al guardar notas',
					description:
						translateError(error) ||
						'No se pudieron guardar las notas. Por favor, intenta nuevamente.',
					variant: 'destructive',
				});
			} finally {
				setSavingNotes((prev) => ({ ...prev, [checklistId]: false }));
			}
		}, 600);
	};

	const handleAddChecklistEntry = async (checklist: Checklist, mode: 'claim' | 'daily') => {
		if (!workData) {
			toast({
				title: 'No se puede crear',
				description: 'Falta información de la obra.',
				variant: 'destructive',
			});
			return;
		}

		// Claim requires notes
		if (mode === 'claim' && !checklist.notes?.trim()) {
			toast({
				title: 'No se puede crear el reclamo',
				description: 'Esta checklist no tiene notas.',
				variant: 'destructive',
			});
			return;
		}

		let description = '';
		const doneItems = (itemsMap[checklist.id] || []).filter((item) => item.done);

		if (mode === 'claim') {
			description = checklist.notes!;
		} else {
			// Build description for daily activity
			description = `${checklist.name || 'Checklist'}\n\n`;

			if (doneItems.length) {
				description += 'Items:\n';

				doneItems.forEach((item) => {
					const status = item.done ? '✓' : '✗';
					description += `${status} ${item.description}\n`;
				});
			}
		}

		try {
			setAddingClaim((prev) => ({ ...prev, [checklist.id]: true }));

			const today = new Date().toISOString().split('T')[0];

			const claimData = {
				date: today,
				daily: mode === 'daily',
				client_id: clientData?.id || null,
				attend: null,
				description,
				resolved: false,
				work_zone: null,
				work_locality: workData.locality || null,
				work_address: workData.address || null,
			};

			const { error } = await createClaim(claimData);

			if (error) {
				throw error;
			}

			toast({
				title: mode === 'daily' ? 'Actividad diaria creada' : 'Reclamo creado',
				description: `${
					mode === 'daily' ? 'Se creó una actividad diaria' : 'Se creó un reclamo'
				} para ${checklist.name || 'esta checklist'}.`,
			});

			// Refresh claims
			localStorage.removeItem('claims_cache');
			window.dispatchEvent(new CustomEvent('claims-updated'));
		} catch (error) {
			const errorMessage = translateError(error);

			toast({
				title: mode === 'daily' ? 'Error al crear actividad diaria' : 'Error al crear reclamo',
				description:
					errorMessage ||
					(mode === 'daily'
						? 'No se pudo crear la actividad diaria.'
						: 'No se pudo crear el reclamo.'),
				variant: 'destructive',
			});
		} finally {
			setAddingClaim((prev) => ({ ...prev, [checklist.id]: false }));
		}
	};

	const confirmDeleteChecklist = async () => {
		if (!checklistToDelete) return;

		try {
			setSaving(true);
			const { error } = await deleteChecklist(checklistToDelete.id);
			if (error) {
				const errorMessage = translateError(error);
				toast({
					title: 'Error al eliminar checklist',
					description:
						errorMessage || 'No se pudo eliminar el checklist. Por favor, intenta nuevamente.',
					variant: 'destructive',
				});
			} else {
				toast({
					title: 'Checklist eliminado',
					description: `Se eliminó el checklist ${checklistToDelete.name || 'sin nombre'}.`,
				});
			}

			// Update local state
			setChecklists((prev) => prev.filter((c) => c.id !== checklistToDelete.id));
			setChecklistToDelete(null);
		} catch (error) {
			console.error('Error deleting checklist:', error);
		} finally {
			setSaving(false);
		}
	};

	const handleEditChecklist = (checklist: Checklist) => {
		setChecklistToEdit(checklist);
		setIsEditModalOpen(true);
	};

	const handleUpdateChecklist = async (checklistId: number, updates: any) => {
		try {
			setSaving(true);

			const changes: Record<string, any> = {};
			if (updates.name !== checklistToEdit?.name) changes.name = updates.name;
			if (updates.description !== checklistToEdit?.description)
				changes.description = updates.description;
			if (updates.width !== checklistToEdit?.width) changes.width = updates.width;
			if (updates.height !== checklistToEdit?.height) changes.height = updates.height;
			if (updates.depth !== checklistToEdit?.depth) changes.depth = updates.depth;
			if (updates.type_furniture !== checklistToEdit?.type_furniture)
				changes.type_furniture = updates.type_furniture;

			if (Object.keys(changes).length > 0) {
				const { error: checklistError } = await editChecklist(checklistId, changes);
				if (checklistError) throw checklistError;
			}

			const { data: existingItems } = await getItemsByChecklistIds([checklistId]);
			const existingById = new Map((existingItems ?? []).map((i: ChecklistItem) => [i.id, i]));
			const updateIds = new Set((updates.items ?? []).map((i: any) => i.id).filter(Boolean));

			const toDelete = (existingItems ?? []).filter((i: ChecklistItem) => !updateIds.has(i.id));

			const toCreate = (updates.items ?? []).filter((i: any) => !i.id);

			const toUpdate = (updates.items ?? []).filter((i: any) => i.id && existingById.has(i.id));

			if (toDelete.length > 0) {
				const ids = toDelete.map((i: ChecklistItem) => i.id);
				const { error: deleteError } = await deleteChecklistItemsByIds(ids);
				if (deleteError) throw deleteError;
			}

			if (toCreate.length > 0) {
				const maxSortOrder =
					existingItems && existingItems.length > 0
						? Math.max(...existingItems.map((i) => i.sort_order ?? 0))
						: -1;
				const { error: createError } = await createChecklistItems(
					toCreate.map((i: any) => ({
						description: i.description,
						checklist_id: checklistId,
					})),
					maxSortOrder + 1
				);
				if (createError) throw createError;
			}

			for (const item of toUpdate) {
				const existing = existingById.get(item.id);
				if (existing && existing.description !== item.description) {
					const { error } = await updateChecklistItem(item.id, {
						description: item.description,
					});
					if (error) throw error;
				}
			}

			// Reload items
			const { data: newItems } = await getItemsByChecklistIds([checklistId]);
			if (newItems) {
				setItemsMap((prev) => ({ ...prev, [checklistId]: newItems }));
			}

			setChecklists((prev) => {
				const { items, ...scalarFields } = updates;
				return prev.map((c) => (c.id === checklistId ? { ...c, ...scalarFields } : c));
			});
			setIsEditModalOpen(false);
			setChecklistToEdit(null);
		} catch (error) {
			throw error;
		} finally {
			setSaving(false);
		}
	};

	const handleSaveGeneralNote = async (note: string) => {
		if (!workData) return;

		setIsUpdatingNote(true);
		try {
			const { error } = await updateWorkGeneralNote(workData.id, note.trim() || null);

			if (error) {
				throw error;
			}

			// Reload data to update the UI
			reload();

			toast({
				title: 'Nota general actualizada',
				description: 'La nota general se ha guardado correctamente.',
			});
		} catch (error) {
			console.error('Error al guardar la nota general:', error);
			const errorMessage = translateError(error);
			toast({
				title: 'Error al guardar nota',
				description:
					errorMessage || 'No se pudo guardar la nota general. Por favor, intenta nuevamente.',
				variant: 'destructive',
			});
		} finally {
			setIsUpdatingNote(false);
		}
	};

	useEffect(() => {
		return () => {
			Object.values(notesDebounceTimersRef.current).forEach((timerId) => {
				if (timerId) window.clearTimeout(timerId);
			});
		};
	}, []);

	const totalProgress =
		checklists.reduce((acc, checklist) => {
			return acc + calculateProgress(itemsMap[checklist.id] || []);
		}, 0) / (checklists.length || 1);

	return (
		<>
			<Dialog open={isOpen} onOpenChange={setIsOpen}>
				<DialogTrigger asChild>
					{children || (
						<Button variant="outline">
							<CheckCircle2 className="mr-2 h-4 w-4" />
							Completar Checklists
						</Button>
					)}
				</DialogTrigger>
				<DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-6">
					<DialogHeader>
						<DialogTitle>Completar Checklists</DialogTitle>
						<DialogDescription>
							Marca las tareas completadas de los checklists pendientes.
						</DialogDescription>
					</DialogHeader>

					{loading ? (
						<div className="flex items-center justify-center py-12">
							<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
							<span className="ml-2 text-muted-foreground">Cargando checklists...</span>
						</div>
					) : (
						<div className="space-y-8">
							{/* Progress Overview */}
							<div className="text-center space-y-2">
								<div className="text-sm font-medium text-foreground">
									Progreso total: {Math.round(totalProgress)}%
								</div>
								<div className="text-base">
									{checklists.length > 0 ? (
										<b>Cantidad de checklists: {checklists.length}</b>
									) : (
										<b>No hay checklists disponibles</b>
									)}
								</div>
							</div>

							{/* Post-it for mobile - visible only on small screens */}
							{workData?.general_note && (
								<div className="md:hidden">
									<div className="flex items-center justify-between mb-2">
										<h3 className="text-sm font-medium text-foreground">Nota general de la obra</h3>
										{isAuthorized && (
											<Button
												variant="ghost"
												size="sm"
												onClick={() => setIsPostItModalOpen(true)}
												className="h-8 px-2 text-xs"
											>
												Editar
											</Button>
										)}
									</div>
									<PostItNote note={workData.general_note} isMobile={true} />
								</div>
							)}

							{/* Checklists */}
							<div className="space-y-8">
								{checklists.map((checklist, index) => (
									<ChecklistCard
										key={checklist.id}
										checklist={checklist}
										items={itemsMap[checklist.id] || []}
										index={index}
										user={user}
										saving={saving}
										loading={loading}
										savingNotes={savingNotes}
										onToggleItem={toggleChecklistItem}
										onSetAllItems={setAllChecklistItems}
										onUpdateNotes={updateChecklistNotes}
										onAddEntry={handleAddChecklistEntry}
										onEdit={handleEditChecklist}
										onDelete={setChecklistToDelete}
										onReorderItems={handleReorderItems}
										clientId={clientData?.id}
									/>
								))}
							</div>

							{/* Footer */}
							<div className="flex flex-col sm:flex-row justify-center gap-3 pt-8 border-t">
								<ChecklistPDFButton
									checklists={checklists}
									checklistItems={itemsMap}
									workId={workId}
									clientName={clientData?.name || 'Cliente sin nombre'}
									disabled={saving}
								/>
								<Button
									variant="outline"
									onClick={() => setIsOpen(false)}
									className="w-full sm:w-auto px-8"
									disabled={saving}
								>
									Cerrar
								</Button>
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>

			{/* Delete Confirmation Dialog */}
			<AlertDialog open={!!checklistToDelete} onOpenChange={() => setChecklistToDelete(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>¿Eliminar checklist?</AlertDialogTitle>
						<AlertDialogDescription>
							Esta acción no se puede deshacer. Se eliminará permanentemente el checklist{' '}
							<span className="font-semibold">{checklistToDelete?.name || 'sin nombre'}</span> y
							todos sus datos asociados.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmDeleteChecklist}
							disabled={saving}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{saving ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Eliminando...
								</>
							) : (
								'Eliminar'
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Edit Checklist Modal */}
			<ChecklistModal
				workId={workId}
				open={isEditModalOpen}
				onOpenChange={setIsEditModalOpen}
				checklistToEdit={checklistToEdit}
				onUpdate={handleUpdateChecklist}
				onSave={async () => {}}
			/>

			{/* PostIt Modal for mobile */}
			<PostItModal
				isOpen={isPostItModalOpen}
				onOpenChange={setIsPostItModalOpen}
				initialNote={workData?.general_note}
				onSave={handleSaveGeneralNote}
				isLoading={isUpdatingNote}
			/>
		</>
	);
}
