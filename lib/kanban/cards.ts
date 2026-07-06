import { getSupabaseClient } from '../supabase-client';
import type { Card, CardWithRelations, CardFormData } from '@/components/business/kanban/types';
import { getAttachmentsByCardId, deleteAttachment } from './attachments';

const TABLE = 'kanban_cards';

export async function getCardsByListId(
	listId: number
): Promise<{ data: Card[] | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.select('*')
		.eq('list_id', listId)
		.order('position', { ascending: true });
	return { data, error };
}

export async function getCardById(id: number): Promise<{ data: Card | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single();
	return { data, error };
}

export async function getCardWithRelations(
	id: number
): Promise<{ data: CardWithRelations | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.select(
			`
			*,
			list:kanban_lists(*)
		`
		)
		.eq('id', id)
		.single();

	if (error) return { data: null, error };

	const card = data as any;
	const transformedCard: CardWithRelations = {
		...card,
		files: card.files || [],
	};

	return { data: transformedCard, error: null };
}

export async function createCard(
	card: CardFormData,
	listId: number
): Promise<{ data: Card | null; error: any }> {
	const supabase = getSupabaseClient();

	// Get the highest position
	const { data: maxPos } = await supabase
		.from(TABLE)
		.select('position')
		.eq('list_id', listId)
		.order('position', { ascending: false })
		.limit(1)
		.single();

	const nextPosition = maxPos ? maxPos.position + 1 : 0;

	const payload = {
		...card,
		list_id: listId,
		position: nextPosition,
	};

	const { data, error } = await supabase.from(TABLE).insert(payload).select().single();
	return { data, error };
}

export async function updateCard(
	id: number,
	changes: Partial<Omit<Card, 'id' | 'created_at' | 'list_id'>>
): Promise<{ data: Card | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).update(changes).eq('id', id).select().single();
	return { data, error };
}

export async function moveCard(
	id: number,
	newListId: number,
	newPosition: number
): Promise<{ data: Card | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.update({ list_id: newListId, position: newPosition })
		.eq('id', id)
		.select()
		.single();
	return { data, error };
}

export async function updateCardPosition(
	id: number,
	newPosition: number
): Promise<{ data: Card | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.update({ position: newPosition })
		.eq('id', id)
		.select()
		.single();
	return { data, error };
}

export async function deleteCard(id: number): Promise<{ data: null; error: any }> {
	const supabase = getSupabaseClient();

	// Delete all attachments (files from storage + records)
	const { data: attachments, error: fetchError } = await getAttachmentsByCardId(id);

	if (fetchError) return { data: null, error: fetchError };

	if (attachments) {
		for (const attachment of attachments) {
			const { error: deleteError } = await deleteAttachment(attachment.id);
			if (deleteError) return { data: null, error: deleteError };
		}
	}

	// Then delete the card itself
	const { error } = await supabase.from(TABLE).delete().eq('id', id);
	return { data: null, error };
}

export async function completeCard(id: number): Promise<{ data: Card | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.update({ completed_at: new Date().toISOString() })
		.eq('id', id)
		.select()
		.single();
	return { data, error };
}

export async function uncompleteCard(id: number): Promise<{ data: Card | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.update({ completed_at: null })
		.eq('id', id)
		.select()
		.single();
	return { data, error };
}
