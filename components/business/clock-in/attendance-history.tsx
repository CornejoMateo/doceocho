'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
	getUserAttendanceHistory,
	AttendanceEntryWithDate,
	getEntryTypeLabel,
	getEntryTypeColor,
} from '@/lib/attendance/attendance';
import { useAuth } from '@/components/provider/auth-provider';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { translateError } from '@/lib/error-translator';
import { formatCreatedAt } from '@/utils/format-date';

type FilterType = 'all' | 'regular' | 'overtime';

export function AttendanceHistory() {
	const [entries, setEntries] = useState<AttendanceEntryWithDate[]>([]);
	const [filteredEntries, setFilteredEntries] = useState<AttendanceEntryWithDate[]>([]);
	const [loading, setLoading] = useState(false);
	const [showHistory, setShowHistory] = useState(false);
	const [filterType, setFilterType] = useState<FilterType>('all');
	const [dateFilter, setDateFilter] = useState<string>('');
	const [error, setError] = useState<string | null>(null);
	const { user } = useAuth();

	const loadHistory = async () => {
		const userId = user?.uid;
		if (!userId) return;

		setLoading(true);
		setError(null);
		const { data, error } = await getUserAttendanceHistory(userId as string);
		if (error) {
			setError(translateError(error) || 'Error al cargar el historial');
		} else {
			setEntries(data || []);
			setFilteredEntries(data || []);
		}
		setLoading(false);
	};

	const handleToggleHistory = () => {
		if (!showHistory && entries.length === 0) {
			loadHistory();
		}
		setShowHistory(!showHistory);
	};

	useEffect(() => {
		let filtered = entries;

		if (filterType !== 'all') {
			filtered = filtered.filter((entry) =>
				filterType === 'regular'
					? entry.type === 'regular_in' || entry.type === 'regular_out'
					: entry.type === 'overtime_in' || entry.type === 'overtime_out'
			);
		}

		if (dateFilter) {
			filtered = filtered.filter((entry) => entry.attendance_date === dateFilter);
		}

		setFilteredEntries(filtered);
	}, [entries, filterType, dateFilter]);

	return (
		<>
			{!showHistory ? (
				<Button onClick={handleToggleHistory} variant="outline" className="w-full">
					Ver historial de fichajes
				</Button>
			) : (
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
									<div className="flex gap-2 w-full sm:w-auto">
										<Button
											variant={filterType === 'all' ? 'default' : 'outline'}
											size="sm"
											onClick={() => setFilterType('all')}
											className="h-10 flex-1 sm:flex-none"
										>
											Todos
										</Button>
										<Button
											variant={filterType === 'regular' ? 'default' : 'outline'}
											size="sm"
											onClick={() => setFilterType('regular')}
											className="h-10 flex-1 sm:flex-none"
										>
											Normal
										</Button>
										<Button
											variant={filterType === 'overtime' ? 'default' : 'outline'}
											size="sm"
											onClick={() => setFilterType('overtime')}
											className="h-10 flex-1 sm:flex-none"
										>
											Horas Extras
										</Button>
									</div>
									<input
										type="date"
										value={dateFilter}
										onChange={(e) => setDateFilter(e.target.value)}
										className="px-3 py-2 border rounded-md text-sm w-full sm:w-auto"
									/>
								</div>

								{filteredEntries.length === 0 ? (
									<div className="text-center py-6 text-gray-500 text-sm">
										{entries.length === 0
											? 'No hay registros de fichaje'
											: 'No hay registros con los filtros aplicados'}
									</div>
								) : (
									<div className="space-y-2 max-h-96 overflow-y-auto pr-2">
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

								{dateFilter && (
									<Button
										variant="ghost"
										size="sm"
										onClick={() => setDateFilter('')}
										className="w-full"
									>
										Limpiar filtro de fecha
									</Button>
								)}
							</>
						)}
					</CardContent>
				</Card>
			)}
		</>
	);
}
