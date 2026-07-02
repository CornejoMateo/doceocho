import { useState, useCallback, useEffect } from 'react';
import { getBoardWithLists, updateBoard } from '@/lib/kanban/boards';
import { getListsByBoardId, createList, updateList, deleteList } from '@/lib/kanban/lists';
import type { BoardWithMembers, List, ListFormData } from '../types';

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
			if (!boardId) return null;
			const { data, error } = await createList(list, boardId);
			if (!error && data) {
				setLists((prev) => [...prev, data]);
			}
			return data;
		},
		[boardId]
	);

	const editList = useCallback(
		async (id: number, changes: Partial<Omit<List, 'id' | 'created_at' | 'board_id'>>) => {
			const { data, error } = await updateList(id, changes);
			if (!error && data) {
				setLists((prev) => prev.map((l) => (l.id === id ? data : l)));
			}
			return data;
		},
		[]
	);

	const removeList = useCallback(async (id: number) => {
		const { error } = await deleteList(id);
		if (!error) {
			setLists((prev) => prev.filter((l) => l.id !== id));
		}
	}, []);

	const updateBoardInfo = useCallback(
		async (
			changes: Partial<
				Omit<BoardWithMembers, 'id' | 'created_at' | 'owner_id' | 'members' | 'lists'>
			>
		) => {
			if (!boardId) return null;
			const { data, error } = await updateBoard(boardId, changes);
			if (!error && data) {
				setBoard((prev) => (prev ? { ...prev, ...data } : null));
			}
			return data;
		},
		[boardId]
	);

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
	};
}
