import { getSupabaseClient } from '@/lib/supabase-client';
import { MessageWithUser } from './chat-types';

export async function getMessages(channelId: number) {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
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
		.order('created_at', { ascending: true });

	if (error) {
		throw error;
	}

	return (data ?? []).map((m) => ({
		...m,
		users: Array.isArray(m.users) ? m.users[0] : m.users,
	})) as MessageWithUser[];
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

	if (error) throw error;

	return data;
}
