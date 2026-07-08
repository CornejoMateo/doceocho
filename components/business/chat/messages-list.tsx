'use client';

import { useLayoutEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MessageSquare, Edit2, Trash2, MessageCircle, Loader2 } from 'lucide-react';
import { MessageWithUser } from '@/lib/chat/chat-types';
import { CHAT_CONSTANTS } from '../../../constants/chat/chat.constants';
import { QuoteMessage } from './quote-message';
import { formatCreatedAtChat } from '@/utils/format-date';

interface MessagesListProps {
	messages: MessageWithUser[];
	filteredMessages: MessageWithUser[];
	searchTerm: string;
	currentUserId: string;
	editingMessage: { id: number; content: string } | null;
	messagesScrollRef: React.RefObject<HTMLDivElement | null>;
	messagesLoading: boolean;
	scrollToMessageId?: number | null;
	onEditMessage: (messageId: number, newContent: string) => void;
	onDeleteMessage: (messageId: number) => void;
	onSetEditingMessage: (message: { id: number; content: string } | null) => void;
	onReplyTo: (message: MessageWithUser) => void;
}

export function MessagesList({
	messages,
	filteredMessages,
	searchTerm,
	currentUserId,
	editingMessage,
	messagesScrollRef,
	messagesLoading,
	scrollToMessageId,
	onEditMessage,
	onDeleteMessage,
	onSetEditingMessage,
	onReplyTo,
}: MessagesListProps) {
	const hasScrolledRef = useRef(false);

	useLayoutEffect(() => {
		if (!scrollToMessageId || !messages.length || messagesLoading || hasScrolledRef.current) return;

		hasScrolledRef.current = true;

		const nextMessage = messages.find((m) => m.id > scrollToMessageId);

		if (nextMessage) {
			const el = messagesScrollRef.current?.querySelector(`[data-message-id="${nextMessage.id}"]`);
			if (el) {
				el.scrollIntoView({ block: 'center' });
			}
		} else if (messagesScrollRef.current) {
			messagesScrollRef.current.scrollTop = messagesScrollRef.current.scrollHeight;
		}
	}, [scrollToMessageId, messages, messagesLoading, messagesScrollRef]);

	return (
		<div ref={messagesScrollRef} className="flex-1 overflow-y-auto p-3 min-h-0 max-h-100">
			<div className="space-y-3">
				{messagesLoading ? (
					<div className="text-center text-muted-foreground py-8">
						<p>Cargando mensajes...</p>
					</div>
				) : filteredMessages.length === 0 ? (
					searchTerm ? (
						<div className="text-center text-muted-foreground py-8">
							<Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
							<p>{CHAT_CONSTANTS.MESSAGES.NO_SEARCH_RESULTS(searchTerm)}</p>
						</div>
					) : (
						<div className="text-center text-muted-foreground py-8">
							<MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
							<p>{CHAT_CONSTANTS.MESSAGES.NO_MESSAGES}</p>
						</div>
					)
				) : (
					filteredMessages.map((message) => (
						<MessageItem
							key={message.id}
							message={message}
							messages={messages}
							currentUserId={currentUserId}
							editingMessage={editingMessage}
							onEditMessage={onEditMessage}
							onDeleteMessage={onDeleteMessage}
							onSetEditingMessage={onSetEditingMessage}
							onReplyTo={onReplyTo}
						/>
					))
				)}
				{searchTerm && filteredMessages.length > 0 && (
					<div className="text-center text-sm text-muted-foreground py-2">
						{filteredMessages.length}{' '}
						{CHAT_CONSTANTS.MESSAGES.SEARCH_RESULTS(filteredMessages.length)}
					</div>
				)}
			</div>
		</div>
	);
}

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
					<div className="text-sm">{message.content}</div>
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
