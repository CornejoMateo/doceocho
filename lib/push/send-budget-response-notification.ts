import type { SupabaseClient } from '@supabase/supabase-js';
import { configureWebPush, sendPushNotification } from '@/lib/push/vapid';
import {
	deletePushSubscriptionByEndpoint,
	getAdminPushSubscriptions,
} from '@/lib/push/subscriptions';
import type { ClientResponse } from '@/lib/budget-builder/types';

const BUDGET_BUILDER_URL = '/presupuestador';

/** Warns every admin that a client answered a budget from their link. */
export async function sendBudgetResponseNotification(
	supabase: SupabaseClient,
	code: string,
	clientName: string,
	decision: ClientResponse,
	budgetId: string
) {
	try {
		if (!configureWebPush()) {
			return { success: false, error: 'VAPID keys are not configured', sentCount: 0 };
		}

		const { data: subscriptions, error } = await getAdminPushSubscriptions(supabase);

		if (error) return { success: false, error, sentCount: 0 };
		if (!subscriptions || subscriptions.length === 0) return { success: true, sentCount: 0 };

		const who = clientName || 'El cliente';
		let sentCount = 0;

		for (const subscription of subscriptions) {
			const result = await sendPushNotification(subscription, {
				title: decision === 'aprobado' ? 'Presupuesto aprobado' : 'Presupuesto rechazado',
				body: `${who} ${decision === 'aprobado' ? 'aprobó' : 'rechazó'} el presupuesto ${code}`,
				icon: '/icon-doceocho-192.png',
				data: { type: 'budget_response', url: `${BUDGET_BUILDER_URL}?id=${budgetId}` },
			});

			if (result.success) {
				sentCount++;
			} else if (result.statusCode === 404 || result.statusCode === 410) {
				// Gone or not found means the browser dropped the subscription.
				await deletePushSubscriptionByEndpoint(subscription.endpoint, supabase);
			}
		}

		return { success: true, sentCount };
	} catch (error: any) {
		return { success: false, error: error.message };
	}
}
