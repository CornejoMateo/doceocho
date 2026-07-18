'use client';

import { Button } from '@/components/ui/button';
import { Search, MessageSquare, Edit2, Trash2, MessageCircle } from 'lucide-react';
import React, {
	useMemo,
	useRef,
	useCallback,
	useImperativeHandle,
	forwardRef,
	useEffect,
	useLayoutEffect,
} from 'react';
import { MessageWithUser } from '@/lib/chat/chat-types';
import { CHAT_CONSTANTS } from '../../../constants/chat/chat.constants';
import { QuoteMessage } from './quote-message';
import { formatCreatedAtChat } from '@/utils/format-date';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

export interface MessagesListRef {
	scrollToMessage: (messageId: number, options?: ScrollIntoViewOptions) => boolean;

	scrollToBottom: (options?: ScrollIntoViewOptions) => void;

	scrollToTop: (options?: ScrollToOptions) => void;

	isNearBottom: (threshold?: number) => boolean;
}

interface MessagesListProps {
	filteredMessages: MessageWithUser[];
	searchTerm: string;
	isFiltering: boolean;
	currentUserId: string;
	editingMessage: { id: number; content: string } | null;
	messagesLoading: boolean;
	loadingMore: boolean;
	hasMore: boolean;
	onLoadMore: () => void;
	onEditMessage: (messageId: number, newContent: string) => void;
	onDeleteMessage: (messageId: number) => void;
	onSetEditingMessage: (message: { id: number; content: string } | null) => void;
	onReplyTo: (message: MessageWithUser) => void;
	initialScrollDone?: boolean;
}

export const MessagesList = forwardRef<MessagesListRef, MessagesListProps>(function MessagesList(
	{
		filteredMessages,
		searchTerm,
		isFiltering,
		currentUserId,
		editingMessage,
		messagesLoading,
		loadingMore,
		hasMore,
		onLoadMore,
		onEditMessage,
		onDeleteMessage,
		onSetEditingMessage,
		onReplyTo,
		initialScrollDone = false,
	},
	ref
) {
	const containerRef = useRef<HTMLDivElement>(null);
	const messageRefs = useRef(new Map<number, HTMLDivElement>());
	const sentinelRef = useRef<HTMLDivElement>(null);
	const scrollAnchorRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null);

	const messagesMap = useMemo(() => {
		const map = new Map<number, MessageWithUser>();
		for (const msg of filteredMessages) {
			map.set(msg.id, msg);
		}
		return map;
	}, [filteredMessages]);

	const scrollToMessage = useCallback((messageId: number, options?: ScrollIntoViewOptions) => {
		const element = messageRefs.current.get(messageId);

		if (!element) return false;

		element.scrollIntoView({
			behavior: 'auto',
			block: 'center',
			inline: 'nearest',
			...options,
		});

		return true;
	}, []);

	const scrollToBottom = useCallback(
		(options?: ScrollIntoViewOptions) => {
			const last = filteredMessages.at(-1);

			if (!last) return;

			scrollToMessage(last.id, {
				block: 'end',
				...options,
			});
		},
		[filteredMessages, scrollToMessage]
	);

	const scrollToTop = useCallback((options?: ScrollToOptions) => {
		containerRef.current?.scrollTo({
			top: 0,
			behavior: 'auto',
			...options,
		});
	}, []);

	const isNearBottom = useCallback((threshold = 100) => {
		const container = containerRef.current;

		if (!container) return false;

		const distanceFromBottom =
			container.scrollHeight - container.scrollTop - container.clientHeight;

		return distanceFromBottom <= threshold;
	}, []);

	useImperativeHandle(
		ref,
		() => ({
			scrollToMessage,
			scrollToBottom,
			scrollToTop,
			isNearBottom,
		}),
		[scrollToMessage, scrollToBottom, scrollToTop, isNearBottom]
	);

	useEffect(() => {
		if (loadingMore && containerRef.current) {
			scrollAnchorRef.current = {
				scrollHeight: containerRef.current.scrollHeight,
				scrollTop: containerRef.current.scrollTop,
			};
		}
	}, [loadingMore]);

	useLayoutEffect(() => {
		if (scrollAnchorRef.current && containerRef.current && !loadingMore) {
			const { scrollHeight: prevHeight, scrollTop: prevTop } = scrollAnchorRef.current;
			const newHeight = containerRef.current.scrollHeight;
			const delta = newHeight - prevHeight;

			containerRef.current.scrollTop = prevTop + delta;
			scrollAnchorRef.current = null;
		}
	}, [filteredMessages.length, loadingMore]);

	useEffect(() => {
		const sentinel = sentinelRef.current;
		const container = containerRef.current;

		if (!sentinel || !hasMore || loadingMore) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting && hasMore && !loadingMore) {
					onLoadMore();
				}
			},
			{ root: container, threshold: 0 }
		);

		observer.observe(sentinel);
		return () => observer.disconnect();
	}, [hasMore, loadingMore, onLoadMore, filteredMessages.length]);

	if (messagesLoading) {
		return (
			<div className="flex-1 flex items-center justify-center min-h-0">
				<div className="text-center text-muted-foreground">
					<p>Cargando mensajes...</p>
				</div>
			</div>
		);
	}

	if (filteredMessages.length === 0) {
		return (
			<div className="flex-1 flex items-center justify-center min-h-0">
				<div className="text-center text-muted-foreground">
					{isFiltering ? (
						<>
							<Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
							<p>{CHAT_CONSTANTS.MESSAGES.NO_SEARCH_RESULTS(searchTerm || 'fecha')}</p>
						</>
					) : (
						<>
							<MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
							<p>{CHAT_CONSTANTS.MESSAGES.NO_MESSAGES}</p>
						</>
					)}
				</div>
			</div>
		);
	}

	return (
		<div
			ref={containerRef}
			className={cn('flex-1 min-h-0 overflow-y-auto', !initialScrollDone && 'invisible')}
		>
			{hasMore && <div ref={sentinelRef} className="h-px" />}

			{loadingMore && (
				<div className="text-center text-sm text-muted-foreground py-2">
					Cargando mensajes anteriores...
				</div>
			)}

			{filteredMessages.map((message) => (
				<div
					key={message.id}
					ref={(el) => {
						if (el) {
							messageRefs.current.set(message.id, el);
						} else {
							messageRefs.current.delete(message.id);
						}
					}}
					className="px-3 py-1.5"
				>
					{' '}
					<MessageItem
						message={message}
						messagesMap={messagesMap}
						currentUserId={currentUserId}
						editingMessage={editingMessage}
						onEditMessage={onEditMessage}
						onDeleteMessage={onDeleteMessage}
						onSetEditingMessage={onSetEditingMessage}
						onReplyTo={onReplyTo}
					/>
				</div>
			))}

			{isFiltering && filteredMessages.length > 0 && (
				<div className="text-center text-sm text-muted-foreground py-2">
					{filteredMessages.length}{' '}
					{CHAT_CONSTANTS.MESSAGES.SEARCH_RESULTS(filteredMessages.length)}
				</div>
			)}
		</div>
	);
});

