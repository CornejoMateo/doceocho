'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
	getEntriesByPeriod,
	getUserAttendanceEntriesForMonth,
	AttendanceEntryWithDate,
} from '@/lib/attendance/attendance-entries';
import { getEntryTypeLabel, getEntryTypeColor } from '@/helpers/attendance/attendance';
import { useAuth } from '@/components/provider/auth-provider';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { translateError } from '@/lib/error-translator';
import { formatCreatedAt } from '@/utils/format-date';
import { getLocalDate } from '@/utils/format-date';
import { LoadMoreAttendanceModal } from './load-more-attendance-modal';
import { User } from '@/lib/users/users';

type PeriodFilter = 'day' | 'month';

export function AttendanceHistory() {
	const [allEntries, setAllEntries] = useState<AttendanceEntryWithDate[]>([]);
	const [filteredEntries, setFilteredEntries] = useState<AttendanceEntryWithDate[]>([]);
	const [loading, setLoading] = useState(false);
	const [showHistory, setShowHistory] = useState(false);
	const [period, setPeriod] = useState<PeriodFilter>('day');
	const [dateFilter, setDateFilter] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loadMoreOpen, setLoadMoreOpen] = useState(false);
	const { user } = useAuth();

	const loadHistory = async () => {
		const userId = user?.uid;
		if (!userId) return;

		setLoading(true);
		setError(null);
		try {
			const now = getLocalDate().split('-').map(Number);
			const { data, error } = await getUserAttendanceEntriesForMonth(userId, now[0], now[1] - 1);
			if (error) {
				setError(translateError(error) || 'Error al cargar el historial');
			} else {
				const entries = data || [];
				setAllEntries(entries);
				setDateFilter(null);
				setPeriod('day');
				setFilteredEntries(getEntriesByPeriod(entries, 'day', getLocalDate()));
			}
		} catch (err: any) {
			setError(translateError(err) || 'Error al cargar el historial');
		} finally {
			setLoading(false);
		}
	};

	const handleToggleHistory = () => {
		if (!showHistory && allEntries.length === 0) {
			loadHistory();
		}
		setShowHistory(!showHistory);
	};

	const handlePeriodChange = (newPeriod: PeriodFilter) => {
		setPeriod(newPeriod);
		if (newPeriod === 'month') {
			setFilteredEntries(
				dateFilter ? getEntriesByPeriod(allEntries, 'day', dateFilter) : allEntries
			);
		} else {
			setFilteredEntries(getEntriesByPeriod(allEntries, 'day', getLocalDate()));
		}
	};

	const handleDateChange = (newDate: string) => {
		if (!newDate) {
			handleClearDateFilter();
			return;
		}
		setDateFilter(newDate);
		if (period === 'month') {
			setFilteredEntries(getEntriesByPeriod(allEntries, 'day', newDate));
		}
	};

	const handleClearDateFilter = () => {
		setDateFilter(null);
		if (period === 'month') {
			setFilteredEntries(allEntries);
		}
	};

	const [currentYear, currentMonth] = getLocalDate().split('-').map(Number);
	const monthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
	const monthEnd = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${new Date(
		currentYear,
		currentMonth,
		0
	).getDate()}`;

	if (!showHistory) {
		return (
			<Button onClick={handleToggleHistory} variant="outline" className="w-full">
				Ver historial de fichajes
			</Button>
		);
	}

	return (
		<>
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle className="text-lg md:text-xl">Historial de Fichajes</CardTitle>
						<Button onClick={handleToggleHistory} variant="ghost" size="sm">
							Ocultar
						</Button>
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					{loading ? (
						<div className="text-center py-8">Cargando historial...</div>
					) : error ? (
						<div className="text-center py-6 text-red-500 text-sm">{error}</div>
					) : (
						<>
							<div className="flex flex-col sm:flex-row gap-3">
								<div className="flex gap-2">
									<Button
										variant={period === 'day' ? 'default' : 'outline'}
										size="sm"
										onClick={() => handlePeriodChange('day')}
										className="h-10 flex-1 sm:flex-none"
									>
										Hoy
									</Button>
									<Button
										variant={period === 'month' ? 'default' : 'outline'}
										size="sm"
										onClick={() => handlePeriodChange('month')}
										className="h-10 flex-1 sm:flex-none"
									>
										Mes actual
									</Button>
								</div>
								{period === 'month' && (
									<div className="flex gap-2">
										<input
											type="date"
											value={dateFilter ?? ''}
											min={monthStart}
											max={monthEnd}
											onChange={(e) => handleDateChange(e.target.value)}
											className="px-3 py-2 border rounded-md text-sm w-full sm:w-auto"
										/>
										{dateFilter && (
											<Button
												variant="outline"
												size="sm"
												onClick={handleClearDateFilter}
												className="h-10 flex-none"
											>
												Limpiar filtro
											</Button>
										)}
									</div>
								)}
							</div>

							{filteredEntries.length === 0 ? (
								<div className="text-center py-6 text-gray-500 text-sm">
									{allEntries.length === 0
										? 'No hay registros de fichaje'
										: 'No hay registros con los filtros aplicados'}
								</div>
							) : (
								<div className="space-y-2 max-h-80 overflow-y-auto pr-2">
									{filteredEntries.map((entry) => (
										<div
											key={entry.id}
											className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 bg-gray-50 rounded-lg gap-2"
										>
											<div className="flex-1">
												<div
													className={`font-medium text-sm md:text-base ${getEntryTypeColor(
														entry.type
													)}`}
												>
													{getEntryTypeLabel(entry.type)}
												</div>
												<div className="text-xs md:text-sm text-gray-500">
													{formatCreatedAt(entry.attendance_date)}
												</div>
											</div>
											<div className="text-right">
												<div className="font-medium text-sm md:text-base">
													{format(new Date(entry.entry_time), 'HH:mm', {
														locale: es,
													})}
												</div>
											</div>
										</div>
									))}
								</div>
							)}
						</>
					)}
					<Button onClick={() => setLoadMoreOpen(true)} variant="outline" className="mx-auto flex">
						Cargar más fichajes
					</Button>
				</CardContent>
			</Card>
			<LoadMoreAttendanceModal open={loadMoreOpen} onOpenChange={setLoadMoreOpen} user={user} />
		</>
	);
}
