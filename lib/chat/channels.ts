'use server';

import { getCurrentUser } from '@/lib/auth';
import { getServerSupabaseClient } from '@/lib/get-server-supabase-client';
import { addChannelMember } from '@/lib/chat/channel-members';
import type { Channel, ChannelWithLastMessage } from '@/lib/chat/chat-types';

const TABLE = 'channels';
const CHANNEL_FILES_TABLE = 'channel_files';
const CHANNEL_FILES_BUCKET = 'chat-files';
const CHANNEL_FILES_LIST_PAGE_SIZE = 1000;

// Read-only: paginates channel_files to collect storage paths for later cleanup.
async function listChannelStoragePaths(
	supabase: Awaited<ReturnType<typeof getServerSupabaseClient>>,
	channelId: number
): Promise<string[]> {
	const paths: string[] = [];
	let from = 0;
	while (true) {
		const { data, error } = await supabase
			.from(CHANNEL_FILES_TABLE)
			.select('storage_path')
			.eq('channel_id', channelId)
			.range(from, from + CHANNEL_FILES_LIST_PAGE_SIZE - 1);

		if (error) {
			console.error('Failed to list channel files for cleanup:', error);
			return paths;
		}
		if (!data || data.length === 0) return paths;

		paths.push(...data.map((row: { storage_path: string }) => row.storage_path));

		if (data.length < CHANNEL_FILES_LIST_PAGE_SIZE) return paths;
		from += CHANNEL_FILES_LIST_PAGE_SIZE;
	}
}

// Best-effort blob cleanup so a deleted channel doesn't orphan storage objects.
async function deleteChannelStorageFiles(
	supabase: Awaited<ReturnType<typeof getServerSupabaseClient>>,
	paths: string[]
) {
	for (let i = 0; i < paths.length; i += CHANNEL_FILES_LIST_PAGE_SIZE) {
		const batch = paths.slice(i, i + CHANNEL_FILES_LIST_PAGE_SIZE);
		const { error } = await supabase.storage.from(CHANNEL_FILES_BUCKET).remove(batch);
		if (error) {
			console.error('Failed to remove channel file blobs:', error);
		}
	}
}

export async function createChannelAction(
	name: string,
	description: string
): Promise<{ success: boolean; error?: string; data?: Channel }> {
	try {
		const supabase = await getServerSupabaseClient();
		const user = await getCurrentUser();

		const { data, error } = await supabase
			.from(TABLE)
			.insert({ name, description })
			.select()
			.single();

		if (error) {
			return { success: false, error: error.message };
		}
		if (!data) {
			return { success: false, error: 'Error al crear el canal' };
		}

		const memberResult = await addChannelMember(data.id, user.id);
		if (memberResult.error) {
			await supabase.from(TABLE).delete().eq('id', data.id);
			return { success: false, error: memberResult.error };
		}

		return { success: true, data };
	} catch (error: any) {
		return { success: false, error: error.message || 'Error al crear el canal' };
	}
}

export async function updateChannelAction(
	channelId: number,
	name: string,
	description: string
): Promise<{ success: boolean; error?: string; data?: Channel }> {
	try {
		const supabase = await getServerSupabaseClient();
		await getCurrentUser();

		const { data, error } = await supabase
			.from(TABLE)
			.update({ name, description })
			.eq('id', channelId)
			.select()
			.single();

		if (error) return { success: false, error: error.message };
		return { success: true, data };
	} catch (error: any) {
		return { success: false, error: error.message || 'Error al actualizar el canal' };
	}
}

export async function deleteChannelAction(
	channelId: number
): Promise<{ success: boolean; error?: string }> {
	try {
		const supabase = await getServerSupabaseClient();
		await getCurrentUser();

		const paths = await listChannelStoragePaths(supabase, channelId);

		const { data: deleted, error } = await supabase
			.from(TABLE)
			.delete()
			.eq('id', channelId)
			.select('id');
		if (error) return { success: false, error: error.message };
		// RLS silently filters denied deletes to zero rows instead of erroring.
		if (!deleted || deleted.length === 0) {
			return { success: false, error: 'No tienes permisos para eliminar este canal' };
		}

		await deleteChannelStorageFiles(supabase, paths);
		return { success: true };
	} catch (error: any) {
		return { success: false, error: error.message || 'Error al eliminar el canal' };
	}
}

export async function getUserChannelsAction(): Promise<{
	success: boolean;
	error?: string;
	data?: ChannelWithLastMessage[];
}> {
	try {
		const supabase = await getServerSupabaseClient();
		const user = await getCurrentUser();

		const { data, error } = await supabase
			.from('channel_members')
			.select(
				`
				channel_id,
				last_read_message_id,
				channels (
					id,
					created_at,
					name,
					description,
					last_message_id
				)
			`
			)
			.eq('user_id', user.id);

		if (error) return { success: false, error: error.message };
		if (!data) return { success: true, data: [] };

		const { data: unreadData, error: unreadError } = await supabase.rpc(
			'get_unread_counts_by_channel',
			{ p_user_id: user.id }
		);

		if (unreadError) {
			const channels = data.map((item: any) => ({
				...item.channels,
				unread_count: 0,
				last_read_message_id: item.last_read_message_id,
			}));
			return { success: true, data: channels };
		}

		const unreadMap = new Map(
			(unreadData || []).map((item: any) => [Number(item.channel_id), Number(item.unread_count)])
		);

		const channels = data.map((item: any) => ({
			...item.channels,
			unread_count: unreadMap.get(item.channel_id) || 0,
			last_read_message_id: item.last_read_message_id,
		}));

		return { success: true, data: channels };
	} catch (error: any) {
		return { success: false, error: error.message || 'Error al obtener los canales' };
	}
}

export async function getChannelByIdAction(
	channelId: number
): Promise<{ success: boolean; error?: string; data?: Channel; isMember?: boolean }> {
	try {
		const supabase = await getServerSupabaseClient();
		const user = await getCurrentUser();

		const { data: channel, error } = await supabase
			.from(TABLE)
			.select('*')
			.eq('id', channelId)
			.single();

		if (error || !channel) {
			return { success: false, error: 'Canal no encontrado' };
		}

		const { data: membership } = await supabase
			.from('channel_members')
			.select('id')
			.eq('channel_id', channelId)
			.eq('user_id', user.id)
			.maybeSingle();

		return { success: true, data: channel, isMember: !!membership };
	} catch (error: any) {
		return { success: false, error: error.message || 'Error al obtener el canal' };
	}
}
