import { useState, useCallback } from 'react';
import {
	listBoards,
	createBoard,
	updateBoard,
	deleteBoard,
	toggleBoardFavorite,
	archiveBoard,
} from '@/lib/kanban/boards';
import type { Board, BoardFormData } from '../types';

export function useBoards() {
	const [boards, setBoards] = useState<Board[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fetchBoards = useCallback(async () => {
		setLoading(true);
		setError(null);
		const { data, error } = await listBoards();
		if (error) {
			setError(error.message);
		} else {
			setBoards(data || []);
		}
		setLoading(false);
	}, []);

	const addBoard = useCallback(async (board: BoardFormData, ownerId: string) => {
		setLoading(true);
		setError(null);
		const { data, error } = await createBoard(board, ownerId);
		if (error) {
			setError(error.message);
			setLoading(false);
			return null;
		}
		if (data) {
			setBoards((prev) => [...prev, data]);
		}
		setLoading(false);
		return data;
	}, []);

	const editBoard = useCallback(
		async (id: number, changes: Partial<Omit<Board, 'id' | 'created_at' | 'owner_id'>>) => {
			setLoading(true);
			setError(null);
			const { data, error } = await updateBoard(id, changes);
			if (error) {
				setError(error.message);
			} else if (data) {
				setBoards((prev) => prev.map((b) => (b.id === id ? data : b)));
			}
			setLoading(false);
			return data;
		},
		[]
	);

	const removeBoard = useCallback(async (id: number) => {
		setLoading(true);
		setError(null);
		const { error } = await deleteBoard(id);
		if (error) {
			setError(error.message);
		} else {
			setBoards((prev) => prev.filter((b) => b.id !== id));
		}
		setLoading(false);
	}, []);

	const toggleFavorite = useCallback(async (id: number, isFavorite: boolean) => {
		const { data, error } = await toggleBoardFavorite(id, isFavorite);
		if (!error && data) {
			setBoards((prev) => prev.map((b) => (b.id === id ? data : b)));
		}
		return { data, error };
	}, []);

	const archiveBoardById = useCallback(async (id: number, isArchived: boolean) => {
		const { data, error } = await archiveBoard(id, isArchived);
		if (!error && data) {
			setBoards((prev) => prev.map((b) => (b.id === id ? data : b)));
		}
		return { data, error };
	}, []);

	return {
		boards,
		loading,
		error,
		fetchBoards,
		addBoard,
		editBoard,
		removeBoard,
		toggleFavorite,
		archiveBoard: archiveBoardById,
	};
}
