'use server';

import { getCurrentUser } from '@/lib/auth';
import { getServerSupabaseClient } from '@/lib/get-server-supabase-client';
import type { Message, MessageWithUser } from '@/lib/chat/chat-types';
import { sendPushNotificationToChannel } from '@/actions/push/send-notification';
import { after } from 'next/server';

import { fromZonedTime } from 'date-fns-tz';
const timeZone = 'America/Argentina/Buenos_Aires';

const TABLE = 'messages';

export async function getMessagesAction(
	channelId: number
): Promise<{ success: boolean; error?: string; data?: MessageWithUser[] }> {
	try {
		const supabase = await getServerSupabaseClient();

		const { data, error } = await supabase
			.from(TABLE)
			.select(
				`id, created_at, content, edited_at, deleted_at, user_id, channel_id, reply_to,
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

		if (error) return { success: false, error: error.message };

		const messages = (data || []) as unknown as MessageWithUser[];

		return { success: true, data: messages };
	} catch (error: any) {
		return { success: false, error: error.message || 'Error al obtener mensajes ' };
	}
}

export async function sendMessageAction(
	channelId: number,
	content: string,
	replyToId?: number
): Promise<{ success: boolean; error?: string; data?: MessageWithUser }> {
	try {
		const supabase = await getServerSupabaseClient();
		const user = await getCurrentUser();

		const trimmed = content.trim();
		if (!trimmed) return { success: false, error: 'El mensaje no puede estar vacío' };

		const { data, error } = await supabase
			.from(TABLE)
			.insert({
				content: trimmed,
				channel_id: channelId,
				user_id: user.id,
				reply_to: replyToId ?? null,
				edited_at: null,
				deleted_at: null,
			})
			.select(`*, users!inner(uid_user, username, role, name, last_name)`)
			.single();

		if (error) return { success: false, error: error.message };

		console.log('[push] sendMessageAction completed, scheduling after() push', {
			channelId,
			senderUserId: user.id,
		});

		after(async () => {
			console.log('[push] after() callback started', {
				channelId,
				senderUserId: user.id,
			});

			try {
				const { data: channel, error: channelError } = await supabase
					.from('channels')
					.select('name')
					.eq('id', channelId)
					.single();

				if (channelError) {
					console.error('[push] Failed to fetch channel name:', {
						channelId,
						error: channelError.message,
					});
					return;
				}

				await sendPushNotificationToChannel(
					supabase,
					channelId,
					user.id,
					data.users?.name ?? '',
					data.users?.last_name ?? '',
					trimmed,
					channel?.name ?? 'Canal'
				);
			} catch (error: any) {
				console.error('[push] Failed to send push notification:', {
					channelId,
					username: user.id,
					error: error.message,
				});
			}
		});

		return {
			success: true,
			data: data as unknown as MessageWithUser,
		};
	} catch (err: any) {
		return { success: false, error: err.message };
	}
}

export async function cleanChannelMessagesAction(
	channelId: number,
	cleanupDate: string
): Promise<{ success: boolean; error?: string; deletedCount?: number }> {
	try {
		const supabase = await getServerSupabaseClient();

		const [year, month, day] = cleanupDate.split('-').map(Number);

		const endDateUtc = fromZonedTime(
			new Date(year, month - 1, day + 1, 0, 0, 0),
			timeZone
		).toISOString();

		const { data: messagesToDelete, error } = await supabase
			.from(TABLE)
			.select('id')
			.eq('channel_id', channelId)
			.lt('created_at', endDateUtc);

		if (error) return { success: false, error: error.message };
		if (!messagesToDelete?.length) return { success: true, deletedCount: 0 };

		const { error: deleteError } = await supabase
			.from(TABLE)
			.delete()
			.eq('channel_id', channelId)
			.lt('created_at', endDateUtc);

		if (deleteError) {
			return { success: false, error: deleteError.message };
		}

		return {
			success: true,
			deletedCount: messagesToDelete.length,
		};
	} catch (err: any) {
		return { success: false, error: err.message };
	}
}
