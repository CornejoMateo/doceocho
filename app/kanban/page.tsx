'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LayoutList, MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { KanbanEmptyState } from '@/components/business/kanban/kanban-empty-state';
import { applyBoardTemplate } from '@/lib/kanban/board-templates';
import { useBoards } from '@/hooks/kanban/use-boards';
import type { Board, BoardFormData } from '@/components/business/kanban/types';
import { BoardCreationModal } from '@/components/business/kanban/board-creation-modal';
import { BoardDeleteModal } from '@/components/business/kanban/board-delete-modal';
import {
	BoardSettingsModal,
	type BoardSettingsChanges,
} from '@/components/business/kanban/board-settings-modal';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { translateError } from '@/lib/error-translator';
import { useAuth } from '@/components/provider/auth-provider';
import { toast } from '@/components/ui/use-toast';

export default function KanbanPage() {
	const router = useRouter();
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [boardToDelete, setBoardToDelete] = useState<Board | null>(null);
	const [boardToEdit, setBoardToEdit] = useState<Board | null>(null);
	const [deletingBoardId, setDeletingBoardId] = useState<number | null>(null);
	const { boards, loading, error, fetchBoards, addBoard, editBoard, removeBoard } = useBoards();

	const { user } = useAuth();
	const isAuthorized = user?.role === 'Admin';

	useEffect(() => {
		fetchBoards();
	}, [fetchBoards]);

	const handleCreateBoard = async (boardData: BoardFormData, templateId: string) => {
		const { data, error } = await addBoard(boardData);

		if (error) {
			toast({
				variant: 'destructive',
				title: 'Error al crear tablero',
				description: translateError(error) || 'Ocurrió un error, intenta de nuevo.',
			});
			return;
		}

		if (!data) return;

		const { createdCount, failedNames } = await applyBoardTemplate(data.id, templateId);

		// The board already exists; a template that only half applied is worth
		// mentioning, but it is not a failure the user has to undo.
		if (failedNames.length > 0) {
			toast({
				variant: 'destructive',
				title: 'El tablero se creó, pero faltaron listas',
				description: `No pudimos crear: ${failedNames.join(', ')}. Agregalas a mano.`,
			});
			return;
		}

		toast({
			title: 'Tablero creado correctamente',
			description:
				createdCount > 0 ? `Se crearon ${createdCount} listas para que arranques.` : undefined,
		});
	};

	const handleBoardClick = (boardId: number) => {
		router.push(`/kanban/${boardId}`);
	};

	const handleEditBoard = (board: Board) => {
		setBoardToEdit(board);
	};

	const handleSaveBoardSettings = async (changes: BoardSettingsChanges) => {
		if (boardToEdit) {
			const { data, error } = await editBoard(boardToEdit.id, changes);
			if (error) {
				toast({
					variant: 'destructive',
					title: 'Error al guardar',
					description: translateError(error) || 'Ocurrió un error, intenta de nuevo.',
				});
			} else if (data) {
				toast({ title: 'Tablero actualizado correctamente' });
			}
		}
	};

	const handleDeleteBoard = (board: Board) => {
		setBoardToDelete(board);
	};

	const handleConfirmDelete = async () => {
		if (boardToDelete) {
			setDeletingBoardId(boardToDelete.id);
			toast({ title: 'Eliminando tablero...' });
			const { error } = await removeBoard(boardToDelete.id);
			if (error) {
				toast({
					variant: 'destructive',
					title: 'Error al eliminar',
					description: translateError(error) || 'Ocurrió un error, intenta de nuevo.',
				});
			} else {
				toast({ title: 'Tablero eliminado correctamente' });
			}
			setDeletingBoardId(null);
			setBoardToDelete(null);
		}
	};

	return (
		<DashboardLayout>
			<div className="container mx-auto p-6">
				<div className="flex items-center justify-between mb-6">
					<div>
						<h1 className="text-3xl font-bold">Tableros Kanban</h1>
						{isAuthorized && (
							<p className="text-muted-foreground">Gestiona tus proyectos con tableros</p>
						)}
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
					<KanbanEmptyState
						icon={LayoutList}
						title="Todavía no hay tableros"
						description="Un tablero es un trabajo que querés seguir de principio a fin. Adentro creás listas (las etapas) y vas moviendo tarjetas de una a otra a medida que avanza."
						action={
							isAuthorized ? (
								<Button
									onClick={() => setIsCreateModalOpen(true)}
									variant="outline"
									className="gap-2"
								>
									<Plus className="h-4 w-4" />
									Crear tu primer tablero
								</Button>
							) : undefined
						}
					/>
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
									{isAuthorized && (
										<div onClick={(event) => event.stopPropagation()}>
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button
														variant="ghost"
														size="icon"
														className="h-6 w-6"
														aria-label={`Opciones de ${board.name}`}
													>
														<MoreVertical className="h-4 w-4" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													<DropdownMenuItem
														onSelect={() => handleEditBoard(board)}
														className="gap-2"
													>
														<Pencil className="h-4 w-4" />
														Configuración
													</DropdownMenuItem>
													<DropdownMenuSeparator />
													{/* Behind the menu so it is never one stray click away. */}
													<DropdownMenuItem
														onSelect={() => handleDeleteBoard(board)}
														className="gap-2 text-destructive focus:text-destructive"
													>
														<Trash2 className="h-4 w-4" />
														Eliminar tablero
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</div>
									)}
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
				loading={deletingBoardId !== null}
			/>

			{/* Board Edit Modal */}
			<BoardSettingsModal
				board={boardToEdit}
				open={boardToEdit !== null}
				onOpenChange={(open: boolean) => !open && setBoardToEdit(null)}
				onSave={handleSaveBoardSettings}
			/>
		</DashboardLayout>
	);
}
