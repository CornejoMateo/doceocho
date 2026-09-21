'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Columns3, Plus, Settings, Users } from 'lucide-react';
import {
	DndContext,
	DragEndEvent,
	DragStartEvent,
	DragOverlay,
	PointerSensor,
	useSensor,
	useSensors,
	closestCorners,
} from '@dnd-kit/core';
import { useBoard } from '@/hooks/kanban/use-board';
import { moveCard } from '@/lib/kanban/cards';
import { KanbanList } from '@/components/business/kanban/kanban-list';
import { CardDetailModal } from '@/components/business/kanban/card-detail-modal';
import {
	BoardSettingsModal,
	type BoardSettingsChanges,
} from '@/components/business/kanban/board-settings-modal';
import { BoardMembersModal } from '@/components/business/kanban/board-members-modal';
import { ListCreationModal } from '@/components/business/kanban/list-creation-modal';
import { KanbanCard as KanbanCardComponent } from '@/components/business/kanban/kanban-card';
import { KanbanEmptyState } from '@/components/business/kanban/kanban-empty-state';
import { BoardTemplateShortcuts } from '@/components/business/kanban/board-template-shortcuts';
import { applyBoardTemplate } from '@/lib/kanban/board-templates';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { translateError } from '@/lib/error-translator';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/components/provider/auth-provider';
import type { CardFormData, Card } from '@/components/business/kanban/types';

