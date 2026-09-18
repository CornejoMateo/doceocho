'use server';

import type { SupabaseClient } from '@supabase/supabase-js';
import { configureWebPush, sendPushNotification } from '@/lib/push/vapid';
import {
	getAdminPushSubscriptions,
	getUserPushSubscriptions,
	deletePushSubscriptionByEndpoint,
} from '@/lib/push/subscriptions';

/**
 * Notifies every Admin that a module owner submitted a module for review.
 */
export async function sendModuleSubmittedNotification(
	supabase: SupabaseClient,
	moduleTitle: string,
	ownerName: string
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
		for (let i = 0; i < subscriptions.length; i++) {
			const subscription = subscriptions[i];

			const result = await sendPushNotification(subscription, {
				title: 'Nuevo módulo a revisar',
				body: `${ownerName} envió "${moduleTitle}" y está esperando aprobación.`,
				icon: '/icon-doceocho-192.png',
				data: {
					type: 'module_submitted',
					moduleTitle,
				},
			});

			if (result.success) {
				sentCount++;
			} else {
				failedCount++;
				if (result.statusCode === 404 || result.statusCode === 410) {
					await deletePushSubscriptionByEndpoint(subscription.endpoint, supabase);
				}
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

export async function sendModuleReviewedNotification(
	supabase: SupabaseClient,
	userId: string,
	moduleTitle: string,
	status: 'approved' | 'rejected'
) {
	try {
		const configured = configureWebPush();
		if (!configured) {
			return { success: false, error: 'VAPID keys are not configured', sentCount: 0 };
		}

		const { data: subscriptions, error } = await getUserPushSubscriptions(userId, supabase);

		if (error) {
			return { success: false, error, sentCount: 0 };
		}

		if (!subscriptions || subscriptions.length === 0) {
			return { success: true, sentCount: 0 };
		}

		const isApproved = status === 'approved';

		let sentCount = 0;
		let failedCount = 0;
		for (let i = 0; i < subscriptions.length; i++) {
			const subscription = subscriptions[i];

			const result = await sendPushNotification(subscription, {
				title: isApproved ? 'Módulo aprobado' : 'Módulo rechazado',
				body: isApproved
					? `Tu módulo "${moduleTitle}" fue aprobado.`
					: `Tu módulo "${moduleTitle}" fue rechazado. Abrí la app para ver el motivo.`,
				icon: '/icon-doceocho-192.png',
				data: {
					type: 'module_reviewed',
					moduleTitle,
					status,
				},
			});

			if (result.success) {
				sentCount++;
			} else {
				failedCount++;
				if (result.statusCode === 404 || result.statusCode === 410) {
					await deletePushSubscriptionByEndpoint(subscription.endpoint, supabase);
				}
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
