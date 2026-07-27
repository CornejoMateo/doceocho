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
	getEntryTypeLabel,
	getEntryTypeColor,
	formatHours,
	deleteAttendanceEntry,
	hasMatchingPair,
} from '@/lib/attendance/attendance';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { translateError } from '@/lib/error-translator';
import { formatCreatedAt } from '@/utils/format-date';
import { AttendanceEntryModal } from './attendance-entry-modal';
import { CreateEntryModal } from './create-entry-modal';
import { toast } from '@/components/ui/use-toast';
import { Pencil, Trash2, Plus, AlertTriangle } from 'lucide-react';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
	const [error, setError] = useState<string | null>(null);
	const [selectedEntry, setSelectedEntry] = useState<AttendanceEntryWithDate | null>(null);
	const [modalOpen, setModalOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [entryToDelete, setEntryToDelete] = useState<AttendanceEntryWithDate | null>(null);
	const [createModalOpen, setCreateModalOpen] = useState(false);

	const loadHistory = async () => {
		setLoading(true);
		setError(null);
		const { data, error } = await getAllAttendanceHistory();
		if (error) {
			setError(translateError(error) || 'Error al cargar el historial de empleados');
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

	const handleEditEntry = (entry: AttendanceEntryWithDate) => {
		setSelectedEntry(entry);
		setModalOpen(true);
	};

	const handleDeleteEntry = (entry: AttendanceEntryWithDate) => {
		setEntryToDelete(entry);
		setDeleteDialogOpen(true);
	};

	const confirmDelete = async () => {
		if (!entryToDelete) return;

		const { error } = await deleteAttendanceEntry(entryToDelete.id);
		if (error) {
			toast({
				title: 'Error al eliminar registro',
				description: translateError(error),
				variant: 'destructive',
			});
		} else {
			toast({
				title: 'Registro eliminado',
				description: 'El registro de asistencia se eliminó correctamente',
			});
			loadHistory();
		}
		setDeleteDialogOpen(false);
		setEntryToDelete(null);
	};

	const handleModalClose = () => {
		setModalOpen(false);
		setSelectedEntry(null);
	};

	if (!showHistory) {
		return (
			<Button onClick={handleToggleHistory} variant="outline" className="w-full">
				Ver historial de empleados
			</Button>
		);
	}

	return (
		<>
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
												className="w-full flex justify-between items-center p-6 hover:bg-gray-50 hover:text-inherit cursor-pointer"
											>
												<div className="text-left flex-1 text-black">
													<div className="font-medium text-base md:text-lg">
														{summary.user_name}
													</div>
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
													<div className="flex justify-between items-center mb-4">
														<h3 className="font-medium text-sm md:text-base">Registros</h3>
														<Button
															variant="outline"
															size="sm"
															onClick={() => setCreateModalOpen(true)}
															className="h-8 text-xs"
														>
															<Plus className="h-3 w-3 mr-1" />
															Crear registro
														</Button>
													</div>
													<div className="space-y-2">
														{summary.entries.map((entry: AttendanceEntryWithDate) => (
															<div
																key={entry.id}
																className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 bg-white rounded-lg gap-2"
															>
																<div className="flex-1">
																	<div className="flex items-center gap-2">
																		<div
																			className={`font-medium text-sm md:text-base ${getEntryTypeColor(
																				entry.type
																			)}`}
																		>
																			{getEntryTypeLabel(entry.type)}
																		</div>
																		{!hasMatchingPair(entry, summary.entries) && (
																			<span title="Registro sin par correspondiente">
																				<AlertTriangle className="h-4 w-4 text-orange-500" />
																			</span>
																		)}
																	</div>
																	<div className="text-xs md:text-sm text-gray-500">
																		{formatCreatedAt(entry.attendance_date)}
																	</div>
																</div>
																<div className="flex items-center gap-2">
																	<div className="font-medium text-sm md:text-base">
																		{format(new Date(entry.entry_time), 'HH:mm', {
																			locale: es,
																		})}
																	</div>
																	<div className="flex gap-1">
																		<Button
																			variant="ghost"
																			size="sm"
																			onClick={() => handleEditEntry(entry)}
																			className="h-8 w-8 p-0"
																		>
																			<Pencil className="h-4 w-4" />
																		</Button>
																		<Button
																			variant="ghost"
																			size="sm"
																			onClick={() => handleDeleteEntry(entry)}
																			className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
																		>
																			<Trash2 className="h-4 w-4" />
																		</Button>
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
			<AttendanceEntryModal
				entry={selectedEntry}
				open={modalOpen}
				onOpenChange={handleModalClose}
				onUpdate={loadHistory}
			/>
			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>¿Eliminar registro?</AlertDialogTitle>
						<AlertDialogDescription>
							¿Estás seguro de que deseas eliminar este registro de asistencia? Esta acción no se
							puede deshacer.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
							Eliminar
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			<CreateEntryModal
				userId={selectedUser}
				userName={summaries.find((s) => s.user_id === selectedUser)?.user_name || null}
				open={createModalOpen}
				onOpenChange={setCreateModalOpen}
				onUpdate={loadHistory}
			/>
		</>
	);
}
