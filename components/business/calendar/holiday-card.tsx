'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { CalendarOff } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';
import { deleteHolidayWorkDay, saveHolidayWorkDay } from '@/lib/calendar/holidays';
import { normalizeTime } from '@/helpers/appointments/availability';
import {
	CalendarHoliday,
	describeHolidayStatus,
	HOLIDAY_TYPE_LABELS,
} from '@/helpers/calendar/holidays';

type HolidayCardProps = {
	holiday: CalendarHoliday;
	isAuthorized: boolean;
	onChanged: () => void;
};

export function HolidayCard({ holiday, isAuthorized, onChanged }: HolidayCardProps) {
	const { toast } = useToast();
	const [start, setStart] = useState('');
	const [end, setEnd] = useState('');
	const [isSaving, setIsSaving] = useState(false);
	const isWorked = holiday.workDay !== null;

	useEffect(() => {
		setStart(holiday.workDay?.start_time ? normalizeTime(holiday.workDay.start_time) : '');
		setEnd(holiday.workDay?.end_time ? normalizeTime(holiday.workDay.end_time) : '');
	}, [holiday]);

	const runSave = async (action: () => Promise<{ error: any }>, successMessage: string) => {
		setIsSaving(true);
		try {
			const { error } = await action();

			if (error) {
				toast({
					variant: 'destructive',
					title: 'Error al guardar el feriado',
					description: translateError(error),
				});
				return;
			}

			toast({ title: 'Feriado actualizado', description: successMessage });
			onChanged();
		} finally {
			setIsSaving(false);
		}
	};

	const handleToggle = (worked: boolean) =>
		runSave(
			() =>
				worked
					? saveHolidayWorkDay({ date: holiday.date, start_time: null, end_time: null })
					: deleteHolidayWorkDay(holiday.date),
			worked ? 'Este día se trabaja en horario habitual.' : 'Este día vuelve a ser no laborable.'
		);

	const handleSaveHours = () => {
		// Both empty means the regular schedule; otherwise both are required.
		if (Boolean(start) !== Boolean(end) || (start && end <= start)) {
			toast({
				variant: 'destructive',
				title: 'Horario inválido',
				description: 'Completá inicio y fin (el fin posterior al inicio) o dejá ambos vacíos.',
			});
			return;
		}

		runSave(
			() =>
				saveHolidayWorkDay({
					date: holiday.date,
					start_time: start || null,
					end_time: end || null,
				}),
			start ? `Se trabaja de ${start} a ${end}.` : 'Se trabaja en horario habitual.'
		);
	};

	return (
		<Card className="p-4 bg-card border-border space-y-3">
			<div className="flex items-start gap-3">
				<CalendarOff
					className={`h-5 w-5 shrink-0 ${isWorked ? 'text-amber-500' : 'text-red-500'}`}
				/>
				<div className="min-w-0">
					<p className="text-sm font-semibold text-foreground break-words">{holiday.name}</p>
					<p className="text-xs text-muted-foreground">
						{HOLIDAY_TYPE_LABELS[holiday.type] ?? 'Feriado'} · {describeHolidayStatus(holiday)}
					</p>
				</div>
			</div>

			{isAuthorized && (
				<div className="space-y-3 border-t border-border pt-3">
					<div className="flex items-center justify-between gap-2">
						<span className="text-sm text-foreground">Se trabaja este día</span>
						<Switch checked={isWorked} onCheckedChange={handleToggle} disabled={isSaving} />
					</div>

					{isWorked && (
						<div className="space-y-2">
							<div className="flex items-center gap-2">
								<Input
									type="time"
									value={start}
									onChange={(event) => setStart(event.target.value)}
									className="flex-1"
								/>
								<span className="text-sm text-muted-foreground">a</span>
								<Input
									type="time"
									value={end}
									onChange={(event) => setEnd(event.target.value)}
									className="flex-1"
								/>
							</div>
							<p className="text-xs text-muted-foreground">
								Dejalo vacío para usar el horario habitual. Las citas respetan este horario.
							</p>
							<Button size="sm" className="w-full" onClick={handleSaveHours} disabled={isSaving}>
								Guardar horario
							</Button>
						</div>
					)}
				</div>
			)}
		</Card>
	);
}
