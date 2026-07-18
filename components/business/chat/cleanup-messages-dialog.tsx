'use client';

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CHAT_CONSTANTS } from '../../../constants/chat/chat.constants';

interface CleanupMessagesDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	cleanupDate: string;
	onCleanupDateChange: (date: string) => void;
	onCleanup: () => void;
}

export function CleanupMessagesDialog({
	open,
	onOpenChange,
	cleanupDate,
	onCleanupDateChange,
	onCleanup,
}: CleanupMessagesDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{CHAT_CONSTANTS.DIALOGS.CLEANUP_MESSAGES.TITLE}</DialogTitle>
					<DialogDescription>
						{CHAT_CONSTANTS.DIALOGS.CLEANUP_MESSAGES.DESCRIPTION}
					</DialogDescription>
				</DialogHeader>
				<div className="py-4">
					<Input
						type="date"
						value={cleanupDate}
						onChange={(e) => onCleanupDateChange(e.target.value)}
						className="w-full"
					/>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						{CHAT_CONSTANTS.DIALOGS.CLEANUP_MESSAGES.CANCEL}
					</Button>
					<Button onClick={onCleanup} disabled={!cleanupDate}>
						{CHAT_CONSTANTS.DIALOGS.CLEANUP_MESSAGES.CONFIRM}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
