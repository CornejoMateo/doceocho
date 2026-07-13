import { getSupabaseClient } from '@/lib/supabase-client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { MessageWithUser } from '@/lib/chat/chat-types';
import { getMessagesAction } from '@/lib/chat/messages';
import { useAuth } from '@/components/provider/auth-provider';

export function useChatRealtime(channelId: number | null) {
	const { user } = useAuth();
	const [messages, setMessages] = useState<MessageWithUser[]>([]);
	const [loading, setLoading] = useState(false);
	const [loadingMore, setLoadingMore] = useState(false);
	const [hasMore, setHasMore] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const supabase = getSupabaseClient();

	const messagesRef = useRef<MessageWithUser[]>([]);

	useEffect(() => {
		messagesRef.current = messages;
	}, [messages]);

	const updateMessages = useCallback(
		(
			updater: MessageWithUser[] | ((prev: MessageWithUser[]) => MessageWithUser[]),
			options?: { hasMore?: boolean }
		) => {
			setMessages((prev) => (typeof updater === 'function' ? updater(prev) : updater));

			if (options?.hasMore !== undefined) {
				setHasMore(options.hasMore);
			}
		},
		[]
	);

	const fetchVersionRef = useRef(0);
	const realtimeVersionRef = useRef(0);

	const addMessage = useCallback(
		(message: MessageWithUser) => {
			realtimeVersionRef.current++;

			updateMessages((prev) => {
				if (prev.some((m) => m.id === message.id)) return prev;
				return [...prev, message];
			});
		},
		[updateMessages]
	);

	const fetchMessages = useCallback(async () => {
		if (!channelId || !user) {
			setMessages([]);
			return;
		}

		setLoading(true);

		const fetchVersion = ++fetchVersionRef.current;
		const realtimeVersionAtStart = realtimeVersionRef.current;

		try {
			const result = await getMessagesAction(channelId);

			if (fetchVersion !== fetchVersionRef.current) {
				return;
			}

			if (result.data) {
				const fetchedMessages = result.data;

				setMessages((prev) => {
					if (realtimeVersionRef.current > realtimeVersionAtStart) {
						const fetchedIds = new Set(fetchedMessages.map((m) => m.id));

						const realtimeMessages = prev.filter((m) => !fetchedIds.has(m.id));

						return [...fetchedMessages, ...realtimeMessages];
					}

					return fetchedMessages;
				});

				setHasMore(result.hasMore ?? false);
			}

			if (result.error) {
				setError(result.error);
			}
		} finally {
			if (fetchVersion === fetchVersionRef.current) {
				setLoading(false);
			}
		}
	}, [channelId, !!user]);

	useEffect(() => {
		fetchMessages();
	}, [fetchMessages]);

	useEffect(() => {
		const handler = (e: CustomEvent<MessageWithUser>) => {
			addMessage(e.detail);
		};
		window.addEventListener('new-message', handler as EventListener);
		return () => window.removeEventListener('new-message', handler as EventListener);
	}, [addMessage]);

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

	const loadMore = useCallback(async (): Promise<number> => {
		if (!channelId || !user || loadingMore || !hasMore) return 0;

		setLoadingMore(true);
		try {
			const offset = messages.length;

			const result = await getMessagesAction(channelId, offset);
			if (result.error) {
				setError(result.error || 'Error al cargar mensajes');
				return 0;
			} else if (result.data && result.data.length > 0) {
				updateMessages((prev) => [...result.data!, ...prev], {
					hasMore: result.hasMore ?? false,
				});
				return result.data.length;
			}
			return 0;
		} catch (err: any) {
			setError(err.message || 'Error al cargar mensajes');
			return 0;
		} finally {
			setLoadingMore(false);
		}
	}, [channelId, user, loadingMore, hasMore, messages.length]);

	const refresh = useCallback(() => {
		fetchMessages();
	}, [fetchMessages]);

	return {
		messages,
		loading,
		loadingMore,
		hasMore,
		error,
		refresh,
		loadMore,
	};
}
