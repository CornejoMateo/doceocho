import { getSupabaseClient } from '../supabase-client';
import type {
	Board,
	BoardWithMembers,
	BoardFormData,
	BoardMember,
} from '@/components/business/kanban/types';

const TABLE = 'kanban_boards';

export async function getBoardsCount(): Promise<{ data: number; error: any }> {
	const supabase = getSupabaseClient();
	const { count, error } = await supabase.from(TABLE).select('*', { count: 'exact', head: true });
	return { data: count || 0, error };
}

export async function listBoards(): Promise<{ data: Board[] | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).select('*').eq('is_archived', false);
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

	const payload = {
		...board,
	};

	const { data, error } = await supabase.from(TABLE).insert(payload).select().single();
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
	const { error } = await supabase.from(TABLE).delete().eq('id', id);
	return { data: null, error };
}

export async function duplicateBoard(id: number): Promise<{ data: Board | null; error: any }> {
	const supabase = getSupabaseClient();

	// Get the original board
	const { data: originalBoard, error: fetchError } = await getBoardById(id);
	if (fetchError || !originalBoard) return { data: null, error: fetchError };

	// Create the duplicate
	const { data: newBoard, error: createError } = await createBoard({
		name: `${originalBoard.name} (copia)`,
		description: originalBoard.description || undefined,
		color: originalBoard.color,
	});

	if (createError || !newBoard) return { data: null, error: createError };

	// TODO: Duplicate lists, cards, labels, etc. (this would require additional functions)

	return { data: newBoard, error: null };
}

export async function toggleBoardFavorite(
	id: number,
	isFavorite: boolean
): Promise<{ data: Board | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.update({ is_favorite: isFavorite })
		.eq('id', id)
		.select()
		.single();
	return { data, error };
}

export async function archiveBoard(
	id: number,
	isArchived: boolean
): Promise<{ data: Board | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.update({ is_archived: isArchived })
		.eq('id', id)
		.select()
		.single();
	return { data, error };
}
