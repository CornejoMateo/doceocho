'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
	getAllAttendanceHistory,
	getEntriesByPeriod,
	getUserAttendanceSummaries,
	UserAttendanceSummary,
	AttendanceEntryWithDate,
} from '@/lib/attendance/attendance';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type PeriodFilter = 'day' | 'week' | 'month';

export function AdminAttendanceHistory() {
	const [allEntries, setAllEntries] = useState<AttendanceEntryWithDate[]>([]);
	const [filteredEntries, setFilteredEntries] = useState<AttendanceEntryWithDate[]>([]);
	const [summaries, setSummaries] = useState<UserAttendanceSummary[]>([]);
	const [loading, setLoading] = useState(false);
	const [showHistory, setShowHistory] = useState(false);
	const [period, setPeriod] = useState<PeriodFilter>('day');
	const [dateFilter, setDateFilter] = useState<string>('');
	const [selectedUser, setSelectedUser] = useState<string | null>(null);

	const loadHistory = async () => {
		setLoading(true);
		const { data, error } = await getAllAttendanceHistory();
		if (error) {
			console.error('Error loading attendance history:', error);
		} else {
			setAllEntries(data || []);
			const today = new Date().toISOString().split('T')[0];
			const periodEntries = getEntriesByPeriod(data || [], period, today);
			setFilteredEntries(periodEntries);
			setSummaries(getUserAttendanceSummaries(periodEntries));
			setDateFilter(today);
		}
		setLoading(false);
	};

	const handleToggleHistory = () => {
		if (!showHistory && allEntries.length === 0) {
			loadHistory();
		}
		setShowHistory(!showHistory);
	};

	const handlePeriodChange = (newPeriod: PeriodFilter) => {
		setPeriod(newPeriod);
		const periodEntries = getEntriesByPeriod(allEntries, newPeriod, dateFilter);
		setFilteredEntries(periodEntries);
		setSummaries(getUserAttendanceSummaries(periodEntries));
		setSelectedUser(null);
	};

	const handleDateChange = (newDate: string) => {
		setDateFilter(newDate);
		const periodEntries = getEntriesByPeriod(allEntries, period, newDate);
		setFilteredEntries(periodEntries);
		setSummaries(getUserAttendanceSummaries(periodEntries));
		setSelectedUser(null);
	};

	const handleUserSelect = (userId: string) => {
		setSelectedUser(userId === selectedUser ? null : userId);
	};

	const getEntryTypeLabel = (type: string) => {
		switch (type) {
			case 'regular_in':
				return 'Entrada';
			case 'regular_out':
				return 'Salida';
			case 'overtime_in':
				return 'Entrada (HE)';
			case 'overtime_out':
				return 'Salida (HE)';
			default:
				return type;
		}
	};

	const getEntryTypeColor = (type: string) => {
		switch (type) {
			case 'regular_in':
				return 'text-green-600';
			case 'regular_out':
				return 'text-red-600';
			case 'overtime_in':
				return 'text-blue-600';
			case 'overtime_out':
				return 'text-orange-600';
			default:
				return 'text-gray-600';
		}
	};

	const formatHours = (hours: number) => {
		const h = Math.floor(hours);
		const m = Math.round((hours - h) * 60);
		return m > 0 ? `${h}h ${m}m` : `${h}h`;
	};

	if (!showHistory) {
		return (
			<Button onClick={handleToggleHistory} variant="outline" className="w-full">
				Ver historial de empleados
			</Button>
		);
	}

	return (
		<Card className="w-full">
			<CardHeader>
				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
					<CardTitle className="text-lg md:text-xl">Historial de Empleados</CardTitle>
					<Button onClick={handleToggleHistory} variant="ghost" size="sm">
						Ocultar
					</Button>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{loading ? (
					<div className="text-center py-8">Cargando historial...</div>
				) : (
					<>
						<div className="flex flex-col sm:flex-row gap-3">
							<div className="flex gap-2">
								<Button
									variant={period === 'day' ? 'default' : 'outline'}
									size="sm"
									onClick={() => handlePeriodChange('day')}
									className="flex-1 sm:flex-none"
								>
									Día
								</Button>
								<Button
									variant={period === 'week' ? 'default' : 'outline'}
									size="sm"
									onClick={() => handlePeriodChange('week')}
									className="flex-1 sm:flex-none"
								>
									Semana
								</Button>
								<Button
									variant={period === 'month' ? 'default' : 'outline'}
									size="sm"
									onClick={() => handlePeriodChange('month')}
									className="flex-1 sm:flex-none"
								>
									Mes
								</Button>
							</div>
							<input
								type="date"
								value={dateFilter}
								onChange={(e) => handleDateChange(e.target.value)}
								className="px-3 py-2 border rounded-md text-sm w-full sm:w-auto"
							/>
						</div>

						{summaries.length === 0 ? (
							<div className="text-center py-6 text-gray-500 text-sm">
								No hay registros de asistencia
							</div>
						) : (
							<div className="space-y-4">
								{summaries.map((summary: UserAttendanceSummary) => (
									<div key={summary.user_id} className="border rounded-lg overflow-hidden">
										<Button
											onClick={() => handleUserSelect(summary.user_id)}
											variant="ghost"
											className="w-full flex justify-between items-center p-6 hover:bg-gray-50"
										>
											<div className="text-left flex-1">
												<div className="font-medium text-base md:text-lg">{summary.user_name}</div>
												<div className="text-sm md:text-base text-gray-500">
													{summary.entries.length} registros
												</div>
											</div>
											<div className="text-right flex-1">
												<div className="font-bold text-xl md:text-2xl text-blue-600">
													{formatHours(summary.total_hours)}
												</div>
												<div className="text-sm text-gray-500">horas trabajadas</div>
											</div>
										</Button>

										{selectedUser === summary.user_id && (
											<div className="p-4 bg-gray-50 border-t">
												<div className="space-y-2">
													{summary.entries.map((entry: AttendanceEntryWithDate) => (
														<div
															key={entry.id}
															className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 bg-white rounded-lg gap-2"
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
																	{format(new Date(entry.attendance_date), 'dd/MM/yyyy', {
																		locale: es,
																	})}
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
											</div>
										)}
									</div>
								))}
							</div>
						)}
					</>
				)}
			</CardContent>
		</Card>
	);
}
