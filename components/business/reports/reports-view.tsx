'use client';

import { BudgetsReport } from '@/components/business/reports/budgets/budgets-report';

export function ReportsView() {
	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div>
					<h2 className="text-2xl font-bold text-foreground text-balance">Reportes y métricas</h2>
					<p className="text-muted-foreground mt-1">Análisis de rendimiento y estadísticas</p>
				</div>
			</div>

			{/* Content */}
			<BudgetsReport />
		</div>
	);
}
