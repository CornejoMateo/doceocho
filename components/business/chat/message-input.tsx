'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';
import { CHAT_CONSTANTS } from '@/constants/chat/chat.constants';
import { QuoteMessage } from './quote-message';
import { MessageWithUser } from '@/lib/chat/chat-types';

interface MessageInputProps {
	newMessage: string;
	sending: boolean;
	replyingTo: MessageWithUser | null;
	onMessageChange: (value: string) => void;
	onSendMessage: () => void;
	onCancelReply: () => void;
}

export function MessageInput({
	newMessage,
	sending,
	replyingTo,
	onMessageChange,
	onSendMessage,
	onCancelReply,
}: MessageInputProps) {
	return (
		<div className="p-3 border-t max-w-full">
			{replyingTo && (
				<div className="mb-2">
					<QuoteMessage message={replyingTo} onCancel={onCancelReply} />
				</div>
			)}
			<div className="flex gap-2">
				<Input
					placeholder={CHAT_CONSTANTS.MESSAGES.INPUT_PLACEHOLDER}
					value={newMessage}
					onChange={(e) => onMessageChange(e.target.value)}
					onKeyDown={(e) => e.key === 'Enter' && onSendMessage()}
				/>
				<Button onClick={onSendMessage} disabled={!newMessage.trim() || sending}>
					<Send className="h-4 w-4" />
				</Button>
			</div>
		</div>
	);
}
