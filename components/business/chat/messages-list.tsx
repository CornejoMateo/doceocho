'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MessageSquare, Edit2, Trash2, MessageCircle, Loader2 } from 'lucide-react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';
import { MessageWithUser } from '@/lib/chat/chat-types';
import { CHAT_CONSTANTS } from '../../../constants/chat/chat.constants';
import { QuoteMessage } from './quote-message';
import { formatCreatedAtChat } from '@/utils/format-date';

export interface MessagesListHandle {
	scrollToBottom: () => void;
}

interface MessagesListProps {
	messages: MessageWithUser[];
	filteredMessages: MessageWithUser[];
	searchTerm: string;
	currentUserId: string;
	editingMessage: { id: number; content: string } | null;
	messagesLoading: boolean;
	hasMore: boolean;
	loadingMore: boolean;
	onLoadMore: () => Promise<number>;
	onEditMessage: (messageId: number, newContent: string) => void;
	onDeleteMessage: (messageId: number) => void;
	onSetEditingMessage: (message: { id: number; content: string } | null) => void;
	onReplyTo: (message: MessageWithUser) => void;
	channelId: number | null;
	lastReadMessageId: number | null;
	onScrolledToUnread: () => void;
}

export const MessagesList = forwardRef<MessagesListHandle, MessagesListProps>(function MessagesList(
	{
		messages,
		filteredMessages,
		searchTerm,
		currentUserId,
		editingMessage,
		messagesLoading,
		hasMore,
		loadingMore,
		onLoadMore,
		onEditMessage,
		onDeleteMessage,
		onSetEditingMessage,
		onReplyTo,
		lastReadMessageId,
		onScrolledToUnread,
	},
	ref
) {
	const virtuosoRef = useRef<VirtuosoHandle>(null);

	useImperativeHandle(ref, () => ({
		scrollToBottom: () => {
			if (!virtuosoRef.current || filteredMessages.length === 0) return;
			virtuosoRef.current.scrollToIndex({
				index: filteredMessages.length - 1,
				align: 'end',
				behavior: 'smooth',
			});
		},
	}));

	const [firstItemIndex, setFirstItemIndex] = useState(100000);

	const handleLoadMore = async () => {
		const added = await onLoadMore();

		if (added > 0) {
			setFirstItemIndex((prev) => prev - added);
		}
	};

	const firstUnreadIndex = filteredMessages.findIndex((msg) => msg.id > (lastReadMessageId ?? 0));

	useEffect(() => {
		if (!virtuosoRef.current) return;
		if (firstUnreadIndex === -1) return;

		virtuosoRef.current.scrollToIndex({
			index: firstUnreadIndex,
			align: 'center',
			behavior: 'smooth',
		});
		onScrolledToUnread();
	}, [firstUnreadIndex]);

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
					{searchTerm ? (
						<>
							<Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
							<p>{CHAT_CONSTANTS.MESSAGES.NO_SEARCH_RESULTS(searchTerm)}</p>
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
		<div className="flex-1 min-h-0">
			<Virtuoso
				ref={virtuosoRef}
				data={filteredMessages}
				firstItemIndex={firstItemIndex}
				initialTopMostItemIndex={
					firstUnreadIndex !== -1 ? firstUnreadIndex : filteredMessages.length - 1
				}
				computeItemKey={(_, msg) => msg.id}
				itemContent={(_, message) => (
					<div className="px-3 py-1.5">
						<MessageItem
							message={message}
							messages={messages}
							currentUserId={currentUserId}
							editingMessage={editingMessage}
							onEditMessage={onEditMessage}
							onDeleteMessage={onDeleteMessage}
							onSetEditingMessage={onSetEditingMessage}
							onReplyTo={onReplyTo}
						/>
					</div>
				)}
				components={{
					Header: () =>
						hasMore && !searchTerm ? (
							<div className="text-center py-2">
								<Button
									size="sm"
									variant="ghost"
									onClick={handleLoadMore}
									disabled={loadingMore}
									className="text-muted-foreground"
								>
									{loadingMore ? 'Cargando...' : 'Cargar más mensajes'}
								</Button>
							</div>
						) : null,
					Footer: () =>
						searchTerm && filteredMessages.length > 0 ? (
							<div className="text-center text-sm text-muted-foreground py-2">
								{filteredMessages.length}{' '}
								{CHAT_CONSTANTS.MESSAGES.SEARCH_RESULTS(filteredMessages.length)}
							</div>
						) : null,
				}}
				style={{ height: '100%' }}
			/>
		</div>
	);
});

interface MessageItemProps {
	message: MessageWithUser;
	messages: MessageWithUser[];
	currentUserId: string;
	editingMessage: { id: number; content: string } | null;
	onEditMessage: (messageId: number, newContent: string) => void;
	onDeleteMessage: (messageId: number) => void;
	onSetEditingMessage: (message: { id: number; content: string } | null) => void;
	onReplyTo: (message: MessageWithUser) => void;
}

function MessageItem({
	message,
	messages,
	currentUserId,
	editingMessage,
	onEditMessage,
	onDeleteMessage,
	onSetEditingMessage,
	onReplyTo,
}: MessageItemProps) {
	const isOwnMessage = message.user_id === currentUserId;
	const isOptimistic = message.id < 0;
	const quotedMessage = message.reply_to ? messages.find((m) => m.id === message.reply_to) : null;

	return (
		<div
			data-message-id={message.id}
			className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
		>
			<div
				className={`max-w-[70%] rounded-lg p-2 ${
					isOwnMessage ? 'bg-primary text-primary-foreground' : 'bg-muted'
				} ${isOptimistic ? 'opacity-60' : ''}`}
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
					<div className="flex gap-2">
						<Input
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
							className="flex-1"
						/>
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
				) : (
					<div className="text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
						{message.content}
					</div>
				)}
				<div className="text-xs mt-1 opacity-70 flex items-center justify-between gap-2">
					<span>
						{formatCreatedAtChat(message.created_at)}
						{message.edited_at && ` ${CHAT_CONSTANTS.MESSAGES.EDITED}`}
						{isOptimistic && <Loader2 className="inline h-3 w-3 ml-1 animate-spin" />}
					</span>
					{!message.deleted_at && (
						<div className="flex gap-1">
							<button
								onClick={() => onReplyTo(message)}
								className="hover:opacity-100 opacity-50"
								title="Responder"
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
									>
										<Edit2 className="h-3 w-3" />
									</button>
									<button
										onClick={() => onDeleteMessage(message.id)}
										className="hover:opacity-100 opacity-50"
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
