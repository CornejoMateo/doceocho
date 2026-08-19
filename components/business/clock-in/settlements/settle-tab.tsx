'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/utils/formats-money';
import { getAttendanceSettings } from '@/lib/attendance/attendance-settings';
import { getAttendanceEntriesForMonth } from '@/lib/attendance/attendance-entries';
import { upsertMonthlySettlement } from '@/lib/attendance/settlements';
import { translateError } from '@/lib/error-translator';
import { MONTHS } from '@/constants/attendance/settlements';
import { User } from '@/lib/users/users';

interface LiquidarTabProps {
	users: User[];
	onLiquidated: () => void;
}

interface UserHours {
	[key: string]: { regular: number; overtime: number; name: string };
}

function calculateUserHours(entries: any[]): UserHours {
	const userHours: UserHours = {};

	entries.forEach((entry: any) => {
		const userId = entry.attendance.user_id;
		const userName =
			entry.attendance.users?.name && entry.attendance.users?.last_name
				? `${entry.attendance.users.name} ${entry.attendance.users.last_name}`
				: entry.attendance.users?.username || 'Desconocido';

		if (!userHours[userId]) {
			userHours[userId] = { regular: 0, overtime: 0, name: userName };
		}
	});

	const userEntries: { [key: string]: any[] } = {};
	entries.forEach((entry: any) => {
		const userId = entry.attendance.user_id;
		if (!userEntries[userId]) {
			userEntries[userId] = [];
		}
		userEntries[userId].push(entry);
	});

	for (const [userId, userEntryList] of Object.entries(userEntries)) {
		const sortedEntries = userEntryList.sort(
			(a: any, b: any) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime()
		);

		const pendingRegularIn: any[] = [];
		const pendingOvertimeIn: any[] = [];

		for (const entry of sortedEntries) {
			if (entry.type === 'regular_in') {
				pendingRegularIn.push(entry);
			} else if (entry.type === 'regular_out' && pendingRegularIn.length > 0) {
				const matchingIn = pendingRegularIn.shift();
				if (matchingIn) {
					const startTime = new Date(matchingIn.entry_time).getTime();
					const endTime = new Date(entry.entry_time).getTime();
					const hours = (endTime - startTime) / (1000 * 60 * 60);
					userHours[userId].regular += hours;
				}
			} else if (entry.type === 'overtime_in') {
				pendingOvertimeIn.push(entry);
			} else if (entry.type === 'overtime_out' && pendingOvertimeIn.length > 0) {
				const matchingIn = pendingOvertimeIn.shift();
				if (matchingIn) {
					const startTime = new Date(matchingIn.entry_time).getTime();
					const endTime = new Date(entry.entry_time).getTime();
					const hours = (endTime - startTime) / (1000 * 60 * 60);
					userHours[userId].overtime += hours;
				}
			}
		}
	}

	return userHours;
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

export function LiquidarTab({ users, onLiquidated }: LiquidarTabProps) {
	const [year, setYear] = useState(new Date().getFullYear().toString());
	const [month, setMonth] = useState(new Date().getMonth().toString());
	const [hourlyRate, setHourlyRate] = useState<number>(1000);
	const [overtimeRate, setOvertimeRate] = useState<number>(1500);
	const [loading, setLoading] = useState(false);
	const [selectedUserId, setSelectedUserId] = useState<string>('all');
	const [calculating, setCalculating] = useState(false);
	const [calculatedHours, setCalculatedHours] = useState<UserHours | null>(null);

	useEffect(() => {
		setYear(new Date().getFullYear().toString());
		setMonth(new Date().getMonth().toString());
		setSelectedUserId('all');
		setCalculatedHours(null);
	}, []);

	useEffect(() => {
		setCalculatedHours(null);
	}, [selectedUserId, year, month]);

	useEffect(() => {
		loadSettings();
	}, []);

	const loadSettings = async () => {
		const { data: settings } = await getAttendanceSettings();
		if (settings) {
			if (settings.price_hour) setHourlyRate(settings.price_hour);
			if (settings.price_hour_overtime) setOvertimeRate(settings.price_hour_overtime);
		}
	};

	const fetchAndComputeHours = async (): Promise<UserHours | null> => {
		const [yearNum, monthNum] = [Number(year), Number(month)];
		const { data: attendanceData, error: attendanceError } = await getAttendanceEntriesForMonth(
			yearNum,
			monthNum
		);

		if (attendanceError) {
			toast({
				title: 'Error',
				description: translateError(attendanceError) || 'Error al cargar los fichajes',
				variant: 'destructive',
			});
			return null;
		}

		const filteredAttendanceData =
			selectedUserId === 'all'
				? attendanceData
				: attendanceData?.filter((entry: any) => entry.attendance.user_id === selectedUserId);

		return calculateUserHours(filteredAttendanceData || []);
	};

	const handleCalculateHours = async () => {
		setCalculating(true);
		try {
			const hours = await fetchAndComputeHours();
			if (hours) {
				setCalculatedHours(hours);
			}
		} finally {
			setCalculating(false);
		}
	};

	const handleLiquidate = async () => {
		setLoading(true);
		try {
			if (!Number.isFinite(hourlyRate) || hourlyRate < 0) {
				toast({
					title: 'Error de validación',
					description: 'El pago por hora debe ser un número válido y no negativo',
					variant: 'destructive',
				});
				setLoading(false);
				return;
			}

			if (!Number.isFinite(overtimeRate) || overtimeRate < 0) {
				toast({
					title: 'Error de validación',
					description: 'El pago por hora extra debe ser un número válido y no negativo',
					variant: 'destructive',
				});
				setLoading(false);
				return;
			}

			const [yearNum, monthNum] = [Number(year), Number(month)];

			const computedHours = calculatedHours ?? (await fetchAndComputeHours());
			if (!computedHours) {
				setLoading(false);
				return;
			}

			const userHours: UserHours = { ...computedHours };

			if (Object.keys(userHours).length === 0) {
				const usersToSeed =
					selectedUserId === 'all'
						? users.filter((user) => user.role !== 'Admin')
						: users.filter((user) => user.uid_user === selectedUserId);

				usersToSeed.forEach((user) => {
					userHours[user.uid_user] = {
						regular: 0,
						overtime: 0,
						name:
							user.name && user.last_name
								? `${user.name} ${user.last_name}`
								: user.username || 'Desconocido',
					};
				});
			}

			for (const [userId, hours] of Object.entries(userHours)) {
				const amount = hours.regular * hourlyRate + hours.overtime * overtimeRate;

				const { error: insertError } = await upsertMonthlySettlement({
					user_id: userId,
					year: yearNum,
					month: monthNum,
					amount,
					number_hours: hours.regular,
					number_overtime_hours: hours.overtime,
					price_hour: hourlyRate,
					price_overtime_hour: overtimeRate,
				});

				if (insertError) throw insertError;
			}

			toast({
				title: 'Liquidación',
				description: 'Liquidación generada correctamente',
			});

			onLiquidated();
		} catch (error) {
			toast({
				title: 'Error',
				description: translateError(error) || 'Error al generar liquidación',
				variant: 'destructive',
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="space-y-4 py-4">
			<div className="space-y-2">
				<Label htmlFor="user-select">Empleado</Label>
				<Select value={selectedUserId} onValueChange={setSelectedUserId}>
					<SelectTrigger id="user-select">
						<SelectValue placeholder="Selecciona empleado" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Todos los empleados</SelectItem>
						{users
							.filter((user) => user.role !== 'Admin')
							.map((user) => (
								<SelectItem key={user.uid_user} value={user.uid_user}>
									{user.name && user.last_name ? `${user.name} ${user.last_name}` : user.username}
								</SelectItem>
							))}
					</SelectContent>
				</Select>
			</div>
			<div className="grid grid-cols-2 gap-4">
				<div className="space-y-2">
					<Label htmlFor="year">Año</Label>
					<Select value={year} onValueChange={setYear}>
						<SelectTrigger id="year">
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
					<Label htmlFor="month">Mes</Label>
					<Select value={month} onValueChange={setMonth}>
						<SelectTrigger id="month">
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
			<div className="grid grid-cols-2 gap-4">
				<div className="space-y-2">
					<Label htmlFor="hourly-rate">Pago por hora</Label>
					<Input
						id="hourly-rate"
						type="number"
						min="0"
						value={hourlyRate}
						onChange={(e) => setHourlyRate(Number(e.target.value))}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="overtime-rate">Pago por hora extra</Label>
					<Input
						id="overtime-rate"
						type="number"
						min="0"
						value={overtimeRate}
						onChange={(e) => setOvertimeRate(Number(e.target.value))}
					/>
				</div>
			</div>
			{!calculatedHours && (
				<Button
					onClick={handleCalculateHours}
					disabled={calculating || loading}
					variant="outline"
					className="w-full"
				>
					{calculating ? 'Calculando horas...' : 'Calcular horas trabajadas'}
				</Button>
			)}
			{calculatedHours && Object.keys(calculatedHours).length > 0 && (
				<div className="space-y-2 rounded-lg border bg-gray-50 p-4 overflow-y-auto max-h-50">
					{Object.entries(calculatedHours).map(([userId, hours]) => (
						<div key={userId} className="flex items-center justify-between text-sm">
							<div>
								<div className="font-medium">{hours.name}</div>
								<div className="text-xs text-gray-500">
									{hours.regular.toFixed(2)}h normales · {hours.overtime.toFixed(2)}h extras ·{' '}
									{(hours.regular + hours.overtime).toFixed(2)}h totales
								</div>
							</div>
							<div className="font-semibold">
								{formatCurrency(hours.regular * hourlyRate + hours.overtime * overtimeRate)}
							</div>
						</div>
					))}
				</div>
			)}
			{calculatedHours && Object.keys(calculatedHours).length === 0 && (
				<div className="py-2 text-center text-sm text-gray-500">
					No hay horas para calcular en el período seleccionado
				</div>
			)}
			{calculatedHours && (
				<Button onClick={handleLiquidate} disabled={loading} className="w-full">
					{loading ? 'Liquidando...' : 'Liquidar'}
				</Button>
			)}
		</div>
	);
}
