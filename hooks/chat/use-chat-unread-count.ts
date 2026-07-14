import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/provider/auth-provider';
import { getSupabaseClient } from '@/lib/supabase-client';

export function useChatUnreadCount() {
	const { user } = useAuth();
	const [totalUnreadCount, setTotalUnreadCount] = useState(0);

	const fetchUnreadCount = useCallback(async () => {
		if (!user?.id) return;

		try {
			const supabase = getSupabaseClient();

			const { data, error } = await supabase.rpc('get_unread_messages_count', {
				p_user_id: user.id,
			});

			if (error) {
				console.error(error);
				return;
			}

			setTotalUnreadCount(data ?? 0);
		} catch (error) {
			console.error(error);
		}
	}, [user?.id]);

	useEffect(() => {
		if (!user?.id) return;

		fetchUnreadCount();

		const supabase = getSupabaseClient();

		const channel = supabase
			.channel(`unread-count-${user.id}`)
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'messages',
				},
				fetchUnreadCount
			)
			.on(
				'postgres_changes',
				{
					event: 'UPDATE',
					schema: 'public',
					table: 'channel_members',
					filter: `user_id=eq.${user.id}`,
				},
				fetchUnreadCount
			)
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	}, [user?.id, fetchUnreadCount]);

	const decrementUnreadCount = (amount: number) => {
		setTotalUnreadCount((prev) => Math.max(0, prev - amount));
	};

	return {
		totalUnreadCount,
		decrementUnreadCount,
		fetchUnreadCount,
	};
}
