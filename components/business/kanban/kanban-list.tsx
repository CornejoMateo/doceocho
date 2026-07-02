import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MoreVertical, Plus, User, Trash2 } from 'lucide-react';
import { KanbanCard } from './kanban-card';
import { useCards } from './kankan/use-cards';
import { ListEditModal } from './list-edit-modal';
import { ListDeleteModal } from './list-delete-modal';
import { CardCreationModal } from './card-creation-modal';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { listClients } from '@/lib/clients/clients';
import type { Client } from '@/lib/clients/clients';
import type { List, CardFormData } from './types';

interface KanbanListProps {
	list: List;
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
	onEditList,
	onDeleteList,
	onCreateCard,
	onCardClick,
	onCardMove,
	dueDateToleranceYellow = 2,
	dueDateToleranceRed = 0,
}: KanbanListProps) {
	const { cards, loading, addCard } = useCards(list.id);
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
		const newCard = await addCard({ title });
		if (newCard) {
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

	const handleDragEnd = (result: any) => {
		if (!result.destination) return;

		const cardId = Number(result.draggableId);
		const newListId = list.id;
		const newPosition = result.destination.index;

		onCardMove(cardId, newListId, newPosition);
	};

	return (
		<div className="w-72 flex-shrink-0 flex flex-col bg-background rounded-lg shadow-sm border">
			{/* List Header */}
			<div className="p-3 border-b flex items-center justify-between">
				<h3 className="font-semibold">{list.name}</h3>
				<div className="flex items-center gap-1">
					<span className="text-xs text-muted-foreground">{cards.length}</span>
					<Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleEditList}>
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
			<Droppable droppableId={`list-${list.id}`} type="card">
				{(provided, snapshot) => (
					<div
						ref={provided.innerRef}
						{...provided.droppableProps}
						className={`flex-1 p-3 space-y-2 overflow-y-auto min-h-[200px] max-h-[calc(100vh-300px)] ${
							snapshot.isDraggingOver ? 'bg-muted/50' : ''
						}`}
					>
						{loading ? (
							<div className="text-center py-4">
								<p className="text-xs text-muted-foreground">Cargando...</p>
							</div>
						) : cards.length === 0 ? (
							<div className="text-center py-4">
								<p className="text-xs text-muted-foreground">No hay tarjetas</p>
							</div>
						) : (
							cards.map((card, index) => (
								<Draggable key={card.id} draggableId={`card-${card.id}`} index={index}>
									{(provided, snapshot) => (
										<div
											ref={provided.innerRef}
											{...provided.draggableProps}
											{...provided.dragHandleProps}
											className={`${snapshot.isDragging ? 'rotate-3 shadow-lg' : ''}`}
										>
											<KanbanCard
												card={card}
												onClick={() => onCardClick(card.id)}
												dueDateToleranceYellow={dueDateToleranceYellow}
												dueDateToleranceRed={dueDateToleranceRed}
											/>
										</div>
									)}
								</Draggable>
							))
						)}
						{provided.placeholder}
					</div>
				)}
			</Droppable>

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
