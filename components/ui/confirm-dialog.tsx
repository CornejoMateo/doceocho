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
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: string;
	confirmText?: string;
	cancelText?: string;
	onConfirm: () => void;
	isLoading?: boolean;
	loadingText?: string;
}

export function ConfirmDialog({
	open,
	onOpenChange,
	title,
	description,
	confirmText = 'Eliminar',
	cancelText = 'Cancelar',
	onConfirm,
	isLoading = false,
	loadingText = 'Eliminando...',
}: ConfirmDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<div className="flex items-center gap-2">
						<AlertTriangle className="h-5 w-5 text-destructive" />
						<DialogTitle className="text-destructive">{title}</DialogTitle>
					</div>
					<DialogDescription className="text-left">{description}</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
						{cancelText}
					</Button>
					<Button variant="destructive" onClick={onConfirm} disabled={isLoading}>
						{isLoading ? loadingText : confirmText}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
