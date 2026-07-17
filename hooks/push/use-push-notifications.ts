import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/provider/auth-provider';
import {
	savePushSubscription,
	deletePushSubscription,
	type PushSubscription,
} from '@/lib/push/subscriptions';

export function usePushNotifications() {
	const { user } = useAuth();
	const [permission, setPermission] = useState<NotificationPermission>('default');
	const [subscription, setSubscription] = useState<PushSubscription | null>(null);
	const [isSupported, setIsSupported] = useState(false);

	// Check if push notifications are supported
	useEffect(() => {
		const supported =
			'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
		setIsSupported(supported);
		setPermission(supported ? Notification.permission : 'default');
	}, []);

	// Request notification permission
	const requestPermission = useCallback(async () => {
		if (!isSupported) {
			return { success: false, error: 'Push notifications not supported' };
		}

		const permissionResult = await Notification.requestPermission();
		setPermission(permissionResult);

		if (permissionResult !== 'granted') {
			return { success: false, error: 'Permission denied' };
		}

		return { success: true };
	}, [isSupported]);

	// Subscribe to push notifications
	const subscribe = useCallback(async () => {
		if (!isSupported || !user) {
			console.error('Subscribe failed:', { isSupported, hasUser: !!user });
			return { success: false, error: 'Not supported or user not logged in' };
		}

		// Check current permission directly instead of relying on state
		const currentPermission = Notification.permission;
		if (currentPermission !== 'granted') {
			console.error('Subscribe failed: permission not granted', currentPermission);
			return { success: false, error: `Permission not granted: ${currentPermission}` };
		}

		try {
			console.log('Starting subscription process...');

			// Register service worker
			const registration = await navigator.serviceWorker.register('/sw.js');
			console.log('Service Worker registered:', registration);

			// Convert VAPID public key from base64 to Uint8Array
			const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
			if (!vapidPublicKey) {
				console.error('VAPID public key not configured');
				return { success: false, error: 'VAPID public key not configured' };
			}

			console.log('VAPID public key configured:', vapidPublicKey.substring(0, 20) + '...');

			// Convert base64 URL-safe to standard base64
			const base64Key = vapidPublicKey.replace(/-/g, '+').replace(/_/g, '/');
			// Add padding if needed
			const paddedKey = base64Key.padEnd(Math.ceil(base64Key.length / 4) * 4, '=');

			// Convert base64 to Uint8Array
			const applicationServerKey = Uint8Array.from(atob(paddedKey), (c) => c.charCodeAt(0));

			// Subscribe to push
			const existing = await registration.pushManager.getSubscription();
			const pushSubscription =
				existing ??
				(await registration.pushManager.subscribe({
					userVisibleOnly: true,
					applicationServerKey,
				}));

			console.log('Push subscription created:', pushSubscription);

			const p256dh = pushSubscription.getKey('p256dh');
			const auth = pushSubscription.getKey('auth');
			if (!p256dh || !auth) {
				return { success: false, error: 'Invalid push subscription keys' };
			}

			const subscriptionData: PushSubscription = {
				endpoint: pushSubscription.endpoint,
				keys: {
					p256dh: btoa(String.fromCharCode(...new Uint8Array(p256dh))),
					auth: btoa(String.fromCharCode(...new Uint8Array(auth))),
				},
			};

			console.log('Subscription data prepared:', subscriptionData);

			// Save subscription to database
			const result = await savePushSubscription(user.uid, subscriptionData);

			console.log('Save subscription result:', result);

			if (result.success) {
				setSubscription(subscriptionData);
				return { success: true };
			} else {
				return { success: false, error: result.error };
			}
		} catch (error: any) {
			console.error('Error subscribing to push:', error);
			return { success: false, error: error.message };
		}
	}, [isSupported, user]);

	// Unsubscribe from push notifications
	const unsubscribe = useCallback(async () => {
		if (!subscription || !user) {
			return { success: false, error: 'No subscription' };
		}

		try {
			// Delete from database
			const deleteResult = await deletePushSubscription(user.uid, subscription.endpoint);
			if (!deleteResult.success) {
				return { success: false, error: deleteResult.error || 'Failed to delete subscription' };
			}

			// Unsubscribe from push
			const registration = await navigator.serviceWorker.getRegistration();
			if (registration) {
				const pushSubscription = await registration.pushManager.getSubscription();
				if (pushSubscription) {
					await pushSubscription.unsubscribe();
				}
			}

			setSubscription(null);
			return { success: true };
		} catch (error: any) {
			console.error('Error unsubscribing:', error);
			return { success: false, error: error.message };
		}
	}, [subscription, user]);

	// Load existing subscription on mount
	useEffect(() => {
		if (!isSupported || !user) return;

		const loadSubscription = async () => {
			try {
				const registration = await navigator.serviceWorker.getRegistration();
				if (registration) {
					const pushSubscription = await registration.pushManager.getSubscription();
					if (pushSubscription) {
						const p256dh = pushSubscription.getKey('p256dh');
						const auth = pushSubscription.getKey('auth');
						if (!p256dh || !auth) {
							return { success: false, error: 'Invalid push subscription keys' };
						}

						const subscriptionData: PushSubscription = {
							endpoint: pushSubscription.endpoint,
							keys: {
								p256dh: btoa(String.fromCharCode(...new Uint8Array(p256dh))),
								auth: btoa(String.fromCharCode(...new Uint8Array(auth))),
							},
						};
						setSubscription(subscriptionData);
					}
				}
			} catch (error) {
				console.error('Error loading subscription:', error);
			}
		};

		loadSubscription();
	}, [isSupported, user]);

	return {
		isSupported,
		permission,
		subscription,
		requestPermission,
		subscribe,
		unsubscribe,
	};
}
