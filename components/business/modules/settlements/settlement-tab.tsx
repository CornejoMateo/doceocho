'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
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
import {
	getApprovedModulesAmountsForMonth,
	upsertModulesMonthlySettlement,
	UserModulesAmount,
} from '@/lib/modules/modules-settlements';
import { translateError } from '@/lib/error-translator';
import { MONTHS } from '@/constants/attendance/settlements';
import { User } from '@/lib/users/users';

interface LiquidarTabProps {
	users: User[];
	onLiquidated: () => void;
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

export function SettlementTab({ users, onLiquidated }: LiquidarTabProps) {
	const [year, setYear] = useState(new Date().getFullYear().toString());
	const [month, setMonth] = useState(new Date().getMonth().toString());
	const [loading, setLoading] = useState(false);
	const [selectedUserId, setSelectedUserId] = useState<string>('all');
	const [calculating, setCalculating] = useState(false);
	const [calculatedAmounts, setCalculatedAmounts] = useState<UserModulesAmount | null>(null);

	useEffect(() => {
		setYear(new Date().getFullYear().toString());
		setMonth(new Date().getMonth().toString());
		setSelectedUserId('all');
		setCalculatedAmounts(null);
	}, []);

	useEffect(() => {
		setCalculatedAmounts(null);
	}, [selectedUserId, year, month]);

	const fetchAndComputeAmounts = async (): Promise<UserModulesAmount | null> => {
		const [yearNum, monthNum] = [Number(year), Number(month)];
		const { data: amounts, error } = await getApprovedModulesAmountsForMonth(yearNum, monthNum);

		if (error) {
			toast({
				title: 'Error',
				description: translateError(error) || 'Error al cargar los módulos aprobados',
				variant: 'destructive',
			});
			return null;
		}

		if (!amounts) return {};

		if (selectedUserId === 'all') return amounts;

		return amounts[selectedUserId] ? { [selectedUserId]: amounts[selectedUserId] } : {};
	};

	const handleCalculateAmounts = async () => {
		setCalculating(true);
		try {
			if (!year || !month) {
				toast({
					title: 'Error de validación',
					description: 'Por favor, selecciona un año y un mes válidos',
					variant: 'destructive',
				});
				return;
			}

			const amounts = await fetchAndComputeAmounts();
			if (amounts) {
				setCalculatedAmounts(amounts);
			}
		} finally {
			setCalculating(false);
		}
	};

	const handleLiquidate = async () => {
		setLoading(true);
		try {
			const [yearNum, monthNum] = [Number(year), Number(month)];

			const computedAmounts = calculatedAmounts ?? (await fetchAndComputeAmounts());
			if (!computedAmounts) {
				setLoading(false);
				return;
			}

			if (Object.keys(computedAmounts).length === 0) {
				toast({
					title: 'Error de validación',
					description: 'No hay módulos aprobados para liquidar en el período seleccionado',
					variant: 'destructive',
				});
				setLoading(false);
				return;
			}

			const inputs = Object.entries(computedAmounts).map(([userId, userAmount]) => ({
				user_id: userId,
				year: yearNum,
				month: monthNum,
				amount: userAmount.amount,
				modules_count: userAmount.count,
			}));

			const { error: upsertError } = await upsertModulesMonthlySettlement(inputs);

			if (upsertError) throw upsertError;

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
			{!calculatedAmounts && (
				<Button
					onClick={handleCalculateAmounts}
					disabled={calculating || loading}
					variant="outline"
					className="w-full"
				>
					{calculating ? 'Calculando montos...' : 'Calcular módulos aprobados'}
				</Button>
			)}
			{calculatedAmounts && Object.keys(calculatedAmounts).length > 0 && (
				<div className="space-y-2 rounded-lg border bg-gray-50 p-4 overflow-y-auto max-h-50">
					{Object.entries(calculatedAmounts).map(([userId, userAmount]) => (
						<div key={userId} className="flex items-center justify-between text-sm">
							<div className="font-medium">{userAmount.name}</div>
							<div className="text-right">
								<div className="font-semibold">{formatCurrency(userAmount.amount)}</div>
								<div className="text-xs text-gray-500">
									{userAmount.count} {userAmount.count === 1 ? 'módulo' : 'módulos'}
								</div>
							</div>
						</div>
					))}
				</div>
			)}
			{calculatedAmounts && Object.keys(calculatedAmounts).length === 0 && (
				<div className="py-2 text-center text-sm text-gray-500">
					No hay módulos aprobados para liquidar en el período seleccionado
				</div>
			)}
			{calculatedAmounts && (
				<Button onClick={handleLiquidate} disabled={loading} className="w-full">
					{loading ? 'Liquidando...' : 'Liquidar'}
				</Button>
			)}
		</div>
	);
}
