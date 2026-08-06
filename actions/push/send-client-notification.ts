'use server';

import type { SupabaseClient } from '@supabase/supabase-js';
import { configureWebPush, sendPushNotification } from '@/lib/push/vapid';
import { getAdminPushSubscriptions } from '@/lib/push/subscriptions';
import { after } from 'next/server';

export async function sendClientCreatedNotification(
	supabase: SupabaseClient,
	clientName: string,
	clientLastName: string
) {
	try {
		const configured = configureWebPush();
		if (!configured) {
			return { success: false, error: 'VAPID keys are not configured', sentCount: 0 };
		}

		const { data: subscriptions, error } = await getAdminPushSubscriptions(supabase);

		if (error) {
			console.error('[push] Failed to get admin subscriptions:', error);
			return { success: false, error, sentCount: 0 };
		}

		if (!subscriptions || subscriptions.length === 0) {
			return { success: true, sentCount: 0 };
		}

		let sentCount = 0;
		let failedCount = 0;
		for (let i = 0; i < subscriptions.length; i++) {
			const subscription = subscriptions[i];

			const displayName = `${clientName} ${clientLastName}`.trim();
			const result = await sendPushNotification(subscription, {
				title: 'Nuevo cliente creado',
				body: `Se ha registrado un nuevo cliente: ${displayName}`,
				icon: '/icon-192.png',
				data: {
					type: 'client_created',
					clientName,
					clientLastName,
				},
			});

			if (result.success) {
				sentCount++;
			} else {
				failedCount++;
			}
		}

		console.log('[push] Push notification sent for new client:', {
			clientId: 0,
			name: clientName,
			last_name: clientLastName,
		});

		return {
			success: failedCount === 0,
			sentCount,
			failedCount,
			error: failedCount ? `${failedCount} push notifications failed` : undefined,
		};
	} catch (error: any) {
		console.error('[push] Error sending client notifications:', error);
		return { success: false, error: error.message };
	}
}
