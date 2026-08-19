'use client';

import { useState, useEffect } from 'react';
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { MONTHS } from '@/constants/attendance/settlements';
import { translateError } from '@/lib/error-translator';
import {
	getAttendanceEntriesForMonth,
	getUserAttendanceEntriesForMonth,
	mapAttendanceEntries,
	AttendanceEntryWithDate,
} from '@/lib/attendance/attendance-entries';
import { getUserAttendanceSummaries, hasMatchingPair } from '@/lib/attendance/attendance';
import { getEntryTypeLabel, getEntryTypeColor, formatHours } from '@/helpers/attendance/attendance';
import { formatCreatedAt } from '@/utils/format-date';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertTriangle } from 'lucide-react';
import { User } from '@/lib/users/users';
import { getLocalDate } from '@/utils/format-date';
import { SessionUser } from '@/components/provider/auth-provider';

interface LoadMoreAttendanceModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	users?: User[];
	user?: SessionUser | null;
}

export function LoadMoreAttendanceModal({
	open,
	onOpenChange,
	users = [],
	user = null,
}: LoadMoreAttendanceModalProps) {
	const currentYear = Number(getLocalDate().split('-')[0]);
	const currentMonth = Number(getLocalDate().split('-')[1]) - 1;
	const years = Array.from({ length: currentYear - 2025 + 1 }, (_, i) =>
		(currentYear - i).toString()
	);
	const [year, setYear] = useState(currentYear.toString());
	const [month, setMonth] = useState(currentMonth.toString());
	const [selectedUserId, setSelectedUserId] = useState<string>('all');
	const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [results, setResults] = useState<AttendanceEntryWithDate[] | null>(null);

	const summaries = results ? getUserAttendanceSummaries(results) : [];

	useEffect(() => {
		if (open) {
			setYear(currentYear.toString());
			setMonth(currentMonth.toString());
			setSelectedUserId('all');
			setExpandedUserId(null);
			setResults(null);
			setError(null);
		}
	}, [open]);

	const handleUserToggle = (userId: string) => {
		setExpandedUserId(expandedUserId === userId ? null : userId);
	};

	const handleAccept = async () => {
		setLoading(true);
		setError(null);
		try {
			let entries: AttendanceEntryWithDate[];
			if (user?.uid) {
				const { data, error } = await getUserAttendanceEntriesForMonth(
					user.uid,
					Number(year),
					Number(month)
				);
				if (error) {
					setError(translateError(error) || 'Error al cargar los fichajes');
					return;
				}
				entries = data || [];
			} else {
				const { data, error } = await getAttendanceEntriesForMonth(Number(year), Number(month));
				if (error) {
					setError(translateError(error) || 'Error al cargar los fichajes');
					return;
				}
				entries = mapAttendanceEntries(data || []);
				if (selectedUserId !== 'all') {
					entries = entries.filter((entry) => entry.user_id === selectedUserId);
				}
			}
			setResults(entries);
		} catch (err: any) {
			setError(translateError(err) || 'Error al cargar los fichajes');
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[650px]">
				<DialogHeader>
					<DialogTitle>Cargar más fichajes</DialogTitle>
					<DialogDescription>
						Selecciona el período y el usuario para cargar sus registros de asistencia
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-4">
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="year-select">Año</Label>
							<Select value={year} onValueChange={setYear}>
								<SelectTrigger id="year-select">
									<SelectValue placeholder="Selecciona año" />
								</SelectTrigger>
								<SelectContent>
									{years.map((y) => (
										<SelectItem key={y} value={y}>
											{y}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="month-select">Mes</Label>
							<Select value={month} onValueChange={setMonth}>
								<SelectTrigger id="month-select">
									<SelectValue placeholder="Selecciona mes" />
								</SelectTrigger>
								<SelectContent>
									{MONTHS.map((m) => (
										<SelectItem key={m.value} value={m.value}>
											{m.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					{!user && (
						<div className="space-y-2">
							<Label htmlFor="user-select">Usuario</Label>
							<Select value={selectedUserId} onValueChange={setSelectedUserId}>
								<SelectTrigger id="user-select">
									<SelectValue placeholder="Selecciona usuario" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">Todos los usuarios</SelectItem>
									{users.map(
										(user) =>
											user.role === 'Taller' && (
												<SelectItem key={user.uid_user} value={user.uid_user}>
													{user.name && user.last_name
														? `${user.name} ${user.last_name}`
														: user.username}
												</SelectItem>
											)
									)}
								</SelectContent>
							</Select>
						</div>
					)}

					{loading && (
						<div className="text-center py-6 text-gray-500 text-sm">Cargando fichajes...</div>
					)}

					{!loading && error && (
						<div className="text-center py-6 text-red-500 text-sm">{error}</div>
					)}

					{!loading && !error && results && (
						<div className="space-y-2 max-h-80 overflow-y-auto pr-2">
							{summaries.length === 0 ? (
								<div className="text-center py-6 text-gray-500 text-sm">
									No hay registros de asistencia para el período seleccionado
								</div>
							) : (
								summaries.map((summary) => (
									<div key={summary.user_id} className="border rounded-lg overflow-hidden">
										<Button
											onClick={() => handleUserToggle(summary.user_id)}
											variant="ghost"
											className="w-full flex h-auto justify-between items-center py-4 bg-gray-50 hover:bg-gray-100 hover:text-inherit cursor-pointer rounded-none"
										>
											<div className="text-left">
												<div className="font-medium text-sm">
													{user ? 'Mis registros' : summary.user_name}
												</div>
												<div className="text-xs text-gray-500">
													{summary.entries.length} registros
												</div>
											</div>
											<div className="text-right">
												<div className="font-bold text-sm text-blue-600">
													{formatHours(summary.total_hours)}
												</div>
												<div className="text-xs text-gray-500">horas trabajadas</div>
											</div>
										</Button>
										{expandedUserId === summary.user_id && (
											<div className="space-y-2 p-3 border-t">
												{summary.entries.map((entry: AttendanceEntryWithDate) => (
													<div
														key={entry.id}
														className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 bg-white rounded-lg gap-2"
													>
														<div className="min-w-0 flex-1">
															<div className="flex items-center gap-2">
																<div
																	className={`font-medium text-sm ${getEntryTypeColor(entry.type)}`}
																>
																	{getEntryTypeLabel(entry.type)}
																</div>
																{!hasMatchingPair(entry, summary.entries) && (
																	<span title="Registro sin par correspondiente">
																		<AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
																	</span>
																)}
															</div>
															<div className="text-xs text-gray-500">
																{formatCreatedAt(entry.attendance_date)}
															</div>
															{entry.description && (
																<div className="mt-1.5 text-sm text-gray-600 break-words">
																	{entry.description}
																</div>
															)}
														</div>
														<div className="font-medium text-sm">
															{format(new Date(entry.entry_time), 'HH:mm', { locale: es })}
														</div>
													</div>
												))}
											</div>
										)}
									</div>
								))
							)}
						</div>
					)}
				</div>
				<DialogFooter>
					<div className="flex gap-2 w-full justify-end">
						<Button variant="outline" onClick={() => onOpenChange(false)}>
							Cerrar
						</Button>
						<Button onClick={handleAccept} disabled={loading}>
							Aceptar
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
