'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { ChannelWithLastMessage } from '@/lib/chat/chat-types';
import { CHAT_CONSTANTS, MAX_UNREAD_DISPLAY } from '../../../constants/chat/chat.constants';
import { useIsMobile } from '@/components/ui/use-mobile';

interface ChatSidebarProps {
	channels: ChannelWithLastMessage[];
	selectedChannel: ChannelWithLastMessage | null;
	loading: boolean;
	initialLoadDone: boolean;
	isAdmin: boolean;
	onChannelSelect: (channel: ChannelWithLastMessage) => void;
	onCreateChannel: () => void;
	onDeleteChannel: (channelId: number, channelName: string) => void;
	pushNotificationSettings?: React.ReactNode;
}

export function ChatSidebar({
	channels,
	selectedChannel,
	loading,
	initialLoadDone,
	isAdmin,
	onChannelSelect,
	onCreateChannel,
	onDeleteChannel,
	pushNotificationSettings,
}: ChatSidebarProps) {
	const isMobile = useIsMobile();

	return (
		<Card className="w-full max-w-80 flex flex-col h-full overflow-hidden shrink-0">
			<div className="p-4 border-b">
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-semibold">{CHAT_CONSTANTS.CHANNELS.TITLE}</h2>
					{isAdmin && (
						<Button size="sm" onClick={onCreateChannel}>
							<Plus className="h-4 w-4 mr-2" />
							{CHAT_CONSTANTS.CHANNELS.NEW_CHANNEL}
						</Button>
					)}
				</div>
			</div>
			{isMobile && <div className="px-4 pt-3 pb-1 border-b">{pushNotificationSettings}</div>}
			<div className="flex-1 overflow-y-auto">
				{loading && !initialLoadDone ? (
					<div className="p-4 text-center text-sm text-muted-foreground">
						{CHAT_CONSTANTS.MESSAGES.LOADING_CHANNELS}
					</div>
				) : channels.length === 0 ? (
					<div className="p-4 text-center text-sm text-muted-foreground">
						{CHAT_CONSTANTS.MESSAGES.NO_CHANNELS}
					</div>
				) : (
					<div className="p-1.5 space-y-1">
						{channels.map((channel, i) => (
							<div
								key={`${channel.id}-${i}`}
								className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
									selectedChannel?.id === channel.id
										? 'bg-primary text-primary-foreground'
										: 'hover:bg-muted'
								}`}
							>
								<button
									onClick={() => onChannelSelect(channel)}
									className="flex-1 flex items-center gap-2 text-left"
								>
									<div className="flex-1 min-w-0">
										<div className="font-medium">
											{channel.name || CHAT_CONSTANTS.CHANNELS.NO_NAME}
										</div>
										{channel.description && (
											<div className="text-xs opacity-70 truncate">{channel.description}</div>
										)}
									</div>
									{channel.unread_count && channel.unread_count > 0 && (
										<div className="bg-primary text-primary-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center shrink-0">
											{channel.unread_count > MAX_UNREAD_DISPLAY
												? `${MAX_UNREAD_DISPLAY}+`
												: channel.unread_count}
										</div>
									)}
								</button>
								{isAdmin && (
									<Button
										variant="ghost"
										size="icon"
										onClick={(e) => {
											e.stopPropagation();
											onDeleteChannel(channel.id, channel.name || CHAT_CONSTANTS.CHANNELS.NO_NAME);
										}}
										className="shrink-0"
									>
										<Trash2 className="h-4 w-4 text-destructive" />
									</Button>
								)}
							</div>
						))}
					</div>
				)}
			</div>
		</Card>
	);
}
