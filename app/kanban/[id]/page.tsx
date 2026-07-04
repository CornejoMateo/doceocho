'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Settings, Users } from 'lucide-react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { useBoard } from '@/hooks/kanban/use-board';
import { moveCard } from '@/lib/kanban/cards';
import { KanbanList } from '@/components/business/kanban/kanban-list';
import { CardDetailModal } from '@/components/business/kanban/card-detail-modal';
import { BoardSettingsModal } from '@/components/business/kanban/board-settings-modal';
import { ListCreationModal } from '@/components/business/kanban/list-creation-modal';
import { translateError } from '@/lib/error-translator';
import { toast } from '@/components/ui/use-toast';
import type { CardFormData } from '@/components/business/kanban/types';

export default function BoardPage() {
	const router = useRouter();
	const params = useParams();
	const boardId = params.id ? Number(params.id) : null;
	const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
	const [isCardModalOpen, setIsCardModalOpen] = useState(false);
	const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
	const [isListCreationModalOpen, setIsListCreationModalOpen] = useState(false);
	const userId = '00000000-0000-0000-0000-000000000000'; // TODO: Get actual user UUID from auth

	const { board, lists, loading, error, fetchBoard, addList, editList, removeList, updateBoard } =
		useBoard(boardId);

	const handleCreateList = async () => {
		setIsListCreationModalOpen(true);
	};

	const handleCreateListFromModal = async (name: string) => {
		await addList({ name });
	};

	const handleCardClick = (cardId: number) => {
		setSelectedCardId(cardId);
		setIsCardModalOpen(true);
	};

	const handleCardMove = async (cardId: number, newListId: number, newPosition: number) => {
		const { error } = await moveCard(cardId, newListId, newPosition);
		if (error) {
			toast({
				variant: 'destructive',
				title: 'Error al mover tarjeta',
				description: translateError(error),
			});
		} else {
			// Refresh the board to get updated card positions
			fetchBoard();
		}
	};

	const handleCardDeleted = () => {
		fetchBoard();
	};

	const handleCardUpdated = () => {
		fetchBoard();
	};

	const handleDragEnd = (result: DropResult) => {
		if (!result.destination) return;

		const cardId = Number(result.draggableId.replace('card-', ''));
		const destinationListId = Number(result.destination.droppableId.replace('list-', ''));
		const newPosition = result.destination.index;

		handleCardMove(cardId, destinationListId, newPosition);
	};

	const handleSaveSettings = (
		changes: Partial<{ due_date_tolerance_yellow: number; due_date_tolerance_red: number }>
	) => {
		updateBoard(changes);
	};

	if (!boardId) {
		return (
			<div className="container mx-auto p-6">
				<p className="text-destructive">ID de tablero inválido</p>
			</div>
		);
	}

	if (loading) {
		return (
			<div className="container mx-auto p-6">
				<p className="text-muted-foreground">Cargando tablero...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="container mx-auto p-6">
				<p className="text-destructive">Error: {error}</p>
			</div>
		);
	}

	if (!board) {
		return (
			<div className="container mx-auto p-6">
				<p className="text-muted-foreground">Tablero no encontrado</p>
			</div>
		);
	}

	return (
		<div className="h-screen flex flex-col bg-muted/30">
			{/* Header */}
			<div className="border-b bg-background">
				<div className="container mx-auto px-6 py-4">
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
							<Button variant="ghost" size="icon">
								<Users className="h-5 w-5" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								onClick={() => setIsSettingsModalOpen(true)}
								title="Configurar tolerancia de fecha"
							>
								<Settings className="h-5 w-5" />
							</Button>
						</div>
					</div>
				</div>
			</div>

			{/* Board Content */}
			<div className="flex-1 overflow-x-auto">
				<div className="container mx-auto px-6 py-6">
					<DragDropContext onDragEnd={handleDragEnd}>
						<div className="flex gap-4 h-full">
							{lists.map((list) => (
								<KanbanList
									key={list.id}
									list={list}
									onEditList={(name) => editList(list.id, { name })}
									onDeleteList={() => removeList(list.id)}
									onCreateCard={(card: CardFormData) => {}}
									onCardClick={handleCardClick}
									onCardMove={handleCardMove}
									dueDateToleranceYellow={board.due_date_tolerance_yellow ?? 2}
									dueDateToleranceRed={board.due_date_tolerance_red ?? 0}
								/>
							))}
							{/* Add List Button */}
							<div className="w-72 flex-shrink-0">
								<Button
									variant="outline"
									className="w-full h-12 border-dashed"
									onClick={handleCreateList}
								>
									<Plus className="h-4 w-4 mr-2" />
									Agregar lista
								</Button>
							</div>
						</div>
					</DragDropContext>
				</div>
			</div>

			{/* Card Detail Modal */}
			<CardDetailModal
				cardId={selectedCardId}
				open={isCardModalOpen}
				onOpenChange={setIsCardModalOpen}
				userId={userId}
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

			{/* List Creation Modal */}
			<ListCreationModal
				open={isListCreationModalOpen}
				onOpenChange={setIsListCreationModalOpen}
				onCreate={handleCreateListFromModal}
			/>
		</div>
	);
}
