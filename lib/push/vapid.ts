import webpush from 'web-push';

// Generate VAPID keys (run this once and save to environment variables)
export function generateVapidKeys() {
	const vapidKeys = webpush.generateVAPIDKeys();
	return vapidKeys;
}

// Configure web-push with VAPID keys
export function configureWebPush() {
	const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
	const privateKey = process.env.VAPID_PRIVATE_KEY;
	const subject = process.env.VAPID_SUBJECT;

	if (!publicKey || !privateKey) {
		console.warn('[push] VAPID keys not configured. Push notifications will not work.');
		return false;
	}

	if (!subject) {
		console.warn('[push] VAPID_SUBJECT not configured. Push notifications will not work.');
		return false;
	}

	webpush.setVapidDetails(subject, publicKey, privateKey);
	return true;
}

// Send push notification
export async function sendPushNotification(
	subscription: webpush.PushSubscription,
	payload: { title: string; body: string; icon?: string; data?: any }
) {
	const endpointPreview = subscription.endpoint?.substring(0, 60) + '...';
	// console.log('[push] sendPushNotification called', { endpoint: endpointPreview });

	try {
		await webpush.sendNotification(subscription, JSON.stringify(payload));
		// console.log('[push] sendPushNotification succeeded', { endpoint: endpointPreview });
		return { success: true };
	} catch (error: any) {
		// console.error('[push] sendPushNotification failed:', {
		// 	endpoint: endpointPreview,
		// 	error: error.message,
		// 	statusCode: error.statusCode,
		// 	body: error.body,
		// });
		return { success: false, error: error.message };
	}
}
