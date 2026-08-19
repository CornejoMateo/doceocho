'use client';

import { useState, useEffect } from 'react';
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
	getMonthlySettlementsByMonth,
	MonthlySettlementWithUser,
} from '@/lib/attendance/settlements';
import { MONTHS } from '@/constants/attendance/settlements';
import { Spinner } from '@/components/ui/spinner';

const prevMonthDate = new Date();
prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

export function SettlementsListTab() {
	const [settlementsYear, setSettlementsYear] = useState(prevMonthDate.getFullYear().toString());
	const [settlementsMonth, setSettlementsMonth] = useState(prevMonthDate.getMonth().toString());
	const [settlements, setSettlements] = useState<MonthlySettlementWithUser[]>([]);
	const [loadingSettlements, setLoadingSettlements] = useState(false);

	useEffect(() => {
		let cancelled = false;

		const run = async () => {
			setLoadingSettlements(true);
			try {
				const { data, error } = await getMonthlySettlementsByMonth(
					Number(settlementsYear),
					Number(settlementsMonth)
				);
				if (cancelled) return;
				if (error) throw error;
				setSettlements(data || []);
			} catch (error) {
				if (cancelled) return;
				toast({
					title: 'Error',
					description: 'Error al cargar liquidaciones',
					variant: 'destructive',
				});
			} finally {
				if (!cancelled) setLoadingSettlements(false);
			}
		};

		run();

		return () => {
			cancelled = true;
		};
	}, [settlementsYear, settlementsMonth]);

	return (
		<div className="space-y-4 py-4">
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
				<div className="space-y-2 overflow-y-auto max-h-80">
					{settlements.map((settlement) => (
						<div key={settlement.id} className="border rounded-lg p-4">
							<div className="flex justify-between items-center">
								<div>
									<div className="font-medium">{settlement.user_name}</div>
									<div className="text-sm text-gray-500">
										{MONTHS[settlement.month]?.label} {settlement.year}
									</div>
									<div className="text-xs text-gray-400">
										{settlement.number_hours.toFixed(2)}h normales ·{' '}
										{settlement.number_overtime_hours.toFixed(2)}h extras
									</div>
								</div>
								<div className="font-bold text-green-600">{formatCurrency(settlement.amount)}</div>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
