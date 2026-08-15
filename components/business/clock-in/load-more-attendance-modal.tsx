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
import { listUsers, User } from '@/lib/users/users';
import { translateError } from '@/lib/error-translator';
import { toast } from '@/components/ui/use-toast';
import {
	getAttendanceEntriesForMonth,
	mapAttendanceEntries,
	AttendanceEntryWithDate,
} from '@/lib/attendance/attendance-entries';
import { getUserAttendanceSummaries, hasMatchingPair } from '@/lib/attendance/attendance';
import { getEntryTypeLabel, getEntryTypeColor, formatHours } from '@/helpers/attendance/attendance';
import { formatCreatedAt } from '@/utils/format-date';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertTriangle } from 'lucide-react';

interface LoadMoreAttendanceModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function LoadMoreAttendanceModal({ open, onOpenChange }: LoadMoreAttendanceModalProps) {
	const currentYear = new Date().getFullYear();
	const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());
	const [year, setYear] = useState(currentYear.toString());
	const [month, setMonth] = useState(new Date().getMonth().toString());
	const [selectedUserId, setSelectedUserId] = useState<string>('all');
	const [users, setUsers] = useState<User[]>([]);
	const [loadingUsers, setLoadingUsers] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [results, setResults] = useState<AttendanceEntryWithDate[] | null>(null);

	const summaries = results ? getUserAttendanceSummaries(results) : [];

	useEffect(() => {
		if (open) {
			setYear(currentYear.toString());
			setMonth(new Date().getMonth().toString());
			setSelectedUserId('all');
			setResults(null);
			setError(null);
			loadUsers();
		}
	}, [open]);

	const loadUsers = async () => {
		setLoadingUsers(true);
		try {
			const { data, error } = await listUsers();
			if (error) {
				toast({
					title: 'Error',
					description: translateError(error) || 'No se pudo cargar la lista de usuarios',
					variant: 'destructive',
				});
			} else {
				setUsers(data || []);
			}
		} catch (err) {
			toast({
				title: 'Error',
				description: translateError(err) || 'No se pudo cargar la lista de usuarios',
				variant: 'destructive',
			});
		} finally {
			setLoadingUsers(false);
		}
	};

	const handleAccept = async () => {
		setLoading(true);
		setError(null);
		try {
			const { data, error } = await getAttendanceEntriesForMonth(Number(year), Number(month));
			if (error) {
				setError(translateError(error) || 'Error al cargar los fichajes');
				return;
			}
			let entries = mapAttendanceEntries(data || []);
			if (selectedUserId !== 'all') {
				entries = entries.filter((entry) => entry.user_id === selectedUserId);
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
					<div className="space-y-2">
						<Label htmlFor="user-select">Usuario</Label>
						{loadingUsers ? (
							<div className="text-sm text-gray-500">Cargando empleados...</div>
						) : (
							<Select value={selectedUserId} onValueChange={setSelectedUserId}>
								<SelectTrigger id="user-select">
									<SelectValue placeholder="Selecciona usuario" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">Todos los usuarios</SelectItem>
									{users
										.filter((user) => user.role !== 'Admin')
										.map((user) => (
											<SelectItem key={user.uid_user} value={user.uid_user}>
												{user.name && user.last_name
													? `${user.name} ${user.last_name}`
													: user.username}
											</SelectItem>
										))}
								</SelectContent>
							</Select>
						)}
					</div>

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
										<div className="flex justify-between items-center p-4 bg-gray-50">
											<div className="text-left">
												<div className="font-medium text-sm">{summary.user_name}</div>
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
										</div>
										<div className="space-y-2 p-3">
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
