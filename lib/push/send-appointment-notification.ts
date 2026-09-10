import type { SupabaseClient } from '@supabase/supabase-js';
import { configureWebPush, sendPushNotification } from '@/lib/push/vapid';
import {
	deletePushSubscriptionByEndpoint,
	getAdminPushSubscriptions,
} from '@/lib/push/subscriptions';

const APPOINTMENTS_URL = '/calendar';

/** Warns every admin that a client asked for an appointment. */
export async function sendAppointmentRequestedNotification(
	supabase: SupabaseClient,
	clientName: string,
	date: string,
	startTime: string
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

		const [year, month, day] = date.split('-');
		const readableDate = `${day}/${month}/${year}`;

		let sentCount = 0;
		let failedCount = 0;

		for (const subscription of subscriptions) {
			const result = await sendPushNotification(subscription, {
				title: 'Nueva solicitud de cita',
				body: `${clientName} pidió una cita para el ${readableDate} a las ${startTime}`,
				icon: '/icon-doceocho-192.png',
				data: { type: 'appointment_requested', url: APPOINTMENTS_URL },
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
	} catch (error: any) {
		return { success: false, error: error.message };
	}
}
