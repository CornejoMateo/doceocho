import { getSupabaseClient } from '@/lib/supabase-client';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { MessageWithUser } from '@/lib/chat/chat-types';
import { getMessages } from '@/lib/chat/messages-client';
import { useAuth } from '@/components/provider/auth-provider';

export function useChatRealtime(channelId: number | null) {
	const { user } = useAuth();
	const [messages, setMessages] = useState<MessageWithUser[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const supabase = useMemo(() => getSupabaseClient(), []);
	const messagesRef = useRef<MessageWithUser[]>([]);

	useEffect(() => {
		messagesRef.current = messages;
	}, [messages]);

	const updateMessages = useCallback(
		(updater: MessageWithUser[] | ((prev: MessageWithUser[]) => MessageWithUser[])) => {
			setMessages((prev) => (typeof updater === 'function' ? updater(prev) : updater));
		},
		[]
	);

	const fetchVersionRef = useRef(0);

	const fetchMessages = useCallback(async () => {
		if (!channelId || !user) {
			setMessages([]);
			return;
		}

		setLoading(true);

		const version = ++fetchVersionRef.current;

		try {
			const fetchedMessages = await getMessages(channelId);

			if (version !== fetchVersionRef.current) return;

			setMessages(fetchedMessages);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Error');
		} finally {
			setLoading(false);
		}
	}, [channelId, user]);

	useEffect(() => {
		messagesRef.current = [];
		setMessages([]);
		setError(null);

		if (channelId) {
			fetchMessages();
		}
	}, [fetchMessages]);

	useEffect(() => {
		if (!channelId) return;

		const channel = supabase
			.channel(`messages-${channelId}`)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'messages',
					filter: `channel_id=eq.${channelId}`,
				},
				async (payload) => {
					const { eventType, new: newRecord, old: oldRecord } = payload;

					if (eventType === 'INSERT') {
						const existingUser = messagesRef.current.find(
							(m) => m.user_id === newRecord.user_id
						)?.users;

						const messageWithUser: MessageWithUser = {
							id: newRecord.id,
							created_at: newRecord.created_at,
							content: newRecord.content,
							edited_at: newRecord.edited_at,
							deleted_at: newRecord.deleted_at,
							user_id: newRecord.user_id,
							channel_id: newRecord.channel_id,
							reply_to: newRecord.reply_to,
							users: existingUser ?? null,
						};

						updateMessages((prev) => {
							if (prev.some((m) => m.id === newRecord.id)) return prev;
							return [...prev, messageWithUser];
						});

						if (!existingUser) {
							const { data: userData } = await supabase
								.from('users')
								.select(
									`
									uid_user,
									username,
									name,
									last_name,
									role
									`
								)
								.eq('uid_user', newRecord.user_id)
								.single();

							if (userData) {
								updateMessages((prev) =>
									prev.map((msg) => (msg.id === newRecord.id ? { ...msg, users: userData } : msg))
								);
							}
						}
					} else if (eventType === 'UPDATE') {
						updateMessages((prev) =>
							prev.map((msg) => (msg.id === newRecord.id ? { ...msg, ...newRecord } : msg))
						);
					} else if (eventType === 'DELETE') {
						const deletedId = (oldRecord as any)?.id;
						if (!deletedId) {
							return;
						}
						updateMessages((prev) => prev.filter((msg) => msg.id !== deletedId));
					} else {
						console.warn('[Realtime] Unhandled event type:', eventType, payload);
					}
				}
			)
			.subscribe((status) => {
				console.log('Messages realtime:', status);
			});
		return () => {
			supabase.removeChannel(channel);
		};
	}, [channelId, supabase, user]);

	const refresh = useCallback(() => {
		fetchMessages();
	}, [fetchMessages]);

	return {
		messages,
		loading,
		error,
		refresh,
	};
}
