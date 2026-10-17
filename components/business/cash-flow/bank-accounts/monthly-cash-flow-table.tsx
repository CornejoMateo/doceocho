'use client';

import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { useMonthlyCashFlowTable } from '@/hooks/cash-flow-stats/use-monthly-cash-flow-table';
import { formatCurrency } from '@/utils/formats-money';

export function MonthlyCashFlowTable() {
	const state = useMonthlyCashFlowTable();

	return (
		<Card className="bg-card border-border">
			<CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<CardTitle className="text-base">Flujo de caja mensual</CardTitle>
				<Select value={String(state.year)} onValueChange={(v) => state.setYear(Number(v))}>
					<SelectTrigger className="w-28" aria-label="Año">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{state.yearOptions.map((option) => (
							<SelectItem key={option} value={String(option)}>
								{option}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</CardHeader>
			<CardContent>
				{state.error ? (
					<Alert variant="destructive">
						<AlertCircle />
						<AlertTitle>No se pudo cargar el flujo mensual</AlertTitle>
						<AlertDescription className="space-y-2">
							<p>{state.error}</p>
							<Button variant="outline" size="sm" onClick={state.retry} disabled={state.loading}>
								Reintentar
							</Button>
						</AlertDescription>
					</Alert>
				) : state.loading ? (
					<div className="flex justify-center py-8">
						<Spinner className="size-8" aria-label="Cargando flujo mensual" />
					</div>
				) : state.chartData.length === 0 ? (
					<p className="text-sm text-muted-foreground">No hay movimientos en el año seleccionado</p>
				) : (
					<div className="overflow-x-auto">
						<Table data-testid="monthly-cash-flow-table">
							<TableHeader>
								<TableRow>
									<TableHead>Mes</TableHead>
									<TableHead className="text-right">Ingresos</TableHead>
									<TableHead className="text-right">Egresos</TableHead>
									<TableHead className="text-right">Neto</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{state.chartData.map((point) => {
									const net = point.incomeNet - point.expenseNet;
									return (
										<TableRow key={point.month}>
											<TableCell className="font-medium">{point.label}</TableCell>
											<TableCell className="text-right">
												{formatCurrency(point.incomeNet)}
											</TableCell>
											<TableCell className="text-right">
												{formatCurrency(point.expenseNet)}
											</TableCell>
											<TableCell className={`text-right ${net < 0 ? 'text-destructive' : ''}`}>
												{formatCurrency(net)}
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
