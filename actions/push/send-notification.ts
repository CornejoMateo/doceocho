'use server';

import type { SupabaseClient } from '@supabase/supabase-js';
import { configureWebPush, sendPushNotification } from '@/lib/push/vapid';
import { getChannelPushSubscriptions } from '@/lib/push/subscriptions';

export async function sendPushNotificationToChannel(
	supabase: SupabaseClient,
	channelId: number,
	senderUserId: string,
	senderName: string,
	senderLastName: string,
	message: string,
	channelName: string
) {
	try {
		const configured = configureWebPush();
		if (!configured) {
			return { success: false, error: 'VAPID keys are not configured', sentCount: 0 };
		}

		const { data: subscriptions, error } = await getChannelPushSubscriptions(
			channelId,
			senderUserId,
			supabase
		);

		if (error) {
			console.error('[push] Failed to get subscriptions:', error);
			return { success: false, error, sentCount: 0 };
		}

		if (!subscriptions || subscriptions.length === 0) {
			return { success: true, sentCount: 0 };
		}

		let sentCount = 0;
		let failedCount = 0;
		for (let i = 0; i < subscriptions.length; i++) {
			const subscription = subscriptions[i];

			const displayName = `${senderName} ${senderLastName}`.trim();
			const result = await sendPushNotification(subscription, {
				title: `Nuevo mensaje en ${channelName}`,
				body: `${displayName}: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`,
				icon: '/icon-192.png',
				data: {
					channelId,
					channelName,
					senderUserId,
				},
			});

			if (result.success) {
				sentCount++;
			} else {
				failedCount++;
			}
		}

		return {
			success: failedCount === 0,
			sentCount,
			failedCount,
			error: failedCount ? `${failedCount} push notifications failed` : undefined,
		};
	} catch (error: any) {
		console.error('[push] Error sending push notifications:', error);
		return { success: false, error: error.message };
	}
}
