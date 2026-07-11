import { useState, useCallback, useEffect } from 'react';
import { getBoardWithLists, updateBoard } from '@/lib/kanban/boards';
import { getListsByBoardId, createList, updateList, deleteList } from '@/lib/kanban/lists';
import { useOptimisticMutation } from '@/hooks/use-optimistic-mutation';
import type {
	BoardWithMembers,
	List,
	ListFormData,
	Card,
} from '@/components/business/kanban/types';
import { moveCard } from '@/lib/kanban/cards';

export function useBoard(boardId: number | null) {
	const [board, setBoard] = useState<BoardWithMembers | null>(null);
	const [lists, setLists] = useState<List[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fetchBoard = useCallback(async () => {
		if (!boardId) return;
		setLoading(true);
		setError(null);
		const { data, error } = await getBoardWithLists(boardId);
		if (error) {
			setError(error.message);
		} else {
			setBoard(data);
			setLists(data?.lists || []);
		}
		setLoading(false);
	}, [boardId]);

	const fetchLists = useCallback(async () => {
		if (!boardId) return;
		const { data, error } = await getListsByBoardId(boardId);
		if (!error && data) {
			setLists(data);
		}
	}, [boardId]);

	const addList = useCallback(
		async (list: ListFormData) => {
			if (!boardId) return { data: null, error: null };
			const { data, error } = await createList(list, boardId);
			if (!error && data) {
				setLists((prev) => [...prev, data]);
			}
			return { data, error };
		},
		[boardId]
	);

	const editList = useCallback(
		async (id: number, changes: Partial<Omit<List, 'id' | 'created_at' | 'board_id'>>) => {
			const { data, error } = await updateList(id, changes);
			if (!error && data) {
				setLists((prev) => prev.map((l) => (l.id === id ? data : l)));
			}
			return { data, error };
		},
		[]
	);

	const removeList = useCallback(async (id: number) => {
		const { error } = await deleteList(id);
		if (!error) {
			setLists((prev) => prev.filter((l) => l.id !== id));
		}
		return { error };
	}, []);

	const updateBoardInfo = useCallback(
		async (changes: Partial<Omit<BoardWithMembers, 'id' | 'created_at' | 'members' | 'lists'>>) => {
			if (!boardId) return { data: null, error: null };
			const { data, error } = await updateBoard(boardId, changes);
			if (!error && data) {
				setBoard((prev) => (prev ? { ...prev, ...data } : null));
			}
			return { data, error };
		},
		[boardId]
	);

	const moveCardOptimistic = useCallback(
		(cardId: number, newListId: number, newPosition: number) => {
			setLists((prevLists) => {
				// Find the card and its source list
				let cardToMove: Card | null = null;
				let sourceListId: number | null = null;

				for (const list of prevLists) {
					const foundCard = (list.cards || []).find((c) => c.id === cardId);
					if (foundCard) {
						cardToMove = foundCard;
						sourceListId = list.id;
						break;
					}
				}

				if (!cardToMove || sourceListId === null) {
					return prevLists;
				}

				// Remove card from source list
				const listsWithoutCard = prevLists.map((list) => {
					if (list.id === sourceListId) {
						return {
							...list,
							cards: (list.cards || []).filter((c) => c.id !== cardId),
						};
					}
					return list;
				});

				// Add card to destination list at new position
				return listsWithoutCard.map((list) => {
					if (list.id === newListId) {
						const newCards = [...(list.cards || [])];
						newCards.splice(newPosition, 0, {
							...cardToMove,
							list_id: newListId,
							position: newPosition,
						});
						return { ...list, cards: newCards };
					}
					return list;
				});
			});
		},
		[]
	);

	const { mutate: optimisticallyMoveCard } = useOptimisticMutation<
		any,
		{ cardId: number; newListId: number; newPosition: number },
		any
	>({
		optimisticUpdate: ({ cardId, newListId, newPosition }) => {
			moveCardOptimistic(cardId, newListId, newPosition);
		},
		mutationFn: async ({ cardId, newListId, newPosition }) => {
			return moveCard(cardId, newListId, newPosition);
		},
		onError: (error) => {
			// Revert on error by fetching the board
			console.error('Error moving card:', error);
			fetchBoard();
		},
	});

	useEffect(() => {
		fetchBoard();
	}, [fetchBoard]);

	return {
		board,
		lists,
		loading,
		error,
		fetchBoard,
		fetchLists,
		addList,
		editList,
		removeList,
		updateBoard: updateBoardInfo,
		optimisticallyMoveCard,
	};
}
