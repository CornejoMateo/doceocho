'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getUserAttendanceHistory, AttendanceEntryWithDate } from '@/lib/attendance/attendance';
import { useAuth } from '@/components/provider/auth-provider';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type FilterType = 'all' | 'regular' | 'overtime';

export function AttendanceHistory() {
	const [entries, setEntries] = useState<AttendanceEntryWithDate[]>([]);
	const [filteredEntries, setFilteredEntries] = useState<AttendanceEntryWithDate[]>([]);
	const [loading, setLoading] = useState(true);
	const [filterType, setFilterType] = useState<FilterType>('all');
	const [dateFilter, setDateFilter] = useState<string>('');
	const { user } = useAuth();

	useEffect(() => {
		const userId = user?.uid;
		if (!userId) return;

		async function loadHistory() {
			setLoading(true);
			const { data, error } = await getUserAttendanceHistory(userId as string);
			if (error) {
				console.error('Error loading attendance history:', error);
			} else {
				setEntries(data || []);
				setFilteredEntries(data || []);
			}
			setLoading(false);
		}

		loadHistory();
	}, [user]);

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

	if (loading) {
		return (
			<Card>
				<CardContent className="py-8">
					<div className="text-center">Cargando historial...</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-lg md:text-xl">Historial de Fichajes</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex flex-col sm:flex-row gap-3">
					<div className="flex gap-2">
						<Button
							variant={filterType === 'all' ? 'default' : 'outline'}
							size="sm"
							onClick={() => setFilterType('all')}
							className="flex-1 sm:flex-none"
						>
							Todos
						</Button>
						<Button
							variant={filterType === 'regular' ? 'default' : 'outline'}
							size="sm"
							onClick={() => setFilterType('regular')}
							className="flex-1 sm:flex-none"
						>
							Normal
						</Button>
						<Button
							variant={filterType === 'overtime' ? 'default' : 'outline'}
							size="sm"
							onClick={() => setFilterType('overtime')}
							className="flex-1 sm:flex-none"
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
					<div className="space-y-2">
						{filteredEntries.map((entry) => (
							<div
								key={entry.id}
								className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 bg-gray-50 rounded-lg gap-2"
							>
								<div className="flex-1">
									<div
										className={`font-medium text-sm md:text-base ${getEntryTypeColor(entry.type)}`}
									>
										{getEntryTypeLabel(entry.type)}
									</div>
									<div className="text-xs md:text-sm text-gray-500">
										{format(new Date(entry.attendance_date), 'dd/MM/yyyy', { locale: es })}
									</div>
								</div>
								<div className="text-right">
									<div className="font-medium text-sm md:text-base">
										{format(new Date(entry.entry_time), 'HH:mm', { locale: es })}
									</div>
								</div>
							</div>
						))}
					</div>
				)}

				{dateFilter && (
					<Button variant="ghost" size="sm" onClick={() => setDateFilter('')} className="w-full">
						Limpiar filtro de fecha
					</Button>
				)}
			</CardContent>
		</Card>
	);
}
