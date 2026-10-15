'use client';

import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { useSummaryTab } from '@/hooks/cash-flow-stats/use-summary-tab';
import { SummaryKpis } from '@/components/business/cash-flow/summary-kpis';
import { SummaryMonthlyChart } from '@/components/business/cash-flow/summary-monthly-chart';
import { SummaryByWork } from '@/components/business/cash-flow/summary-by-work';

export function SummaryTab() {
	const state = useSummaryTab();

	return (
		<div className="space-y-4 min-w-0">
			<div className="flex flex-wrap items-center justify-end gap-2">
				<Select value={String(state.month)} onValueChange={(v) => state.setMonth(Number(v))}>
					<SelectTrigger className="w-32" aria-label="Mes">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{state.monthOptions.map((option) => (
							<SelectItem key={option.value} value={String(option.value)}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
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
				<Select value={String(state.workId)} onValueChange={(v) => state.setWorkId(Number(v))}>
					<SelectTrigger className="w-48" aria-label="Obra">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{state.workOptions.map((option) => (
							<SelectItem key={option.value} value={String(option.value)}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{state.error ? (
				<Alert variant="destructive">
					<AlertCircle />
					<AlertTitle>No se pudo cargar el resumen</AlertTitle>
					<AlertDescription className="space-y-2">
						<p>{state.error}</p>
						<Button variant="outline" size="sm" onClick={state.retry} disabled={state.loading}>
							Reintentar
						</Button>
					</AlertDescription>
				</Alert>
			) : state.loading ? (
				<div className="flex justify-center py-8">
					<Spinner className="size-8" aria-label="Cargando resumen" />
				</div>
			) : (
				<>
					<SummaryKpis cards={state.cards} />
					<SummaryMonthlyChart data={state.chartData} selectedMonth={state.month} />
					<SummaryByWork rows={state.workResultRows} />
				</>
			)}
		</div>
	);
}
