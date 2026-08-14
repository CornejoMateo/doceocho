'use client';

import { useState, useEffect } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/utils/formats-money';
import { getAttendanceSettings } from '@/lib/attendance/attendance-settings';
import { getAttendanceEntriesForMonth } from '@/lib/attendance/attendance-entries';
import { upsertMonthlySettlement } from '@/lib/attendance/settlements';
import { translateError } from '@/lib/error-translator';
import { MONTHS } from '@/constants/attendance/settlements';
import { getSupabaseClient } from '@/lib/supabase-client';
import { Spinner } from '@/components/ui/spinner';
import { listUsers, User } from '@/lib/users/users';

interface SettlementsModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

interface MonthlySettlement {
	id: string;
	created_at: string;
	year: number;
	month: number;
	user_id: string;
	amount: number;
	number_hours: number;
	number_overtime_hours: number;
	price_hour: number;
	price_overtime_hour: number;
	user_name?: string;
}

export function SettlementsModal({ open, onOpenChange }: SettlementsModalProps) {
	const [activeTab, setActiveTab] = useState<'liquidar' | 'liquidaciones'>('liquidar');
	const [year, setYear] = useState(new Date().getFullYear().toString());
	const [month, setMonth] = useState(new Date().getMonth().toString());
	const [hourlyRate, setHourlyRate] = useState<number>(1000);
	const [overtimeRate, setOvertimeRate] = useState<number>(1500);
	const [loading, setLoading] = useState(false);
	const [loadingSettlements, setLoadingSettlements] = useState(false);
	const [settlements, setSettlements] = useState<MonthlySettlement[]>([]);
	const [users, setUsers] = useState<User[]>([]);
	const [selectedUserId, setSelectedUserId] = useState<string>('all');
	const prevMonthDate = new Date();
	prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
	const [settlementsYear, setSettlementsYear] = useState(prevMonthDate.getFullYear().toString());
	const [settlementsMonth, setSettlementsMonth] = useState(prevMonthDate.getMonth().toString());
	const currentYear = new Date().getFullYear();
	const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

	// Load default rates from settings and users
	useEffect(() => {
		if (open) {
			loadSettings();
			loadUsers();
		}
	}, [open]);

	const loadSettings = async () => {
		const { data: settings } = await getAttendanceSettings();
		if (settings) {
			if (settings.price_hour) setHourlyRate(settings.price_hour);
			if (settings.price_hour_overtime) setOvertimeRate(settings.price_hour_overtime);
		}
	};

	const loadUsers = async () => {
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
		}
	};

	const handleLiquidate = async () => {
		setLoading(true);
		try {
			// Validate rates
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

			// Get all attendance entries for the selected month
			const [yearNum, monthNum] = [Number(year), Number(month)];
			const { data: attendanceData, error: attendanceError } = await getAttendanceEntriesForMonth(
				yearNum,
				monthNum
			);

			if (attendanceError) throw attendanceError;

			// Filter by user if specific user is selected
			const filteredAttendanceData =
				selectedUserId === 'all'
					? attendanceData
					: attendanceData?.filter((entry: any) => entry.attendance.user_id === selectedUserId);

			// Group by user and calculate hours precisely
			const userHours: { [key: string]: { regular: number; overtime: number; name: string } } = {};

			filteredAttendanceData?.forEach((entry: any) => {
				const userId = entry.attendance.user_id;
				const userName =
					entry.attendance.users?.name && entry.attendance.users?.last_name
						? `${entry.attendance.users.name} ${entry.attendance.users.last_name}`
						: entry.attendance.users?.username || 'Desconocido';

				if (!userHours[userId]) {
					userHours[userId] = { regular: 0, overtime: 0, name: userName };
				}
			});

			// Calculate hours for each user by pairing entries
			const userEntries: { [key: string]: any[] } = {};
			filteredAttendanceData?.forEach((entry: any) => {
				const userId = entry.attendance.user_id;
				if (!userEntries[userId]) {
					userEntries[userId] = [];
				}
				userEntries[userId].push(entry);
			});

			for (const [userId, entries] of Object.entries(userEntries)) {
				const sortedEntries = entries.sort(
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

			// Create settlements for each user
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

			// Switch to liquidaciones tab to show results
			setActiveTab('liquidaciones');
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

	const loadSettlements = async () => {
		setLoadingSettlements(true);
		try {
			const supabase = getSupabaseClient();

			const { data, error } = await supabase
				.from('monthly_settlements')
				.select(
					`
					*,
					users (
						name,
						last_name,
						username
					)
				`
				)
				.eq('year', Number(settlementsYear))
				.eq('month', Number(settlementsMonth));

			if (error) throw error;

			const settlementsWithNames =
				data?.map((settlement: any) => ({
					...settlement,
					user_name:
						settlement.users?.name && settlement.users?.last_name
							? `${settlement.users.name} ${settlement.users.last_name}`
							: settlement.users?.username || 'Desconocido',
				})) || [];

			setSettlements(settlementsWithNames);
		} catch (error) {
			toast({
				title: 'Error',
				description: 'Error al cargar liquidaciones',
				variant: 'destructive',
			});
		} finally {
			setLoadingSettlements(false);
		}
	};

	useEffect(() => {
		if (open && activeTab === 'liquidaciones') {
			loadSettlements();
		}
	}, [open, activeTab, settlementsYear, settlementsMonth]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[600px]">
				<DialogHeader>
					<DialogTitle>Liquidaciones</DialogTitle>
					<DialogDescription>Gestiona las liquidaciones de sueldos</DialogDescription>
				</DialogHeader>
				<Tabs
					value={activeTab}
					onValueChange={(v) => setActiveTab(v as 'liquidar' | 'liquidaciones')}
				>
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="liquidar">Liquidar</TabsTrigger>
						<TabsTrigger value="liquidaciones">Liquidaciones</TabsTrigger>
					</TabsList>
					<TabsContent value="liquidar" className="space-y-4 py-4">
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
												{user.name && user.last_name
													? `${user.name} ${user.last_name}`
													: user.username}
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
						<Button onClick={handleLiquidate} disabled={loading} className="w-full">
							{loading ? 'Liquidando...' : 'Liquidar'}
						</Button>
					</TabsContent>
					<TabsContent value="liquidaciones" className="space-y-4 py-4">
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="settlements-year">Año</Label>
								<Select value={settlementsYear} onValueChange={setSettlementsYear}>
									<SelectTrigger id="settlements-year">
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
								<Label htmlFor="settlements-month">Mes</Label>
								<Select value={settlementsMonth} onValueChange={setSettlementsMonth}>
									<SelectTrigger id="settlements-month">
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
						{loadingSettlements ? (
							<div className="flex justify-center py-8">
								<Spinner className="h-8 w-8 text-muted-foreground" />
							</div>
						) : settlements.length === 0 ? (
							<div className="text-center py-8 text-gray-500">
								No hay liquidaciones para el período seleccionado
							</div>
						) : (
							<div className="space-y-2">
								{settlements.map((settlement) => (
									<div key={settlement.id} className="border rounded-lg p-4">
										<div className="flex justify-between items-center">
											<div>
												<div className="font-medium">{settlement.user_name}</div>
												<div className="text-sm text-gray-500">
													{MONTHS[settlement.month].label} {settlement.year}
												</div>
												<div className="text-xs text-gray-400">
													{settlement.number_hours.toFixed(2)}h normales ·{' '}
													{settlement.number_overtime_hours.toFixed(2)}h extras
												</div>
											</div>
											<div className="font-bold text-green-600">
												{formatCurrency(settlement.amount)}
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</TabsContent>
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}
