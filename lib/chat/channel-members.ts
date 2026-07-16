'use server';

import { getCurrentUser } from '@/lib/auth';
import { getServerSupabaseClient } from '@/lib/get-server-supabase-client';
import { createClient } from '@supabase/supabase-js';

const TABLE = 'channel_members';

export async function addChannelMember(
	channelId: number,
	userId: string
): Promise<{ success: boolean; error?: string }> {
	try {
		const supabase = await getServerSupabaseClient();
		const { error } = await supabase
			.from(TABLE)
			.insert({ channel_id: channelId, user_id: userId })
			.select()
			.single();

		if (error) {
			return { success: false, error: error.message };
		}
		return { success: true };
	} catch (error: any) {
		return { success: false, error: error.message };
	}
}

export async function addMemberToChannelAction(channelId: number, userId: string) {
	try {
		await getCurrentUser();

		const adminSupabase = createClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			process.env.SUPABASE_SERVICE_ROLE_KEY!
		);

		const { error } = await adminSupabase
			.from(TABLE)
			.insert({ channel_id: channelId, user_id: userId })
			.select()
			.single();

		if (error) {
			return { success: false, error: error.message };
		}
		return { success: true };
	} catch (e: any) {
		return { success: false, error: e.message };
	}
}

export async function removeMemberFromChannelAction(channelId: number, userId: string) {
	try {
		const supabase = await getServerSupabaseClient();
		await getCurrentUser();

		const { error } = await supabase
			.from(TABLE)
			.delete()
			.eq('channel_id', channelId)
			.eq('user_id', userId);

		if (error) return { success: false, error: error.message };
		return { success: true };
	} catch (e: any) {
		return { success: false, error: e.message };
	}
}

let usersCache: { data: any[]; timestamp: number } | null = null;
const USERS_CACHE_TTL = 30_000;

export async function getAvailableUsersAction() {
	try {
		await getCurrentUser();

		if (usersCache && Date.now() - usersCache.timestamp < USERS_CACHE_TTL) {
			return { success: true, data: usersCache.data };
		}

		const supabase = createClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			process.env.SUPABASE_SERVICE_ROLE_KEY!
		);

		const { data, error } = await supabase.from('users').select('*').order('username');

		if (error) return { success: false, error: error.message };

		usersCache = { data: data || [], timestamp: Date.now() };

		return { success: true, data: data || [] };
	} catch (e: any) {
		return { success: false, error: e.message };
	}
}

export async function updateLastReadMessage(messageId: number, channelId: number, userId: string) {
	try {
		const supabase = await getServerSupabaseClient();

		const { error } = await supabase
			.from(TABLE)
			.update({ last_read_message_id: messageId })
			.eq('user_id', userId)
			.eq('channel_id', channelId)
			.or(`last_read_message_id.is.null,last_read_message_id.lt.${messageId}`);

		return { success: !error, error };
	} catch (error) {
		return { success: false, error };
	}
}
