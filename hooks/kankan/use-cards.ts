import { useState, useCallback, useEffect } from 'react';
import {
	getCardsByListId,
	createCard,
	updateCard,
	moveCard,
	updateCardPosition,
	deleteCard,
	archiveCard,
} from '@/lib/kanban/cards';
import type { Card, CardFormData } from '../types';

export function useCards(listId: number | null) {
	const [cards, setCards] = useState<Card[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fetchCards = useCallback(async () => {
		if (!listId) return;
		setLoading(true);
		setError(null);
		const { data, error } = await getCardsByListId(listId);
		if (error) {
			setError(error.message);
		} else {
			setCards(data || []);
		}
		setLoading(false);
	}, [listId]);

	useEffect(() => {
		fetchCards();
	}, [fetchCards]);

	const addCard = useCallback(
		async (card: CardFormData) => {
			if (!listId) return null;
			setLoading(true);
			setError(null);
			const { data, error } = await createCard(card, listId);
			if (error) {
				setError(error.message);
				setLoading(false);
				return null;
			}
			if (data) {
				setCards((prev) => [...prev, data]);
			}
			setLoading(false);
			return data;
		},
		[listId, cards]
	);

	const editCard = useCallback(
		async (id: number, changes: Partial<Omit<Card, 'id' | 'created_at' | 'list_id'>>) => {
			setLoading(true);
			setError(null);
			const { data, error } = await updateCard(id, changes);
			if (error) {
				setError(error.message);
			} else if (data) {
				setCards((prev) => prev.map((c) => (c.id === id ? data : c)));
			}
			setLoading(false);
			return data;
		},
		[]
	);

	const moveCardToList = useCallback(async (id: number, newListId: number, newPosition: number) => {
		const { data, error } = await moveCard(id, newListId, newPosition);
		if (!error && data) {
			setCards((prev) => prev.filter((c) => c.id !== id));
		}
		return { data, error };
	}, []);

	const changeCardPosition = useCallback(async (id: number, newPosition: number) => {
		const { data, error } = await updateCardPosition(id, newPosition);
		if (!error && data) {
			setCards((prev) => {
				const updated = prev.map((c) => (c.id === id ? data : c));
				return updated.sort((a, b) => a.position - b.position);
			});
		}
		return { data, error };
	}, []);

	const removeCard = useCallback(async (id: number) => {
		setLoading(true);
		setError(null);
		const { error } = await deleteCard(id);
		if (error) {
			setError(error.message);
		} else {
			setCards((prev) => prev.filter((c) => c.id !== id));
		}
		setLoading(false);
	}, []);

	const archiveCardById = useCallback(async (id: number, isArchived: boolean) => {
		const { data, error } = await archiveCard(id, isArchived);
		if (!error && data) {
			setCards((prev) => prev.map((c) => (c.id === id ? data : c)));
		}
		return { data, error };
	}, []);

	return {
		cards,
		loading,
		error,
		fetchCards,
		addCard,
		editCard,
		moveCard: moveCardToList,
		updatePosition: changeCardPosition,
		removeCard,
		archiveCard: archiveCardById,
	};
}
