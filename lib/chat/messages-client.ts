import { getSupabaseClient } from '@/lib/supabase-client';
import { MessageWithUser } from './chat-types';

export type PaginatedMessages = {
	messages: MessageWithUser[];
	hasMore: boolean;
};

export async function getMessages(channelId: number, before?: string): Promise<PaginatedMessages> {
	const supabase = getSupabaseClient();

	let query = supabase
		.from('messages')
		.select(
			`
			id,
			created_at,
			content,
			edited_at,
			deleted_at,
			user_id,
			channel_id,
			reply_to,
			users!inner (
				uid_user,
				username,
				role,
				name,
				last_name
			)
		`
		)
		.eq('channel_id', channelId)
		.order('created_at', { ascending: false })
		.limit(50);

	if (before) {
		query = query.lt('created_at', before);
	}

	const { data, error } = await query;

	if (error) throw error;

	const messages = (data ?? []).reverse().map((m) => ({
		...m,
		users: Array.isArray(m.users) ? m.users[0] : m.users,
	})) as MessageWithUser[];

	return {
		messages,
		hasMore: messages.length === 50,
	};
}

export async function editMessage(messageId: number, content: string) {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from('messages')
		.update({
			content,
			edited_at: new Date().toISOString(),
		})
		.eq('id', messageId)
		.select()
		.single();

	if (error) throw error;

	return data;
}

export async function deleteMessage(messageId: number) {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from('messages')
		.update({
			deleted_at: new Date().toISOString(),
		})
		.eq('id', messageId)
		.select()
		.single();

	return { data, error };
}
