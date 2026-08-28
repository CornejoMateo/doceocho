import { WeeklyClients } from '@/components/dashboard/weekly-clients';
import { WeeklyWorks } from '@/components/dashboard/weekly-works';
import { TodayAttendance } from '@/components/dashboard/today-attendance';
import { OverdueEvents } from '@/components/dashboard/overdue-events';

export function DashboardHome() {
	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold text-foreground text-balance">
					Bienvenido al Sistema de Gestión
				</h2>
				<p className="text-muted-foreground mt-1">Resumen de actividades y alertas</p>
			</div>

			<div className="grid gap-4 lg:grid-cols-4">
				<OverdueEvents />
				<WeeklyClients />
				<WeeklyWorks />
				<TodayAttendance />
			</div>
		</div>
	);
}
