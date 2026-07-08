import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MoreVertical, Plus, User, Trash2 } from 'lucide-react';
import { KanbanCard } from './kanban-card';
import { useCards } from '@/hooks/kanban/use-cards';
import { ListEditModal } from './list-edit-modal';
import { ListDeleteModal } from './list-delete-modal';
import { CardCreationModal } from './card-creation-modal';
import { useDroppable } from '@dnd-kit/core';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { listClients } from '@/lib/clients/clients';
import type { Client } from '@/lib/clients/clients';
import type { List, Card, CardFormData } from './types';

function DroppableList({
	listId,
	cardIds,
	children,
	className,
}: {
	listId: number;
	cardIds: string[];
	children: ReactNode;
	className?: string;
}) {
	const { setNodeRef, isOver } = useDroppable({ id: `list-${listId}` });

	return (
		<div ref={setNodeRef} className={`${className} ${isOver ? 'bg-muted/50' : ''}`}>
			<SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
				{children}
			</SortableContext>
		</div>
	);
}

function SortableCard({
	card,
	index,
	listId,
	onClick,
	dueDateToleranceYellow,
	dueDateToleranceRed,
}: {
	card: Card;
	index: number;
	listId: number;
	onClick: () => void;
	dueDateToleranceYellow: number;
	dueDateToleranceRed: number;
}) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: `card-${card.id}`,
		data: { type: 'card', card, index, listId },
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.4 : 1,
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={`${isDragging ? 'rotate-3 shadow-lg z-50' : ''}`}
			{...attributes}
			{...listeners}
		>
			<KanbanCard
				card={card as any}
				onClick={onClick}
				dueDateToleranceYellow={dueDateToleranceYellow}
				dueDateToleranceRed={dueDateToleranceRed}
			/>
		</div>
	);
}

interface KanbanListProps {
	list: List;
	cards?: Card[];
	onEditList: (name: string) => void;
	onDeleteList: () => void;
	onCreateCard: (card: CardFormData) => void;
	onCardClick: (cardId: number) => void;
	onCardMove: (cardId: number, newListId: number, newPosition: number) => void;
	dueDateToleranceYellow?: number; // Days before due date to show yellow warning
	dueDateToleranceRed?: number; // Days before due date to show red warning
}

