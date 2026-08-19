import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase-client';

export interface PushSubscription {
	endpoint: string;
	keys: {
		p256dh: string;
		auth: string;
	};
}

/**
 * Save a push subscription for a user
 */
export async function savePushSubscription(
	userId: string,
	subscription: PushSubscription
): Promise<{ success: boolean; error?: string }> {
	const supabase = getSupabaseClient();

	try {
		const { error } = await supabase.from('push_subscriptions').upsert({
			user_id: userId,
			endpoint: subscription.endpoint,
			p256dh: subscription.keys.p256dh,
			auth: subscription.keys.auth,
		});

		if (error) {
			return { success: false, error: error.message };
		}

		return { success: true };
	} catch (error: any) {
		return { success: false, error: error.message };
	}
}

/**
 * Get all push subscriptions for a user
 */
export async function getUserPushSubscriptions(
	userId: string
): Promise<{ data: PushSubscription[] | null; error?: string }> {
	const supabase = getSupabaseClient();

	try {
		const { data, error } = await supabase
			.from('push_subscriptions')
			.select('endpoint, p256dh, auth')
			.eq('user_id', userId);

		if (error) {
			return { data: null, error: error.message };
		}

		const subscriptions: PushSubscription[] = data.map((sub) => ({
			endpoint: sub.endpoint,
			keys: {
				p256dh: sub.p256dh,
				auth: sub.auth,
			},
		}));

		return { data: subscriptions };
	} catch (error: any) {
		return { data: null, error: error.message };
	}
}

/**
 * Delete a push subscription
 */
export async function deletePushSubscription(
	userId: string,
	endpoint: string
): Promise<{ success: boolean; error?: string }> {
	const supabase = getSupabaseClient();

	try {
		const { error } = await supabase
			.from('push_subscriptions')
			.delete()
			.eq('user_id', userId)
			.eq('endpoint', endpoint);

		if (error) {
			return { success: false, error: error.message };
		}

		return { success: true };
	} catch (error: any) {
		return { success: false, error: error.message };
	}
}

/**
 * Delete a push subscription by endpoint only (for expired/invalid subscriptions)
 */
export async function deletePushSubscriptionByEndpoint(
	endpoint: string,
	supabase?: SupabaseClient
): Promise<{ success: boolean; error?: string }> {
	const client = supabase ?? getSupabaseClient();

	try {
		const { error } = await client.from('push_subscriptions').delete().eq('endpoint', endpoint);

		if (error) {
			return { success: false, error: error.message };
		}

		return { success: true };
	} catch (error: any) {
		return { success: false, error: error.message };
	}
}

/**
 * Get all push subscriptions for users in a channel (excluding sender)
 */
export async function getChannelPushSubscriptions(
	channelId: number,
	senderUserId: string,
	supabase?: SupabaseClient
): Promise<{ data: PushSubscription[] | null; error?: string }> {
	const client = supabase ?? getSupabaseClient();

	try {
		const { data: members, error: membersError } = await client
			.from('channel_members')
			.select('user_id')
			.eq('channel_id', channelId)
			.neq('user_id', senderUserId);

		if (membersError) {
			return { data: null, error: membersError.message };
		}

		if (!members || members.length === 0) {
			return { data: [] };
		}

		const userIds = members.map((m) => m.user_id);

		const { data, error } = await client
			.from('push_subscriptions')
			.select('endpoint, p256dh, auth')
			.in('user_id', userIds);

		if (error) {
			return { data: null, error: error.message };
		}

		const subscriptions: PushSubscription[] = data.map((sub) => ({
			endpoint: sub.endpoint,
			keys: {
				p256dh: sub.p256dh,
				auth: sub.auth,
			},
		}));

		return { data: subscriptions };
	} catch (error: any) {
		return { data: null, error: error.message };
	}
}

/**
 * Get all push subscriptions for admin users
 */
export async function getAdminPushSubscriptions(
	supabase?: SupabaseClient
): Promise<{ data: PushSubscription[] | null; error?: string }> {
	const client = supabase ?? getSupabaseClient();

	try {
		const { data: admins, error: adminsError } = await client
			.from('users')
			.select('uid_user')
			.eq('role', 'Admin');

		if (adminsError) {
			return { data: null, error: adminsError.message };
		}

		if (!admins || admins.length === 0) {
			return { data: [] };
		}

		const userIds = admins.map((admin) => admin.uid_user);

		const { data, error } = await client
			.from('push_subscriptions')
			.select('endpoint, p256dh, auth')
			.in('user_id', userIds);

		if (error) {
			return { data: null, error: error.message };
		}

		const subscriptions: PushSubscription[] = data.map((sub) => ({
			endpoint: sub.endpoint,
			keys: {
				p256dh: sub.p256dh,
				auth: sub.auth,
			},
		}));

		return { data: subscriptions };
	} catch (error: any) {
		return { data: null, error: error.message };
	}
}
