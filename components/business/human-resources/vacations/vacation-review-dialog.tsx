'use client';

import React, { useEffect, useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/components/provider/auth-provider';
import { translateError } from '@/lib/error-translator';
import { AlertTriangle, Check, X } from 'lucide-react';
import { VacationRequest, resolveVacationRequest } from '@/lib/human-resources/vacation-requests';
import { notifyVacationEvent } from '@/lib/human-resources/vacation-notifications';
import { countVacationDays, findOverlappingApproved } from '@/helpers/human-resources/vacations';
import { formatCreatedAt } from '@/utils/format-date';

interface VacationReviewDialogProps {
	request: VacationRequest | null;
	/** Every request, used to warn about overlapping approved periods. */
	allRequests: VacationRequest[];
	requesterName: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onResolved: () => void;
}

export function VacationReviewDialog({
	request,
	allRequests,
	requesterName,
	open,
	onOpenChange,
	onResolved,
}: VacationReviewDialogProps) {
	const { toast } = useToast();
	const { user } = useAuth();
	const [reviewerNotes, setReviewerNotes] = useState('');
	const [pendingStatus, setPendingStatus] = useState<'Aprobada' | 'Rechazada' | null>(null);

	useEffect(() => {
		if (!open) return;

		setReviewerNotes(request?.reviewer_notes ?? '');
		setPendingStatus(null);
	}, [open, request]);

	if (!request) return null;

	const totalDays = countVacationDays(request.start_date, request.end_date);
	const overlapping = findOverlappingApproved(
		allRequests,
		request.start_date,
		request.end_date,
		request.id
	);

	const handleResolve = async (status: 'Aprobada' | 'Rechazada') => {
		if (!user?.uid) return;

		setPendingStatus(status);

		try {
			const { error } = await resolveVacationRequest(
				request.id,
				status,
				user.uid,
				reviewerNotes.trim() || null
			);

			if (error) {
				toast({
					variant: 'destructive',
					title: 'Error al resolver el pedido',
					description: translateError(error),
				});
				return;
			}

			toast({
				title: status === 'Aprobada' ? 'Pedido aprobado' : 'Pedido rechazado',
				description: `Se notificó a ${requesterName}.`,
			});

			onOpenChange(false);
			onResolved();

			await notifyVacationEvent(request.id, 'resolved');
		} finally {
			setPendingStatus(null);
		}
	};

	const isBusy = pendingStatus !== null;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="w-[95vw] max-w-lg max-h-[95dvh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{requesterName}</DialogTitle>
					<DialogDescription>
						{formatCreatedAt(request.start_date)} al {formatCreatedAt(request.end_date)} ·{' '}
						{totalDays} {totalDays === 1 ? 'día' : 'días'}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{request.reason && (
						<div className="space-y-1">
							<p className="text-xs text-muted-foreground">Motivo</p>
							<p className="text-sm text-foreground whitespace-pre-wrap">{request.reason}</p>
						</div>
					)}

					{overlapping.length > 0 && (
						<div className="flex gap-2 rounded-lg border border-border bg-secondary/50 p-3">
							<AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
							<p className="text-sm text-muted-foreground">
								Se superpone con {overlapping.length}{' '}
								{overlapping.length === 1 ? 'período ya aprobado' : 'períodos ya aprobados'}.
							</p>
						</div>
					)}

					<div className="grid gap-2">
						<Label htmlFor="reviewer-notes">Observaciones (opcional)</Label>
						<Textarea
							id="reviewer-notes"
							value={reviewerNotes}
							onChange={(event) => setReviewerNotes(event.target.value)}
							placeholder="Se le muestran al empleado junto con la respuesta..."
							rows={3}
							disabled={isBusy}
						/>
					</div>
				</div>

				<DialogFooter className="gap-2">
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isBusy}
					>
						Cancelar
					</Button>
					<Button
						type="button"
						variant="destructive"
						onClick={() => handleResolve('Rechazada')}
						disabled={isBusy}
						className="gap-2"
					>
						<X className="h-4 w-4" />
						{pendingStatus === 'Rechazada' ? 'Rechazando...' : 'Rechazar'}
					</Button>
					<Button
						type="button"
						onClick={() => handleResolve('Aprobada')}
						disabled={isBusy}
						className="gap-2"
					>
						<Check className="h-4 w-4" />
						{pendingStatus === 'Aprobada' ? 'Aprobando...' : 'Aprobar'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
