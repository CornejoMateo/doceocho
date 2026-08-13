'use server';

import type { SupabaseClient } from '@supabase/supabase-js';
import { configureWebPush, sendPushNotification } from '@/lib/push/vapid';
import { getAdminPushSubscriptions } from '@/lib/push/subscriptions';

export async function sendAttendanceCreatedNotification(
	supabase: SupabaseClient,
	username: string,
	type: string
) {
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

		const typeLabels: Record<string, string> = {
			regular_in: 'entrada',
			regular_out: 'salida',
			overtime_in: 'entrada (extra)',
			overtime_out: 'salida (extra)',
		};

		for (let i = 0; i < subscriptions.length; i++) {
			const subscription = subscriptions[i];
			const typeEntry = typeLabels[type] ?? 'fichaje';
			const result = await sendPushNotification(subscription, {
				title: 'Fichaje registrado',
				body: `Se ha registrado una ${typeEntry} del usuario: ${username}`,
				icon: '/icon-doceocho-192.png',
				data: {
					type: 'attendance_registered',
					username,
					typeEntry,
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
