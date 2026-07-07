import { useState, useCallback, useEffect } from 'react';
import { getCardWithRelations, updateCard, deleteCard } from '@/lib/kanban/cards';
import { uploadKanbanFile, deleteKanbanFile } from '@/lib/kanban/files';
import type { CardWithRelations } from '@/components/business/kanban/types';

export function useCard(cardId: number | null) {
	const [card, setCard] = useState<CardWithRelations | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fetchCard = useCallback(async () => {
		if (!cardId) return;
		setLoading(true);
		setError(null);
		const { data, error } = await getCardWithRelations(cardId);
		if (error) {
			setError(error.message);
		} else {
			setCard(data);
		}
		setLoading(false);
	}, [cardId]);

	const updateCardInfo = useCallback(
		async (
			changes: Partial<Omit<CardWithRelations, 'id' | 'created_at' | 'list_id' | 'files' | 'list'>>
		) => {
			if (!cardId) return null;
			const { data, error } = await updateCard(cardId, changes);
			if (!error && data) {
				setCard((prev) => (prev ? { ...prev, ...data } : null));
			}
			return data;
		},
		[cardId]
	);

	// Attachments
	const uploadFile = useCallback(
		async (file: File, displayName?: string | null) => {
			if (!cardId) return { data: null, error: 'No card ID provided' };
			const { data, error } = await uploadKanbanFile(cardId, file, displayName);
			if (!error && data) {
				await fetchCard();
			}
			return { data, error };
		},
		[cardId, fetchCard]
	);

	const removeAttachment = useCallback(
		async (attachmentId: number) => {
			const { error } = await deleteKanbanFile(attachmentId);
			if (!error) {
				await fetchCard();
			}
			return { error };
		},
		[fetchCard]
	);

	const removeCard = useCallback(async () => {
		if (!cardId) return;
		const { error } = await deleteCard(cardId);
		return { error };
	}, [cardId]);

	useEffect(() => {
		fetchCard();
	}, [fetchCard]);

	return {
		card,
		loading,
		error,
		fetchCard,
		updateCard: updateCardInfo,
		uploadFile,
		removeAttachment,
		removeCard,
	};
}
