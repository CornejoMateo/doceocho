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
import { StarRating } from '@/components/ui/star-rating';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/components/provider/auth-provider';
import { translateError } from '@/lib/error-translator';
import { MONTHS } from '@/constants/attendance/settlements';
import { RATING_LABELS } from '@/constants/human-resources/evaluations';
import { Employee, getEmployeeFullName } from '@/lib/human-resources/employees';
import {
	EmployeeEvaluation,
	deleteEmployeeEvaluation,
	upsertEmployeeEvaluation,
} from '@/lib/human-resources/employee-evaluations';
import { EvaluationPeriod } from '@/helpers/human-resources/evaluations';

interface EvaluationFormDialogProps {
	employee: Employee | null;
	evaluation: EmployeeEvaluation | null;
	period: EvaluationPeriod;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSaved: () => void;
}

export function EvaluationFormDialog({
	employee,
	evaluation,
	period,
	open,
	onOpenChange,
	onSaved,
}: EvaluationFormDialogProps) {
	const { toast } = useToast();
	const { user } = useAuth();
	const [rating, setRating] = useState<number | null>(null);
	const [notes, setNotes] = useState('');
	const [isSaving, setIsSaving] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	useEffect(() => {
		if (!open) return;

		setRating(evaluation?.rating ?? null);
		setNotes(evaluation?.notes ?? '');
	}, [open, evaluation]);

	if (!employee) return null;

	const monthLabel = MONTHS[period.month]?.label ?? '';

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();

		if (!rating) {
			toast({
				variant: 'destructive',
				title: 'Falta la puntuación',
				description: 'Elegí una cantidad de estrellas antes de guardar.',
			});
			return;
		}

		setIsSaving(true);

		try {
			const { error } = await upsertEmployeeEvaluation({
				employee_id: employee.id,
				year: period.year,
				month: period.month,
				rating,
				notes: notes.trim() || null,
				evaluated_by: user?.uid || null,
			});

			if (error) {
				toast({
					variant: 'destructive',
					title: 'Error al guardar la evaluación',
					description: translateError(error),
				});
				return;
			}

			toast({
				title: 'Evaluación guardada',
				description: `${getEmployeeFullName(employee)} · ${monthLabel} ${period.year}`,
			});

			onOpenChange(false);
			onSaved();
		} finally {
			setIsSaving(false);
		}
	};

	const handleDelete = async () => {
		if (!evaluation) return;

		setIsDeleting(true);

		try {
			const { error } = await deleteEmployeeEvaluation(evaluation.id);

			if (error) {
				toast({
					variant: 'destructive',
					title: 'Error al eliminar la evaluación',
					description: translateError(error),
				});
				return;
			}

			toast({
				title: 'Evaluación eliminada',
				description: `Se borró la evaluación de ${monthLabel} ${period.year}.`,
			});

			onOpenChange(false);
			onSaved();
		} finally {
			setIsDeleting(false);
		}
	};

	const isBusy = isSaving || isDeleting;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="w-[95vw] max-w-lg max-h-[95dvh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{getEmployeeFullName(employee)}</DialogTitle>
					<DialogDescription>
						Evaluación de {monthLabel} {period.year}
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-6">
					<div className="grid gap-2">
						<Label>Puntuación</Label>
						<div className="flex items-center gap-3">
							<StarRating
								value={rating}
								onChange={setRating}
								size="lg"
								label={`Puntuación de ${getEmployeeFullName(employee)}`}
							/>
							<span className="text-sm text-muted-foreground">
								{rating ? RATING_LABELS[rating] : 'Sin puntuar'}
							</span>
						</div>
					</div>

					<div className="grid gap-2">
						<Label htmlFor="evaluation-notes">Observaciones</Label>
						<Textarea
							id="evaluation-notes"
							value={notes}
							onChange={(event) => setNotes(event.target.value)}
							placeholder="Anotá lo que quieras destacar de este mes..."
							rows={5}
							disabled={isBusy}
						/>
					</div>

					<DialogFooter className="gap-2 sm:justify-between">
						{evaluation ? (
							<Button
								type="button"
								variant="ghost"
								className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
								onClick={handleDelete}
								disabled={isBusy}
							>
								{isDeleting ? 'Eliminando...' : 'Eliminar'}
							</Button>
						) : (
							<span />
						)}
						<div className="flex gap-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
								disabled={isBusy}
							>
								Cancelar
							</Button>
							<Button type="submit" disabled={isBusy}>
								{isSaving ? 'Guardando...' : 'Guardar'}
							</Button>
						</div>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
