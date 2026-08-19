'use client';

import { Card } from '@/components/ui/card';
import { useOptimizedRealtime } from '@/hooks/use-optimized-realtime';
import { getUserAttendanceSummaries } from '@/lib/attendance/attendance';
import {
	AttendanceEntryWithDate,
	getEntriesByPeriod,
	getAttendanceEntriesForDay,
} from '@/lib/attendance/attendance-entries';
import { getEntryTypeLabel, getEntryTypeColor, formatHours } from '@/helpers/attendance/attendance';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock } from 'lucide-react';
import { getLocalDate } from '@/utils/format-date';
import { useMemo } from 'react';

function isStillWorking(entries: AttendanceEntryWithDate[]): boolean {
	const sorted = [...entries].sort(
		(a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime()
	);

	const pendingRegularIn: AttendanceEntryWithDate[] = [];
	const pendingOvertimeIn: AttendanceEntryWithDate[] = [];

	for (const entry of sorted) {
		if (entry.type === 'regular_in') {
			pendingRegularIn.push(entry);
		} else if (entry.type === 'regular_out' && pendingRegularIn.length > 0) {
			pendingRegularIn.shift();
		} else if (entry.type === 'overtime_in') {
			pendingOvertimeIn.push(entry);
		} else if (entry.type === 'overtime_out' && pendingOvertimeIn.length > 0) {
			pendingOvertimeIn.shift();
		}
	}

	return pendingRegularIn.length > 0 || pendingOvertimeIn.length > 0;
}

export function TodayAttendance() {
	const today = getLocalDate();

	const { data: entries, loading } = useOptimizedRealtime<AttendanceEntryWithDate>(
		'attendance_entries',
		async () => {
			const { data } = await getAttendanceEntriesForDay(today);
			return data ?? [];
		},
		'today_attendance_cache'
	);

	const { todayEntries, summaries, sortedSummaries } = useMemo(() => {
		const todayEntries = getEntriesByPeriod(entries, 'day', today);
		const summaries = getUserAttendanceSummaries(todayEntries);
		const sortedSummaries = summaries
			.map((summary) => ({ summary, working: Number(isStillWorking(summary.entries)) }))
			.sort((a, b) => b.working - a.working)
			.map(({ summary }) => summary);
		return { todayEntries, summaries, sortedSummaries };
	}, [entries, today]);

	return (
		<Card className="p-4 min-w-0">
			<div className="flex items-center justify-between mb-4">
				<h3 className="text-sm font-medium text-muted-foreground">Fichajes de hoy</h3>
				<span className="text-xs rounded-full bg-purple-500/10 text-purple-600 px-2 py-0.5">
					{todayEntries.length}
				</span>
			</div>

			{loading ? (
				<p className="text-sm text-muted-foreground">Cargando fichajes...</p>
			) : summaries.length > 0 ? (
				<div className="grid grid-cols-1 md:grid-cols-1 gap-3 max-h-[500px] overflow-y-auto">
					{sortedSummaries.map((summary) => (
						<div
							key={summary.user_id}
							className="flex gap-4 rounded-xl border border-purple-500/20 hover:bg-purple-500/10 bg-purple-500/5 p-4"
						>
							<div className="flex h-10 w-10 shrink-0 self-center items-center justify-center rounded-full bg-purple-500/10 text-purple-600">
								<Clock className="h-5 w-5" />
							</div>

							<div className="flex-1 min-w-0">
								<div className="flex items-center justify-between gap-2">
									<p className="text-sm font-medium truncate">{summary.user_name}</p>
								</div>

								<div className="mt-2 space-y-1">
									{[...summary.entries]
										.sort(
											(a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime()
										)
										.map((entry) => (
											<div key={entry.id} className="flex items-center justify-between gap-2">
												<span className={`text-sm ${getEntryTypeColor(entry.type)}`}>
													{getEntryTypeLabel(entry.type)}
												</span>
												<span className="text-xs text-muted-foreground">
													{format(new Date(entry.entry_time), 'HH:mm', { locale: es })}
												</span>
											</div>
										))}
								</div>
								{summary.total_hours > 0 && (
									<span className="text-xs font-medium text-muted-foreground">
										{formatHours(summary.total_hours)} trabajadas
									</span>
								)}
							</div>
						</div>
					))}
				</div>
			) : (
				<p className="text-sm text-muted-foreground text-center">No hay fichajes hoy</p>
			)}
		</Card>
	);
}
