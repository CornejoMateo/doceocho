import { getSupabaseClient } from '../supabase-client';
import type { BoardMember } from '@/components/business/kanban/types';

const TABLE = 'kanban_board_members';

export async function getBoardMembers(
	boardId: number
): Promise<{ data: BoardMember[] | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).select('*').eq('board_id', boardId);
	return { data, error };
}

export async function getBoardMemberById(
	id: number
): Promise<{ data: BoardMember | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single();
	return { data, error };
}

export async function addBoardMember(
	member: string, // uid
	boardId: number
): Promise<{ data: BoardMember | null; error: any }> {
	const supabase = getSupabaseClient();
	const payload = {
		user_id: member,
		board_id: boardId,
	};
	console.log('[addBoardMember] inserting:', payload);
	const { data, error } = await supabase.from(TABLE).insert(payload).select().single();
	console.log('[addBoardMember] result:', { data, error });
	return { data, error };
}

export async function updateBoardMember(
	id: number,
	changes: Partial<Omit<BoardMember, 'id' | 'created_at' | 'board_id' | 'user_id'>>
): Promise<{ data: BoardMember | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).update(changes).eq('id', id).select().single();
	return { data, error };
}

export async function removeBoardMember(id: number): Promise<{ data: null; error: any }> {
	const supabase = getSupabaseClient();
	const { error } = await supabase.from(TABLE).delete().eq('id', id);
	return { data: null, error };
}

export async function removeBoardMemberByUser(
	boardId: number,
	userId: string
): Promise<{ data: null; error: any }> {
	const supabase = getSupabaseClient();
	const { error } = await supabase
		.from(TABLE)
		.delete()
		.eq('board_id', boardId)
		.eq('user_id', userId);
	return { data: null, error };
}
