import { getSupabaseClient } from '@/lib/supabase-client';
import { ChannelWithLastMessage } from './chat-types';

export async function getChannelMembers(channelId: number) {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from('channel_members')
		.select(
			`
            *,
            users (
                uid_user,
                username,
                name,
                last_name,
                role
            )
        `
		)
		.eq('channel_id', channelId);

	if (error) throw error;

	return data;
}

export async function updateLastReadMessage(
	channelId: number,
	lastReadMessageId: number,
	userId: string
) {
	const supabase = getSupabaseClient();

	const { error } = await supabase
		.from('channel_members')
		.update({
			last_read_message_id: lastReadMessageId,
		})
		.eq('channel_id', channelId)
		.eq('user_id', userId);

	if (error) throw error;
}
