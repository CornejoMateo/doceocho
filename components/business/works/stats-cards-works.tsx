import { AlertCircle, CheckCircle2, Clock, List, PauseCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { StatusFilter } from '@/constants/type-config';

interface StatsCardsWorksProps {
	stats: {
		totalCount: number;
		pendingCount: number;
		inProgressCount: number;
		completedCount: number;
		pausedCount: number;
	};
	statusFilter: StatusFilter | null;
	onStatusFilterChange: (filter: StatusFilter) => void;
}

export function StatsCardsWorks({
	stats,
	statusFilter,
	onStatusFilterChange,
}: StatsCardsWorksProps) {
	const cards = [
		{
			filter: 'all' as StatusFilter,
			label: 'Todas',
			count: stats.totalCount,
			icon: List,
			ring: 'ring-primary',
			iconColor: 'text-foreground/80',
		},
		{
			filter: 'pending' as StatusFilter,
			label: 'Pendientes',
			count: stats.pendingCount,
			icon: Clock,
			ring: 'ring-chart-3',
			iconColor: 'text-chart-3',
		},
		{
			filter: 'in_progress' as StatusFilter,
			label: 'En progreso',
			count: stats.inProgressCount,
			icon: AlertCircle,
			ring: 'ring-chart-1',
			iconColor: 'text-chart-1',
		},
		{
			filter: 'completed' as StatusFilter,
			label: 'Finalizadas',
			count: stats.completedCount,
			icon: CheckCircle2,
			ring: 'ring-accent',
			iconColor: 'text-accent',
		},
		{
			filter: 'paused' as StatusFilter,
			label: 'En pausa',
			count: stats.pausedCount,
			icon: PauseCircle,
			ring: 'ring-orange-500',
			iconColor: 'text-orange-500',
		},
	];

	return (
		<div className="space-y-4">
			<div className="grid gap-4 md:grid-cols-5">
				{cards.map(({ filter, label, count, icon: Icon, ring, iconColor }) => (
					<Card
						key={filter}
						className={cn(
							'p-6 bg-card border-border cursor-pointer transition-all hover:shadow-md',
							statusFilter === filter ? `ring-2 ${ring}` : ''
						)}
						onClick={() => onStatusFilterChange(filter)}
					>
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground">{label}</p>
								<p className="text-2xl font-bold text-foreground mt-2">{count}</p>
							</div>
							<div className={cn('rounded-lg bg-secondary p-3', iconColor)}>
								<Icon className="h-6 w-6" />
							</div>
						</div>
					</Card>
				))}
			</div>
		</div>
	);
}
