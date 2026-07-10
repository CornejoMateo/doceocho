'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, MoreVertical, Trash2 } from 'lucide-react';
import { useBoards } from '@/hooks/kanban/use-boards';
import type { Board, BoardFormData } from '@/components/business/kanban/types';
import { BoardCreationModal } from '@/components/business/kanban/board-creation-modal';
import { BoardDeleteModal } from '@/components/business/kanban/board-delete-modal';
import { BoardEditModal } from '@/components/business/kanban/board-edit-modal';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { translateError } from '@/lib/error-translator';
import { useAuth } from '@/components/provider/auth-provider';

export default function KanbanPage() {
	const router = useRouter();
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [boardToDelete, setBoardToDelete] = useState<Board | null>(null);
	const [boardToEdit, setBoardToEdit] = useState<Board | null>(null);
	const { boards, loading, error, fetchBoards, addBoard, editBoard, removeBoard } = useBoards();

	const { user } = useAuth();
	const isAuthorized = user?.role === 'Admin';

	useEffect(() => {
		fetchBoards();
	}, [fetchBoards]);

	const handleCreateBoard = async (boardData: BoardFormData) => {
		await addBoard(boardData);
	};

	const handleBoardClick = (boardId: number) => {
		router.push(`/kanban/${boardId}`);
	};

	const handleEditBoard = (board: Board, e: React.MouseEvent) => {
		e.stopPropagation();
		setBoardToEdit(board);
	};

	const handleSaveBoardName = (name: string) => {
		if (boardToEdit) {
			editBoard(boardToEdit.id, { name });
		}
	};

	const handleDeleteBoard = (board: Board, e: React.MouseEvent) => {
		e.stopPropagation();
		setBoardToDelete(board);
	};

	const handleConfirmDelete = () => {
		if (boardToDelete) {
			removeBoard(boardToDelete.id);
			setBoardToDelete(null);
		}
	};

	return (
		<DashboardLayout>
			<div className="container mx-auto p-6">
				<div className="flex items-center justify-between mb-6">
					<div>
						<h1 className="text-3xl font-bold">Tableros Kanban</h1>
						<p className="text-muted-foreground">Gestiona tus proyectos con tableros</p>
					</div>
					{isAuthorized && (
						<Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
							<Plus className="h-4 w-4" />
							Crear Tablero
						</Button>
					)}
				</div>

				{loading ? (
					<div className="text-center py-12">
						<p className="text-muted-foreground">Cargando tableros...</p>
					</div>
				) : error ? (
					<div className="text-center py-12">
						<p className="text-destructive">Error: {translateError(error)}</p>
					</div>
				) : boards.length === 0 ? (
					<div className="text-center py-12">
						<p className="text-muted-foreground mb-4">No tienes tableros aún</p>
						<Button onClick={() => setIsCreateModalOpen(true)} variant="outline" className="gap-2">
							<Plus className="h-4 w-4" />
							Crear tu primer tablero
						</Button>
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
						{boards.map((board) => (
							<Card
								key={board.id}
								className="p-4 cursor-pointer hover:shadow-md transition-shadow"
								style={{ borderTop: `4px solid ${board.color}` }}
								onClick={() => handleBoardClick(board.id)}
							>
								<div className="flex items-start justify-between mb-2">
									<h3 className="font-semibold text-lg">{board.name}</h3>
									<div className="flex items-center gap-1">
										<Button
											variant="ghost"
											size="icon"
											className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
											onClick={(e) => handleDeleteBoard(board, e)}
											title="Eliminar tablero"
										>
											<Trash2 className="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											className="h-6 w-6"
											onClick={(e) => handleEditBoard(board, e)}
											title="Editar nombre"
										>
											<MoreVertical className="h-4 w-4" />
										</Button>
									</div>
								</div>
								{board.description && (
									<p className="text-sm text-muted-foreground mb-3 line-clamp-2">
										{board.description}
									</p>
								)}
							</Card>
						))}
					</div>
				)}
			</div>

			{/* Board Creation Modal */}
			<BoardCreationModal
				open={isCreateModalOpen}
				onOpenChange={setIsCreateModalOpen}
				onCreate={handleCreateBoard}
			/>

			{/* Board Delete Modal */}
			<BoardDeleteModal
				board={boardToDelete}
				open={boardToDelete !== null}
				onOpenChange={(open) => !open && setBoardToDelete(null)}
				onConfirm={handleConfirmDelete}
			/>

			{/* Board Edit Modal */}
			<BoardEditModal
				board={boardToEdit}
				open={boardToEdit !== null}
				onOpenChange={(open) => !open && setBoardToEdit(null)}
				onSave={handleSaveBoardName}
			/>
		</DashboardLayout>
	);
}
