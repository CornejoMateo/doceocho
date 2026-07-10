import { useState, useCallback } from 'react';
import { listBoards, createBoard, updateBoard, deleteBoard } from '@/lib/kanban/boards';
import { useAuth } from '@/components/provider/auth-provider';
import type { Board, BoardFormData } from '@/components/business/kanban/types';

export function useBoards() {
	const [boards, setBoards] = useState<Board[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const { user } = useAuth();

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
	}, [user]);

	const addBoard = useCallback(async (board: BoardFormData) => {
		setLoading(true);
		setError(null);
		const { data, error } = await createBoard(board);
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
		async (id: number, changes: Partial<Omit<Board, 'id' | 'created_at'>>) => {
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
		return { error };
	}, []);

	return {
		boards,
		loading,
		error,
		fetchBoards,
		addBoard,
		editBoard,
		removeBoard,
	};
}
