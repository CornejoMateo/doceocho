'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, MessageSquare, Trash2 } from 'lucide-react';
import { VacationRequest } from '@/lib/human-resources/vacation-requests';
import { VACATION_STATUS_VARIANTS } from '@/constants/human-resources/vacations';
import { countVacationDays } from '@/helpers/human-resources/vacations';
import { formatCreatedAt } from '@/utils/format-date';

interface VacationRequestCardProps {
	request: VacationRequest;
	/** Shown on the admin list; omitted when the user looks at their own requests. */
	requesterName?: string;
	onReview?: () => void;
	onCancel?: () => void;
}

export function VacationRequestCard({
	request,
	requesterName,
	onReview,
	onCancel,
}: VacationRequestCardProps) {
	const totalDays = countVacationDays(request.start_date, request.end_date);

	return (
		<div className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-start sm:justify-between">
			<div className="min-w-0 space-y-1">
				{requesterName && (
					<p className="text-sm font-medium text-foreground truncate">{requesterName}</p>
				)}
				<div className="flex items-center gap-2 text-sm text-foreground">
					<CalendarDays className="h-4 w-4 text-muted-foreground flex-shrink-0" />
					<span>
						{formatCreatedAt(request.start_date)} al {formatCreatedAt(request.end_date)}
					</span>
				</div>
				<p className="text-xs text-muted-foreground">
					{totalDays} {totalDays === 1 ? 'día' : 'días'}
				</p>
				{request.reason && (
					<p className="text-xs text-muted-foreground break-words">{request.reason}</p>
				)}
				{request.reviewer_notes && (
					<div className="flex items-start gap-1.5 text-xs text-muted-foreground">
						<MessageSquare className="h-3 w-3 flex-shrink-0 mt-0.5" />
						<span className="break-words">{request.reviewer_notes}</span>
					</div>
				)}
			</div>

			<div className="flex items-center gap-2 sm:justify-end flex-shrink-0">
				<Badge variant={VACATION_STATUS_VARIANTS[request.status]}>{request.status}</Badge>
				{onReview && (
					<Button variant="outline" size="sm" onClick={onReview}>
						{request.status === 'Pendiente' ? 'Revisar' : 'Ver'}
					</Button>
				)}
				{onCancel && (
					<Button
						variant="ghost"
						size="icon"
						onClick={onCancel}
						className="text-muted-foreground hover:text-destructive"
						aria-label="Cancelar pedido"
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				)}
			</div>
		</div>
	);
}
