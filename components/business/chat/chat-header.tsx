'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	ArrowLeft,
	Search,
	X,
	Users,
	Calendar,
	MoreVertical,
	MessageSquare,
	CalendarDays,
} from 'lucide-react';
import { ChannelWithLastMessage } from '@/lib/chat/chat-types';
import { CHAT_CONSTANTS } from '../../../constants/chat/chat.constants';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ChatHeaderProps {
	channel: ChannelWithLastMessage;
	showSearch: boolean;
	searchTerm: string;
	isAdmin: boolean;
	isMobile: boolean;
	onSearchToggle: () => void;
	onSearchChange: (value: string) => void;
	onShowMembers: () => void;
	onCleanupMessages: () => void;
	onSearchByDate: () => void;
	onBack: () => void;
}

export function ChatHeader({
	channel,
	showSearch,
	searchTerm,
	isAdmin,
	isMobile,
	onSearchToggle,
	onSearchChange,
	onShowMembers,
	onCleanupMessages,
	onSearchByDate,
	onBack,
}: ChatHeaderProps) {
	return (
		<div className="p-4 border-b flex items-center gap-2 max-w-full">
			{isMobile && (
				<Button variant="ghost" size="icon" onClick={onBack}>
					<ArrowLeft className="h-5 w-5" />
				</Button>
			)}
			{showSearch ? (
				<div className="flex items-center gap-2 flex-1">
					<Input
						placeholder={CHAT_CONSTANTS.MESSAGES.SEARCH_PLACEHOLDER}
						value={searchTerm}
						onChange={(e) => onSearchChange(e.target.value)}
						autoFocus
						className="flex-1"
					/>
					<Button size="sm" variant="ghost" onClick={onSearchToggle}>
						<X className="h-4 w-4" />
					</Button>
				</div>
			) : (
				<div className="flex items-center justify-between flex-1 min-w-0">
					<div className="min-w-0 flex-1">
						<h2 className="text-base font-semibold truncate">
							{channel.name || CHAT_CONSTANTS.CHANNELS.NO_NAME}
						</h2>
						{channel.description && !isMobile && (
							<p className="text-xs text-muted-foreground truncate">{channel.description}</p>
						)}
					</div>
					<div className="flex items-center gap-2 shrink-0">
						{isMobile ? (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button size="sm" variant="outline">
										<MoreVertical className="h-4 w-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem onClick={onSearchToggle}>
										<MessageSquare className="mr-2 h-4 w-4" />
										<span>{CHAT_CONSTANTS.MENU.SEARCH_BY_WORD}</span>
									</DropdownMenuItem>
									<DropdownMenuItem onClick={onSearchByDate}>
										<CalendarDays className="mr-2 h-4 w-4" />
										<span>{CHAT_CONSTANTS.MENU.SEARCH_BY_DATE}</span>
									</DropdownMenuItem>
									<DropdownMenuItem onClick={onShowMembers}>
										<Users className="mr-2 h-4 w-4" />
										<span>{CHAT_CONSTANTS.MENU.MANAGE_MEMBERS}</span>
									</DropdownMenuItem>
									{isAdmin && (
										<DropdownMenuItem onClick={onCleanupMessages}>
											<Calendar className="mr-2 h-4 w-4" />
											<span>{CHAT_CONSTANTS.MENU.CLEAN_MESSAGES}</span>
										</DropdownMenuItem>
									)}
								</DropdownMenuContent>
							</DropdownMenu>
						) : (
							<>
								<Button size="sm" variant="outline" onClick={onSearchToggle}>
									<Search className="h-4 w-4" />
								</Button>
								{isAdmin && (
									<Button size="sm" variant="outline" onClick={onCleanupMessages}>
										<Calendar className="h-4 w-4 mr-2" />
										{CHAT_CONSTANTS.BUTTONS.CLEAN}
									</Button>
								)}
								<Button size="sm" variant="outline" onClick={onShowMembers}>
									<Users className="h-4 w-4 mr-2" />
									{CHAT_CONSTANTS.BUTTONS.MEMBERS}
								</Button>
							</>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
