'use client';

import { WeeklyClients } from '@/components/dashboard/weekly-clients';
import { WeeklyWorks } from '@/components/dashboard/weekly-works';
import { TodayAttendance } from '@/components/dashboard/today-attendance';
import { OverdueEvents } from '@/components/dashboard/overdue-events';
import { NeedsAttention } from '@/components/dashboard/needs-attention';
import { ReceivablesSummary } from '@/components/dashboard/receivables-summary';
import { useDashboardSummary } from '@/hooks/dashboard/use-dashboard-summary';

export function DashboardHome() {
	const { pending, receivables, isLoading } = useDashboardSummary();

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold text-foreground text-balance">
					Bienvenido al Sistema de Gestión
				</h2>
				<p className="text-muted-foreground mt-1">Resumen de actividades y alertas</p>
			</div>

			{/* What is blocked on a decision comes first: it is what stops work. */}
			<NeedsAttention pending={pending} isLoading={isLoading} />

			<div className="grid gap-4 lg:grid-cols-3">
				<ReceivablesSummary receivables={receivables} isLoading={isLoading} />
				<div className="lg:col-span-2">
					<TodayAttendance />
				</div>
			</div>

			<div className="grid gap-4 lg:grid-cols-3">
				<OverdueEvents />
				<WeeklyClients />
				<WeeklyWorks />
			</div>
		</div>
	);
}
