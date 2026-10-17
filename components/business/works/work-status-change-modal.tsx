'use client';

import { useEffect, useRef, useState } from 'react';
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
import { DatePicker } from '@/components/ui/date-picker';
import { statusConfig } from '@/constants/type-config';
import { getLocalDate, isValidDateOnly } from '@/utils/format-date';
import { parseToday } from '@/utils/format-date';

interface WorkStatusChangeModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	currentStatus: string | null | undefined;
	targetStatus: string | null;

	onConfirm: (newStatus: string, completionDate?: string) => Promise<void> | void;
}

const labelOf = (status: string | null | undefined) =>
	statusConfig.find((s) => s.value === status)?.label ?? 'Pendiente';

export function WorkStatusChangeModal({
	open,
	onOpenChange,
	currentStatus,
	targetStatus,
	onConfirm,
}: WorkStatusChangeModalProps) {
	const [date, setDate] = useState('');
	const [isSaving, setIsSaving] = useState(false);
	const inFlightRef = useRef(false);

	const [shownTarget, setShownTarget] = useState<string | null>(targetStatus);
	useEffect(() => {
		if (targetStatus) setShownTarget(targetStatus);
	}, [targetStatus]);

	const today = getLocalDate();
	const from = currentStatus || 'pending';
	const isCompleting = shownTarget === 'completed';
	const deletesDate = from === 'completed' && !!shownTarget && shownTarget !== 'completed';

	useEffect(() => {
		if (open) setDate(getLocalDate());
	}, [open]);

	const dateError = !isCompleting
		? null
		: !isValidDateOnly(date)
			? 'Elegí una fecha válida.'
			: date > today
				? 'La fecha no puede ser futura.'
				: null;

	const handleConfirm = async () => {
		if (!shownTarget || dateError || inFlightRef.current) return;
		inFlightRef.current = true;
		setIsSaving(true);
		try {
			await onConfirm(shownTarget, isCompleting ? date : undefined);
			onOpenChange(false);
		} catch {
			// Ignore errors, the modal will remain open for the user to retry
		} finally {
			inFlightRef.current = false;
			setIsSaving(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Cambiar estado de la obra</DialogTitle>
					<DialogDescription>
						De <strong>{labelOf(from)}</strong> a <strong>{labelOf(shownTarget)}</strong>
					</DialogDescription>
				</DialogHeader>

				{isCompleting && (
					<div className="space-y-2">
						<Label htmlFor="completion-date">Fecha de finalización</Label>
						<DatePicker
							id="completion-date"
							value={date}
							onChange={setDate}
							toDate={parseToday(today)}
						/>
						{dateError && <p className="text-sm text-destructive">{dateError}</p>}
					</div>
				)}

				{deletesDate && (
					<p className="text-sm text-orange-600">
						Al cambiar el estado se eliminará la fecha de finalización de la obra.
					</p>
				)}

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
						Cancelar
					</Button>
					<Button onClick={handleConfirm} disabled={isSaving || !!dateError}>
						{isSaving ? 'Guardando...' : 'Confirmar'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
