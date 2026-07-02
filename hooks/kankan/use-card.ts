import { useState, useCallback, useEffect } from 'react';
import { getCardWithRelations, updateCard, deleteCard } from '@/lib/kanban/cards';
import { getCardLabels, addLabelToCard, removeLabelFromCard } from '@/lib/kanban/labels';
import {
	getAttachmentsByCardId,
	uploadAttachment,
	deleteAttachment,
} from '@/lib/kanban/attachments';
import type { CardWithRelations, CardFormData, Label, Attachment } from '../types';

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
			changes: Partial<
				Omit<
					CardWithRelations,
					| 'id'
					| 'created_at'
					| 'list_id'
					| 'labels'
					| 'members'
					| 'checklists'
					| 'comments'
					| 'attachments'
					| 'activities'
					| 'crm_links'
					| 'custom_field_values'
				>
			>
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

	// Labels
	const addLabel = useCallback(
		async (labelId: number) => {
			if (!cardId) return null;
			const { data, error } = await addLabelToCard(cardId, labelId);
			if (!error && data) {
				await fetchCard();
			}
			return data;
		},
		[cardId, fetchCard]
	);

	const removeLabel = useCallback(
		async (labelId: number) => {
			if (!cardId) return;
			const { error } = await removeLabelFromCard(cardId, labelId);
			if (!error) {
				await fetchCard();
			}
		},
		[cardId, fetchCard]
	);

	// Attachments
	const uploadFile = useCallback(
		async (file: File, userId: string) => {
			if (!cardId) return { data: null, error: 'No card ID provided' };
			const { data, error } = await uploadAttachment(file, cardId, userId);
			if (!error && data) {
				await fetchCard();
			}
			return { data, error };
		},
		[cardId, fetchCard]
	);

	const removeAttachment = useCallback(
		async (attachmentId: number) => {
			const { error } = await deleteAttachment(attachmentId);
			if (!error) {
				await fetchCard();
			}
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
		addLabel,
		removeLabel,
		uploadFile,
		removeAttachment,
		removeCard,
	};
}
