'use client';

import { useState, forwardRef, useImperativeHandle } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
	getUserAttendanceSummaries,
	UserAttendanceSummary,
	hasMatchingPair,
} from '@/lib/attendance/attendance';
import {
	getEntriesByPeriod,
	getAttendanceEntriesForMonth,
	mapAttendanceEntries,
	AttendanceEntryWithDate,
	deleteAttendanceEntry,
} from '@/lib/attendance/attendance-entries';
import { getEntryTypeLabel, getEntryTypeColor, formatHours } from '@/helpers/attendance/attendance';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { translateError } from '@/lib/error-translator';
import { formatCreatedAt } from '@/utils/format-date';
import { getLocalDate } from '@/utils/format-date';
import { LoadMoreAttendanceModal } from './load-more-attendance-modal';
import { toast } from '@/components/ui/use-toast';
import { Pencil, Trash2, AlertTriangle } from 'lucide-react';
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
import { User } from '@/lib/users/users';
import { AttendanceEntryModal } from './attendance-entry-modal';

type PeriodFilter = 'day' | 'week' | 'month';

export const AdminAttendanceHistory = forwardRef((props: { users?: User[] }, ref) => {
	const { users = [] } = props;
	const [allEntries, setAllEntries] = useState<AttendanceEntryWithDate[]>([]);
	const [summaries, setSummaries] = useState<UserAttendanceSummary[]>([]);
	const [loading, setLoading] = useState(false);
	const [showHistory, setShowHistory] = useState(false);
	const [period, setPeriod] = useState<PeriodFilter>('day');
	const [dateFilter, setDateFilter] = useState<string | null>(null);
	const [selectedUser, setSelectedUser] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [selectedEntry, setSelectedEntry] = useState<AttendanceEntryWithDate | null>(null);
	const [modalOpen, setModalOpen] = useState(false);
	const [loadMoreOpen, setLoadMoreOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [entryToDelete, setEntryToDelete] = useState<AttendanceEntryWithDate | null>(null);

	useImperativeHandle(ref, () => ({
		loadHistory,
	}));

	const loadHistory = async () => {
		setLoading(true);
		setError(null);
		try {
			const now = getLocalDate().split('-').map(Number);
			const { data, error } = await getAttendanceEntriesForMonth(now[0], now[1] - 1);
			if (error) {
				setError(translateError(error) || 'Error al cargar el historial de empleados');
			} else {
				const entries = mapAttendanceEntries(data || []);
				setAllEntries(entries);
				setDateFilter(null);
				setPeriod('day');
				const periodEntries = getEntriesByPeriod(entries, 'day', getLocalDate());
				setSummaries(getUserAttendanceSummaries(periodEntries));
				setSelectedUser(null);
			}
		} catch (err: any) {
			setError(translateError(err) || 'Error al cargar el historial de empleados');
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
		let periodEntries: AttendanceEntryWithDate[];
		if (newPeriod === 'month') {
			periodEntries = dateFilter ? getEntriesByPeriod(allEntries, 'day', dateFilter) : allEntries;
		} else {
			periodEntries = getEntriesByPeriod(allEntries, 'day', getLocalDate());
		}
		setSummaries(getUserAttendanceSummaries(periodEntries));
		setSelectedUser(null);
	};

	const handleDateChange = (newDate: string) => {
		if (!newDate) {
			handleClearDateFilter();
			return;
		}
		setDateFilter(newDate);
		if (period === 'month') {
			const periodEntries = getEntriesByPeriod(allEntries, 'day', newDate);
			setSummaries(getUserAttendanceSummaries(periodEntries));
		}
		setSelectedUser(null);
	};

	const handleClearDateFilter = () => {
		setDateFilter(null);
		if (period === 'month') {
			setSummaries(getUserAttendanceSummaries(allEntries));
		}
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

							{summaries.length === 0 ? (
								<div className="text-center py-6 text-gray-500 text-sm">
									No hay registros de asistencia del dia de hoy o del mes actual.
								</div>
							) : (
								<div className="space-y-2 max-h-96 overflow-y-auto pr-2">
									{summaries.map((summary: UserAttendanceSummary) => {
										const unmatchedIds = new Set(
											summary.entries
												.filter((e) => !hasMatchingPair(e, summary.entries))
												.map((e) => e.id)
										);
										return (
											<div
												key={summary.user_id}
												className="border rounded-lg overflow-hidden h-auto py-4"
											>
												<Button
													onClick={() => handleUserSelect(summary.user_id)}
													variant="ghost"
													className="w-full flex justify-between items-center p-6 hover:bg-gray-50 hover:text-inherit cursor-pointer"
												>
													<div className="text-left flex-1 text-black">
														<div className="flex items-center gap-2">
															<div className="font-medium text-sm md:text-lg">
																{summary.user_name}
															</div>
															{unmatchedIds.size > 0 && (
																<span title="Registros sin par correspondiente">
																	<AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
																</span>
															)}
														</div>
														<div className="text-sm md:text-xs text-gray-500">
															{summary.entries.length} registros
														</div>
													</div>
													<div className="text-right flex-1">
														<div className="font-bold text-base md:text-1xl text-blue-600">
															{formatHours(summary.total_hours)}
														</div>
														<div className="text-xs text-gray-500">horas trabajadas</div>
													</div>
												</Button>

												{selectedUser === summary.user_id && (
													<div className="p-4 bg-gray-50 border-t">
														<div className="flex justify-between items-center mb-4 gap-2">
															<h3 className="font-medium text-sm md:text-base">Registros</h3>
														</div>
														<div className="space-y-2 max-h-96 overflow-y-auto pr-2">
															{summary.entries.map((entry: AttendanceEntryWithDate) => (
																<div
																	key={entry.id}
																	className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 bg-white rounded-lg gap-3"
																>
																	<div className="min-w-0 flex-1">
																		<div className="flex items-center gap-2">
																			<div
																				className={`font-medium text-sm md:text-base ${getEntryTypeColor(
																					entry.type
																				)}`}
																			>
																				{getEntryTypeLabel(entry.type)}
																			</div>

																			{unmatchedIds.has(entry.id) && (
																				<span title="Registro sin par correspondiente">
																					<AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
																				</span>
																			)}
																		</div>

																		<div className="text-xs md:text-sm text-gray-500">
																			{formatCreatedAt(entry.attendance_date)}
																		</div>

																		{entry.description && (
																			<div className="mt-1.5 text-sm text-gray-600 break-words">
																				{entry.description}
																			</div>
																		)}
																	</div>

																	<div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
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
										);
									})}
								</div>
							)}
						</>
					)}
					<Button onClick={() => setLoadMoreOpen(true)} variant="outline" className="mx-auto flex">
						Cargar más fichajes
					</Button>
				</CardContent>
			</Card>
			<LoadMoreAttendanceModal
				open={loadMoreOpen}
				onOpenChange={setLoadMoreOpen}
				users={users}
				user={null}
			/>
			<AttendanceEntryModal
				open={modalOpen}
				onOpenChange={setModalOpen}
				entry={selectedEntry}
				onUpdate={() => {
					setModalOpen(false);
					loadHistory();
				}}
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
		</>
	);
});