export function KanbanList({
	list,
	cards: propCards,
	onEditList,
	onDeleteList,
	onCreateCard,
	onCardClick,
	dueDateToleranceYellow = 2,
	dueDateToleranceRed = 0,
}: KanbanListProps) {
	// Always use the hook for card operations, but use props for display if provided
	const { cards, loading, addCard } = useCards(list.id);
	const cardsToUse = propCards !== undefined ? propCards : cards;
	const cardIds = cardsToUse.map((c) => `card-${c.id}`);
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [showEditModal, setShowEditModal] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [showCardCreationModal, setShowCardCreationModal] = useState(false);
	const [createMode, setCreateMode] = useState<'normal' | 'client' | null>(null);
	const [clients, setClients] = useState<Client[]>([]);
	const [selectedClient, setSelectedClient] = useState<number | null>(null);
	const [cardTitle, setCardTitle] = useState('');

	const handleOpenCreateModal = async () => {
		setShowCreateModal(true);
		setCreateMode(null);
		setCardTitle('');
		setSelectedClient(null);
		// Load clients
		const { data } = await listClients();
		if (data) {
			setClients(data);
		}
	};

	const handleCreateNormalCard = () => {
		setShowCreateModal(false);
		setShowCardCreationModal(true);
	};

	const handleCreateCardFromModal = async (title: string) => {
		// Always use the local hook to create the card
		const newCard = await addCard({ title });
		if (newCard) {
			// Notify parent to refresh the board
			onCreateCard({ title });
		}
	};

	const handleCreateFromClient = async () => {
		if (!selectedClient) return;
		const client = clients.find((c) => c.id === selectedClient);
		if (client) {
			const title = `${client.name || ''} ${client.last_name || ''}`.trim();
			const newCard = await addCard({ title });
			if (newCard) {
				onCreateCard({ title });
			}
		}
		setShowCreateModal(false);
	};

	const handleEditList = () => {
		setShowEditModal(true);
	};

	const handleDeleteList = () => {
		setShowDeleteModal(true);
	};

	const handleSaveListName = (name: string) => {
		onEditList(name);
		setShowEditModal(false);
	};

	return (
		<div className="w-72 flex-shrink-0 flex flex-col bg-background rounded-lg shadow-sm border">
			{/* List Header */}
			<div className="p-3 border-b flex items-center justify-between">
				<h3 className="font-semibold">{list.name}</h3>
				<div className="flex items-center gap-1">
					<span className="text-xs text-muted-foreground">{cardsToUse.length}</span>
					<Button
						variant="ghost"
						size="icon"
						className="h-6 w-6"
						aria-label="Opciones de la lista"
						onClick={handleEditList}
					>
						<MoreVertical className="h-4 w-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
						onClick={handleDeleteList}
						title="Eliminar lista"
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				</div>
			</div>

			{/* Cards Container */}
			<DroppableList
				listId={list.id}
				cardIds={cardIds}
				className="flex-1 p-3 space-y-2 min-h-[200px]"
			>
				{loading && propCards === undefined ? (
					<div className="text-center py-4">
						<p className="text-xs text-muted-foreground">Cargando...</p>
					</div>
				) : cardsToUse.length === 0 ? (
					<div className="text-center py-4">
						<p className="text-xs text-muted-foreground">No hay tarjetas</p>
					</div>
				) : (
					cardsToUse.map((card, index) => (
						<SortableCard
							key={card.id}
							card={card}
							index={index}
							listId={list.id}
							onClick={() => onCardClick(card.id)}
							dueDateToleranceYellow={dueDateToleranceYellow}
							dueDateToleranceRed={dueDateToleranceRed}
						/>
					))
				)}
			</DroppableList>

			{/* Add Card Button */}
			<div className="p-3 border-t">
				<Button variant="ghost" className="w-full justify-start" onClick={handleOpenCreateModal}>
					<Plus className="h-4 w-4 mr-2" />
					Agregar tarjeta
				</Button>
			</div>

			{/* Create Card Modal */}
			<Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Crear tarjeta</DialogTitle>
					</DialogHeader>
					{createMode === null ? (
						<div className="space-y-3">
							<Button
								variant="outline"
								className="w-full justify-start gap-2"
								onClick={handleCreateNormalCard}
							>
								<Plus className="h-4 w-4" />
								Tarjeta normal
							</Button>
							<Button
								variant="outline"
								className="w-full justify-start gap-2"
								onClick={() => setCreateMode('client')}
							>
								<User className="h-4 w-4" />
								Desde cliente
							</Button>
						</div>
					) : createMode === 'client' ? (
						<div className="space-y-4">
							<div>
								<label className="text-sm font-medium mb-2 block">Seleccionar cliente</label>
								<select
									value={selectedClient || ''}
									onChange={(e) => setSelectedClient(Number(e.target.value))}
									className="w-full p-2 border rounded"
								>
									<option value="">Seleccionar...</option>
									{clients.map((client) => (
										<option key={client.id} value={client.id}>
											{client.name} {client.last_name}
										</option>
									))}
								</select>
							</div>
							<div className="flex gap-2">
								<Button
									onClick={handleCreateFromClient}
									disabled={!selectedClient}
									className="flex-1"
								>
									Crear
								</Button>
								<Button variant="outline" onClick={() => setCreateMode(null)} className="flex-1">
									Volver
								</Button>
							</div>
						</div>
					) : null}
				</DialogContent>
			</Dialog>

			{/* List Edit Modal */}
			<ListEditModal
				list={list}
				open={showEditModal}
				onOpenChange={setShowEditModal}
				onSave={handleSaveListName}
			/>

			{/* List Delete Modal */}
			<ListDeleteModal
				list={list}
				open={showDeleteModal}
				onOpenChange={setShowDeleteModal}
				onConfirm={onDeleteList}
			/>

			{/* Card Creation Modal */}
			<CardCreationModal
				open={showCardCreationModal}
				onOpenChange={setShowCardCreationModal}
				onCreate={handleCreateCardFromModal}
			/>
		</div>
	);
}
