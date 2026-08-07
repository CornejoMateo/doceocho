'use server';

import type { SupabaseClient } from '@supabase/supabase-js';
import { configureWebPush, sendPushNotification } from '@/lib/push/vapid';
import { getAdminPushSubscriptions } from '@/lib/push/subscriptions';

export async function sendWorkCreatedNotification(supabase: SupabaseClient, workName: string) {
	try {
		const configured = configureWebPush();
		if (!configured) {
			return { success: false, error: 'VAPID keys are not configured', sentCount: 0 };
		}

		const { data: subscriptions, error } = await getAdminPushSubscriptions(supabase);

		if (error) {
			return { success: false, error, sentCount: 0 };
		}

		if (!subscriptions || subscriptions.length === 0) {
			return { success: true, sentCount: 0 };
		}

		let sentCount = 0;
		let failedCount = 0;
		for (let i = 0; i < subscriptions.length; i++) {
			const subscription = subscriptions[i];

			const result = await sendPushNotification(subscription, {
				title: 'Nueva obra creada',
				body: `Se ha registrado una nueva obra: ${workName}`,
				icon: '/icon-192.png',
				data: {
					type: 'work_created',
					workName,
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
		return { success: false, error: error.message };
	}
}
