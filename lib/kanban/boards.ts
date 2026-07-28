import { getSupabaseClient } from '../supabase-client';
import type { Board, BoardWithMembers, BoardFormData } from '@/components/business/kanban/types';
import { getListsByBoardId, deleteList } from './lists';

const TABLE = 'kanban_boards';

export async function getBoardsCount(): Promise<{ data: number; error: any }> {
	const supabase = getSupabaseClient();
	const { count, error } = await supabase.from(TABLE).select('*', { count: 'exact', head: true });
	return { data: count || 0, error };
}

export async function listBoards(): Promise<{ data: Board[] | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).select('*');
	return { data, error };
}

export async function getBoardById(
	id: number
): Promise<{ data: BoardWithMembers | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single();

	if (error) return { data: null, error };

	// Transform the data to match the expected structure
	const board = data as any;
	const transformedBoard: BoardWithMembers = {
		...board,
		members: [],
	};

	return { data: transformedBoard, error: null };
}

export async function getBoardWithLists(
	id: number
): Promise<{ data: BoardWithMembers | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.select(
			`
			*,
			lists:kanban_lists(
				*,
				cards:kanban_cards(*)
			)
		`
		)
		.eq('id', id)
		.single();

	if (error) return { data: null, error };

	// Transform the data to match the expected structure
	const board = data as any;
	const transformedBoard: BoardWithMembers = {
		...board,
		members: [],
		lists: board.lists || [],
	};

	return { data: transformedBoard, error: null };
}

export async function createBoard(
	board: BoardFormData
): Promise<{ data: Board | null; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase.rpc('create_board_with_member', {
		p_name: board.name,
		p_description: board.description ?? null,
		p_color: board.color ?? '#4F5C4D',
	});

	return { data, error };
}

export async function updateBoard(
	id: number,
	changes: Partial<Omit<Board, 'id' | 'created_at'>>
): Promise<{ data: Board | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).update(changes).eq('id', id).select().single();
	return { data, error };
}

export async function deleteBoard(id: number): Promise<{ data: null; error: any }> {
	const supabase = getSupabaseClient();

	const { data: lists, error: fetchError } = await getListsByBoardId(id);
	if (fetchError) return { data: null, error: fetchError };

	if (lists) {
		for (const list of lists) {
			const { error: deleteError } = await deleteList(list.id);
			if (deleteError) return { data: null, error: deleteError };
		}
	}

	const { error } = await supabase.from(TABLE).delete().eq('id', id);
	return { data: null, error };
}
