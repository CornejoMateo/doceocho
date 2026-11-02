'use client';

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { AttachmentsGallery } from '@/components/business/shared/attachments/attachments-gallery';

export type EntityAttachmentsSummaryRow = { label: string; value: React.ReactNode };

interface EntityAttachmentsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	kind: 'expense' | 'payment';
	entityId: number | null;
	title: string;
	summary: EntityAttachmentsSummaryRow[];
}

export function EntityAttachmentsDialog({
	open,
	onOpenChange,
	kind,
	entityId,
	title,
	summary,
}: EntityAttachmentsDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="max-h-[85vh] min-w-0 overflow-y-auto sm:max-w-[500px]"
				showCloseButton={false}
			>
				<DialogHeader>
					<div className="flex items-center justify-between gap-2">
						<DialogTitle className="min-w-0 truncate">{title}</DialogTitle>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => onOpenChange(false)}
							className="h-8 w-8 shrink-0"
							aria-label="Cerrar"
						>
							<X className="h-4 w-4" />
						</Button>
					</div>
					<DialogDescription className="sr-only">Detalle de solo lectura</DialogDescription>
				</DialogHeader>

				<dl className="min-w-0 space-y-1.5 text-sm">
					{summary.map((row, index) => (
						<div key={index} className="flex min-w-0 justify-between gap-3">
							<dt className="shrink-0 text-muted-foreground">{row.label}</dt>
							<dd className="min-w-0 break-words text-right">{row.value}</dd>
						</div>
					))}
				</dl>

				<div className="min-w-0 space-y-1.5">
					<p className="text-xs font-medium text-muted-foreground">Archivos adjuntos</p>
					{open && entityId != null && (
						<AttachmentsGallery kind={kind} entityId={entityId} readOnly editKey="cash-flow" />
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
