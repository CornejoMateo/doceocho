import { getSupabaseClient } from '../supabase-client';
import type { List, ListWithCards, ListFormData } from '@/components/business/kanban/types';
import { getCardsByListId, deleteCard } from './cards';

const TABLE = 'kanban_lists';

export async function getListsByBoardId(
	boardId: number
): Promise<{ data: List[] | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = (await supabase
		.from(TABLE)
		.select('*')
		.eq('board_id', boardId)
		.order('created_at', { ascending: true })) as { data: List[] | null; error: any };

	return { data, error };
}

export async function getListById(id: number): Promise<{ data: List | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single();
	return { data, error };
}

export async function getListWithCards(
	id: number
): Promise<{ data: ListWithCards | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.select(
			`
			*,
			cards:kanban_cards(*)
		`
		)
		.eq('id', id)
		.single();

	if (error) return { data: null, error };

	const list = data as any;
	const transformedList: ListWithCards = {
		...list,
		cards: list.cards || [],
	};

	return { data: transformedList, error: null };
}

export async function createList(
	list: ListFormData,
	boardId: number
): Promise<{ data: List | null; error: any }> {
	const supabase = getSupabaseClient();

	const payload = {
		...list,
		board_id: boardId,
	};

	const { data, error } = await supabase.from(TABLE).insert(payload).select().single();
	return { data, error };
}

export async function updateList(
	id: number,
	changes: Partial<Omit<List, 'id' | 'created_at' | 'board_id'>>
): Promise<{ data: List | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).update(changes).eq('id', id).select().single();
	return { data, error };
}

export async function deleteList(id: number): Promise<{ data: null; error: any }> {
	const supabase = getSupabaseClient();

	const { data: cards, error: fetchError } = await getCardsByListId(id);
	if (fetchError) return { data: null, error: fetchError };

	if (cards) {
		for (const card of cards) {
			const { error: deleteError } = await deleteCard(card.id);
			if (deleteError) return { data: null, error: deleteError };
		}
	}

	const { error } = await supabase.from(TABLE).delete().eq('id', id);
	return { data: null, error };
}
