import { X } from 'lucide-react';
import { MessageWithUser } from '@/lib/chat/chat-types';
import { Button } from '@/components/ui/button';

interface QuoteMessageProps {
	message: MessageWithUser;
	onCancel?: () => void;
	showCancel?: boolean;
}

export function QuoteMessage({ message, onCancel, showCancel = true }: QuoteMessageProps) {
	const isDeleted = message.deleted_at !== null;
	const content = message.content || '';

	return (
		<div className="flex items-start gap-2 p-2 bg-muted/50 rounded-lg border-l-2 border-primary">
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2 mb-1">
					<span className="text-xs font-semibold text-primary">
						{message.users
							? `${message.users.name || message.users.username || ''} ${message.users.last_name || ''}`.trim() ||
								'Usuario'
							: 'Usuario'}
					</span>
				</div>
				<p className="text-sm text-muted-foreground break-all line-clamp-2 [overflow-wrap:anywhere]">
					{isDeleted ? 'Este mensaje fue eliminado' : content}
				</p>
			</div>
			{showCancel && onCancel && (
				<Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onCancel}>
					<X className="h-4 w-4" />
				</Button>
			)}
		</div>
	);
}
