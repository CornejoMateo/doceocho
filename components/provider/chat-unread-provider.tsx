'use client';

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from 'react';
import { useAuth } from '@/components/provider/auth-provider';
import { getSupabaseClient } from '@/lib/supabase-client';

type ChatUnreadContextType = {
	totalUnreadCount: number;
	fetchUnreadCount: () => Promise<void>;
	incrementUnreadCount: (amount?: number) => void;
	decrementUnreadCount: (amount?: number) => void;
	setUnreadCount: (count: number) => void;
};

const ChatUnreadContext = createContext<ChatUnreadContextType | null>(null);

export function ChatUnreadProvider({ children }: { children: ReactNode }) {
	const { user } = useAuth();

	const supabase = useMemo(() => getSupabaseClient(), []);

	const [totalUnreadCount, setTotalUnreadCount] = useState(0);

	const fetchUnreadCount = useCallback(async () => {
		if (!user?.id) return;

		try {
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
		if (!user?.id) {
			setTotalUnreadCount(0);
			return;
		}

		fetchUnreadCount();

		const channel = supabase
			.channel(`chat-unread-${user.id}`)
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

	const incrementUnreadCount = useCallback((amount = 1) => {
		setTotalUnreadCount((prev) => prev + amount);
	}, []);

	const decrementUnreadCount = useCallback((amount = 1) => {
		setTotalUnreadCount((prev) => Math.max(0, prev - amount));
	}, []);

	const setUnreadCount = useCallback((count: number) => {
		setTotalUnreadCount(Math.max(0, count));
	}, []);

	const value = useMemo(
		() => ({
			totalUnreadCount,
			fetchUnreadCount,
			incrementUnreadCount,
			decrementUnreadCount,
			setUnreadCount,
		}),
		[totalUnreadCount, fetchUnreadCount, incrementUnreadCount, decrementUnreadCount, setUnreadCount]
	);

	return <ChatUnreadContext.Provider value={value}>{children}</ChatUnreadContext.Provider>;
}

export function useChatUnread() {
	const context = useContext(ChatUnreadContext);

	if (!context) {
		throw new Error('useChatUnread must be used within a ChatUnreadProvider');
	}

	return context;
}