export default function BoardPage() {
	const router = useRouter();
	const params = useParams();
	const boardId = params.id ? Number(params.id) : null;
	const { user } = useAuth();
	const isAuthorized = user?.role === 'Admin';

	const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
	const [isCardModalOpen, setIsCardModalOpen] = useState(false);
	const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
	const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
	const [isListCreationModalOpen, setIsListCreationModalOpen] = useState(false);
	const [activeCard, setActiveCard] = useState<Card | null>(null);

	const {
		board,
		lists,
		loading,
		error,
		fetchBoard,
		addList,
		editList,
		removeList,
		updateBoard,
		optimisticallyMoveCard,
	} = useBoard(boardId);

	const handleCreateList = async () => {
		setIsListCreationModalOpen(true);
	};

	const handleApplyTemplate = async (templateId: string) => {
		if (!boardId) return;

		const { createdCount, failedNames } = await applyBoardTemplate(boardId, templateId);

		if (failedNames.length > 0) {
			toast({
				variant: 'destructive',
				title: 'Faltaron listas',
				description: `No pudimos crear: ${failedNames.join(', ')}. Agregalas a mano.`,
			});
		} else {
			toast({ title: `Se crearon ${createdCount} listas` });
		}

		fetchBoard();
	};

	const handleCreateListFromModal = async (name: string) => {
		const { data, error } = await addList({ name });
		if (error) {
			toast({
				variant: 'destructive',
				title: 'Error al crear lista',
				description: translateError(error) || 'Ocurrió un error, intenta de nuevo.',
			});
		} else if (data) {
			toast({ title: 'Lista creada correctamente' });
		}
	};

	const handleDeleteList = async (listId: number) => {
		const { error } = await removeList(listId);
		if (error) {
			toast({
				variant: 'destructive',
				title: 'Error al eliminar',
				description: translateError(error) || 'Ocurrió un error, intenta de nuevo.',
			});
			throw error;
		}
	};

	const handleCreateCard = async () => {
		// Refresh the board to show newly created cards
		fetchBoard();
	};

	const handleCardClick = (cardId: number) => {
		setSelectedCardId(cardId);
		setIsCardModalOpen(true);
	};

	const handleCardMove = async (cardId: number, newListId: number, newPosition: number) => {
		// Use the optimistic mutation from useBoard
		const { error } = await optimisticallyMoveCard({ cardId, newListId, newPosition });
		if (error) {
			toast({
				variant: 'destructive',
				title: 'Error al mover tarjeta',
				description: translateError(error),
			});
		}
	};

	const handleCardDeleted = () => {
		fetchBoard();
	};

	const handleCardUpdated = () => {
		fetchBoard();
	};

	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

	const handleDragStart = (event: DragStartEvent) => {
		const { active } = event;
		const cardData = active.data.current as { card?: Card } | undefined;
		if (cardData?.card) {
			setActiveCard(cardData.card);
		}
	};

	const handleDragEnd = (event: DragEndEvent) => {
		setActiveCard(null);
		const { active, over } = event;
		if (!over) return;

		const cardId = Number(active.id.toString().replace('card-', ''));
		const overId = over.id.toString();

		let destinationListId: number;
		let newPosition: number;

		if (overId.startsWith('list-')) {
			destinationListId = Number(overId.replace('list-', ''));
			newPosition = 0;
		} else {
			const overData = over.data.current as { listId?: number; index?: number } | undefined;
			destinationListId = overData?.listId ?? 0;
			newPosition = overData?.index ?? 0;
		}

		handleCardMove(cardId, destinationListId, newPosition);
	};

	const handleSaveSettings = async (changes: BoardSettingsChanges) => {
		const { data, error } = await updateBoard(changes);
		if (error) {
			toast({
				variant: 'destructive',
				title: 'Error al guardar',
				description: translateError(error) || 'Ocurrió un error, intenta de nuevo.',
			});
		} else if (data) {
			toast({ title: 'Configuración guardada correctamente' });
		}
	};

	if (!boardId) {
		return (
			<DashboardLayout>
				<p className="text-destructive">ID de tablero inválido</p>
			</DashboardLayout>
		);
	}

	if (loading) {
		return (
			<DashboardLayout>
				<p className="text-muted-foreground">Cargando tablero...</p>
			</DashboardLayout>
		);
	}

	if (error) {
		return (
			<DashboardLayout>
				<p className="text-destructive">Error: {translateError(error)}</p>
			</DashboardLayout>
		);
	}

	if (!board) {
		return (
			<DashboardLayout>
				<p className="text-muted-foreground">Tablero no encontrado</p>
			</DashboardLayout>
		);
	}

	return (
		<DashboardLayout>
			<div className="flex h-full min-h-0 flex-col">
				{/* Header */}
				<div className="mb-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4">
							<Button variant="ghost" size="icon" onClick={() => router.push('/kanban')}>
								<ArrowLeft className="h-5 w-5" />
							</Button>
							<div>
								<h1 className="text-2xl font-bold">{board.name}</h1>
								{board.description && (
									<p className="text-sm text-muted-foreground">{board.description}</p>
								)}
							</div>
						</div>
						<div className="flex items-center gap-2">
							{isAuthorized && (
								<Button
									variant="ghost"
									size="icon"
									onClick={() => setIsMembersModalOpen(true)}
									title="Gestionar miembros"
								>
									<Users className="h-5 w-5" />
								</Button>
							)}
							{isAuthorized && (
								<Button
									variant="ghost"
									size="icon"
									onClick={() => setIsSettingsModalOpen(true)}
									title="Configuración del tablero"
								>
									<Settings className="h-5 w-5" />
								</Button>
							)}
						</div>
					</div>
				</div>

				{/* Board Content */}
				<div className="min-h-0 flex-1 overflow-x-auto">
					{lists.length === 0 ? (
						<KanbanEmptyState
							icon={Columns3}
							title="Este tablero todavía no tiene listas"
							description="Una lista es una etapa del trabajo. Lo más común es arrancar con tres: Por hacer, En proceso y Terminado. Después vas moviendo las tarjetas de una a otra."
							action={
								isAuthorized ? (
									<div className="space-y-4">
										<Button variant="outline" className="gap-2" onClick={handleCreateList}>
											<Plus className="h-4 w-4" />
											Crear la primera lista
										</Button>
										<BoardTemplateShortcuts onApply={handleApplyTemplate} />
									</div>
								) : undefined
							}
						/>
					) : (
						<DndContext
							sensors={sensors}
							collisionDetection={closestCorners}
							onDragStart={handleDragStart}
							onDragEnd={handleDragEnd}
						>
							<div className="flex h-full gap-4 pb-2">
								{lists.map((list) => (
									<KanbanList
										key={list.id}
										list={list}
										cards={list.cards || []}
										onEditList={(name) => editList(list.id, { name })}
										onDeleteList={() => handleDeleteList(list.id)}
										onCreateCard={handleCreateCard}
										onCardClick={handleCardClick}
										onCardMove={handleCardMove}
										dueDateToleranceYellow={board.due_date_tolerance_yellow ?? 2}
										dueDateToleranceRed={board.due_date_tolerance_red ?? 0}
									/>
								))}
								{/* Add List Button */}
								{isAuthorized && (
									<div className="w-72 flex-shrink-0">
										<Button
											variant="outline"
											className="h-12 w-full border-dashed"
											onClick={handleCreateList}
										>
											<Plus className="h-4 w-4 mr-2" />
											Agregar lista
										</Button>
									</div>
								)}
							</div>
							<DragOverlay>
								{activeCard ? (
									<div className="rotate-3 shadow-xl">
										<KanbanCardComponent card={activeCard} onClick={() => {}} />
									</div>
								) : null}
							</DragOverlay>
						</DndContext>
					)}
				</div>
			</div>

			{/* Card Detail Modal */}
			<CardDetailModal
				cardId={selectedCardId}
				open={isCardModalOpen}
				onOpenChange={setIsCardModalOpen}
				onCardDeleted={handleCardDeleted}
				onCardUpdated={handleCardUpdated}
			/>

			{/* Board Settings Modal */}
			<BoardSettingsModal
				board={board}
				open={isSettingsModalOpen}
				onOpenChange={setIsSettingsModalOpen}
				onSave={handleSaveSettings}
			/>

			{/* Board Members Modal */}
			<BoardMembersModal
				boardId={boardId}
				open={isMembersModalOpen}
				onOpenChange={setIsMembersModalOpen}
			/>

			{/* List Creation Modal */}
			<ListCreationModal
				open={isListCreationModalOpen}
				onOpenChange={setIsListCreationModalOpen}
				onCreate={handleCreateListFromModal}
			/>
		</DashboardLayout>
	);
}
