import { getSupabaseClient } from '../supabase-client';
import type { Card, CardWithRelations, CardFormData } from '@/components/business/kanban/types';
import { getKanbanFileByCardId, deleteKanbanFile } from '@/lib/kanban/files';

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
			list:kanban_lists(*),
			files:kanban_files(*)
		`
		)
		.eq('id', id)
		.single();

	if (error) return { data: null, error };

	const { data: files } = await getKanbanFileByCardId(id);

	const transformedCard: CardWithRelations = {
		...(data as any),
		files: files || [],
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

	// Get current card
	const { data: card, error: fetchError } = await supabase
		.from(TABLE)
		.select('id, list_id, position')
		.eq('id', id)
		.single();

	if (fetchError || !card) return { data: null, error: fetchError };

	const oldListId = card.list_id;
	const oldPosition = card.position;

	if (oldListId === newListId && oldPosition === newPosition) {
		return { data: null as any, error: null };
	}

	// Get all cards from the affected lists
	const listIds = oldListId === newListId ? [oldListId] : [oldListId, newListId];
	const { data: allCards, error: cardsError } = await supabase
		.from(TABLE)
		.select('id, list_id, position')
		.in('list_id', listIds)
		.order('position', { ascending: true });

	if (cardsError) return { data: null, error: cardsError };

	// Build the new card list for each affected list
	const cardsByList: Record<number, { id: number; list_id: number; position: number }[]> = {};
	for (const c of allCards ?? []) {
		if (!cardsByList[c.list_id]) cardsByList[c.list_id] = [];
		if (c.id !== id) cardsByList[c.list_id].push(c);
	}

	// Insert the moved card at the new position in the destination list
	if (!cardsByList[newListId]) cardsByList[newListId] = [];
	cardsByList[newListId].splice(newPosition, 0, { id, list_id: newListId, position: 0 });

	// Reassign positions for all affected lists
	const updates: { id: number; position: number; list_id: number }[] = [];
	for (const [listIdStr, cards] of Object.entries(cardsByList)) {
		cards.forEach((c, idx) => {
			if (c.id === id || c.position !== idx) {
				updates.push({ id: c.id, position: idx, list_id: Number(listIdStr) });
			}
		});
	}

	// Apply all updates
	for (const u of updates) {
		const { error: updateError } = await supabase
			.from(TABLE)
			.update({ position: u.position, list_id: u.list_id })
			.eq('id', u.id);
		if (updateError) return { data: null, error: updateError };
	}

	const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single();

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
	const { data: attachments, error: fetchError } = await getKanbanFileByCardId(id);

	if (fetchError) return { data: null, error: fetchError };

	if (attachments) {
		for (const attachment of attachments) {
			const { error: deleteError } = await deleteKanbanFile(attachment.id);
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