interface MessageItemProps {
	message: MessageWithUser;
	messagesMap: Map<number, MessageWithUser>;
	currentUserId: string;
	editingMessage: { id: number; content: string } | null;
	onEditMessage: (messageId: number, newContent: string) => void;
	onDeleteMessage: (messageId: number) => void;
	onSetEditingMessage: (message: { id: number; content: string } | null) => void;
	onReplyTo: (message: MessageWithUser) => void;
}

function MessageItemComponent({
	message,
	messagesMap,
	currentUserId,
	editingMessage,
	onEditMessage,
	onDeleteMessage,
	onSetEditingMessage,
	onReplyTo,
}: MessageItemProps) {
	const isOwnMessage = message.user_id === currentUserId;
	const quotedMessage = message.reply_to ? messagesMap.get(message.reply_to) : null;

	return (
		<div
			data-message-id={message.id}
			className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
		>
			<div
				className={`max-w-[70%] rounded-lg p-2 ${
					isOwnMessage ? 'bg-primary text-primary-foreground' : 'bg-muted'
				}`}
			>
				{!isOwnMessage && (
					<div className="text-xs font-medium mb-1 opacity-70">
						{message.users
							? `${message.users.name || message.users.username || ''} ${message.users.last_name || ''}`.trim() ||
								'Usuario'
							: 'Usuario'}
					</div>
				)}
				{quotedMessage && (
					<div className="mb-2">
						<QuoteMessage message={quotedMessage} showCancel={false} />
					</div>
				)}
				{message.deleted_at ? (
					<div className="text-sm italic opacity-70">{CHAT_CONSTANTS.MESSAGES.MESSAGE_DELETED}</div>
				) : editingMessage?.id === message.id ? (
					<div className="flex flex-col sm:flex-row gap-2">
						<Textarea
							value={editingMessage.content}
							onChange={(e) => onSetEditingMessage({ id: message.id, content: e.target.value })}
							onKeyDown={(e) => {
								if (e.key === 'Enter' && !e.shiftKey) {
									e.preventDefault();
									onEditMessage(message.id, editingMessage.content);
								} else if (e.key === 'Escape') {
									onSetEditingMessage(null);
								}
							}}
							autoFocus
							className="min-h-[80px] resize-none"
						/>

						<div className="flex gap-2">
							<Button size="sm" onClick={() => onEditMessage(message.id, editingMessage.content)}>
								{CHAT_CONSTANTS.BUTTONS.SAVE}
							</Button>

							<Button
								size="sm"
								variant="outline"
								className="bg-white text-amber-800 hover:bg-white hover:text-amber-800"
								onClick={() => onSetEditingMessage(null)}
							>
								{CHAT_CONSTANTS.BUTTONS.CANCEL}
							</Button>
						</div>
					</div>
				) : (
					<div className="text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
						{message.content}
					</div>
				)}
				<div className="text-xs mt-1 opacity-70 flex items-center justify-between gap-2">
					<span>
						{formatCreatedAtChat(message.created_at)}
						{message.edited_at && ` ${CHAT_CONSTANTS.MESSAGES.EDITED}`}
					</span>
					{!message.deleted_at && (
						<div className="flex gap-1">
							<button
								onClick={() => onReplyTo(message)}
								className="hover:opacity-100 opacity-50"
								title="Responder"
								aria-label="Responder"
							>
								<MessageCircle className="h-3 w-3" />
							</button>
							{isOwnMessage && (
								<>
									<button
										onClick={() =>
											onSetEditingMessage({
												id: message.id,
												content: message.content || '',
											})
										}
										className="hover:opacity-100 opacity-50"
										aria-label="Editar"
									>
										<Edit2 className="h-3 w-3" />
									</button>
									<button
										onClick={() => onDeleteMessage(message.id)}
										className="hover:opacity-100 opacity-50"
										aria-label="Eliminar"
									>
										<Trash2 className="h-3 w-3" />
									</button>
								</>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

const MessageItem = React.memo(MessageItemComponent);
