import type { SupabaseClient } from '@supabase/supabase-js';
import { configureWebPush, sendPushNotification } from '@/lib/push/vapid';
import {
	PushSubscription,
	deletePushSubscriptionByEndpoint,
	getAdminPushSubscriptions,
	getUserPushSubscriptions,
} from '@/lib/push/subscriptions';

const VACATIONS_URL = '/human-resources';

type NotificationPayload = {
	title: string;
	body: string;
	data: Record<string, unknown>;
};

async function sendToSubscriptions(
	supabase: SupabaseClient,
	subscriptions: PushSubscription[],
	payload: NotificationPayload
) {
	let sentCount = 0;
	let failedCount = 0;

	for (const subscription of subscriptions) {
		const result = await sendPushNotification(subscription, {
			...payload,
			icon: '/icon-doceocho-192.png',
			data: { ...payload.data, url: VACATIONS_URL },
		});

		if (result.success) {
			sentCount++;
		} else {
			failedCount++;

			// Gone or not found means the browser dropped the subscription.
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
}

/** Warns every admin that somebody asked for vacations. */
export async function sendVacationRequestedNotification(
	supabase: SupabaseClient,
	requesterName: string,
	dateRange: string
) {
	try {
		if (!configureWebPush()) {
			return { success: false, error: 'VAPID keys are not configured', sentCount: 0 };
		}

		const { data: subscriptions, error } = await getAdminPushSubscriptions(supabase);

		if (error) {
			return { success: false, error, sentCount: 0 };
		}

		if (!subscriptions || subscriptions.length === 0) {
			return { success: true, sentCount: 0 };
		}

		return sendToSubscriptions(supabase, subscriptions, {
			title: 'Nuevo pedido de vacaciones',
			body: `${requesterName} solicitó vacaciones del ${dateRange}`,
			data: { type: 'vacation_requested' },
		});
	} catch (error: any) {
		return { success: false, error: error.message };
	}
}

/** Tells the requester that an admin approved or rejected the request. */
export async function sendVacationResolvedNotification(
	supabase: SupabaseClient,
	userId: string,
	status: 'Aprobada' | 'Rechazada',
	dateRange: string,
	reviewerNotes?: string | null
) {
	try {
		if (!configureWebPush()) {
			return { success: false, error: 'VAPID keys are not configured', sentCount: 0 };
		}

		const { data: subscriptions, error } = await getUserPushSubscriptions(userId, supabase);

		if (error) {
			return { success: false, error, sentCount: 0 };
		}

		if (!subscriptions || subscriptions.length === 0) {
			return { success: true, sentCount: 0 };
		}

		const wasApproved = status === 'Aprobada';
		const baseBody = `Tu pedido del ${dateRange} fue ${wasApproved ? 'aprobado' : 'rechazado'}`;

		return sendToSubscriptions(supabase, subscriptions, {
			title: wasApproved ? 'Vacaciones aprobadas' : 'Vacaciones rechazadas',
			body: reviewerNotes ? `${baseBody}. ${reviewerNotes}` : baseBody,
			data: { type: 'vacation_resolved', status },
		});
	} catch (error: any) {
		return { success: false, error: error.message };
	}
}
