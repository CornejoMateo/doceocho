import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, AlertTriangle, CheckCircle, MoreHorizontal } from 'lucide-react';
import type { CardWithRelations } from './types';
import { formatCreatedAt } from '@/utils/format-date';

interface KanbanCardProps {
	card: CardWithRelations;
	onClick: () => void;
	dueDateToleranceYellow?: number; // Days before due date to show yellow warning
	dueDateToleranceRed?: number; // Days before due date to show red warning
}

const PRIORITY_COLORS = {
	none: 'bg-gray-100 text-gray-600',
	low: 'bg-blue-100 text-blue-600',
	medium: 'bg-yellow-100 text-yellow-600',
	high: 'bg-orange-100 text-orange-600',
	very_high: 'bg-red-100 text-red-600',
};

const PRIORITY_LABELS = {
	none: 'Sin prioridad',
	low: 'Baja',
	medium: 'Media',
	high: 'Alta',
	very_high: 'Muy alta',
};

export function KanbanCard({
	card,
	onClick,
	dueDateToleranceYellow = 2,
	dueDateToleranceRed = 0,
}: KanbanCardProps) {
	const yellowToleranceMs = dueDateToleranceYellow * 24 * 60 * 60 * 1000;
	const redToleranceMs = dueDateToleranceRed * 24 * 60 * 60 * 1000;
	const isOverdue = card.due_date && new Date(card.due_date) < new Date() && !card.completed_at;
	const isRedAlert =
		card.due_date && !isOverdue && new Date(card.due_date) < new Date(Date.now() + redToleranceMs);
	const isYellowAlert =
		card.due_date &&
		!isOverdue &&
		!isRedAlert &&
		new Date(card.due_date) < new Date(Date.now() + yellowToleranceMs);
	const isCompleted = !!card.completed_at;

	const dueDateIcon = isOverdue ? (
		<AlertTriangle className="h-4 w-4 text-red-500" />
	) : isRedAlert ? (
		<AlertTriangle className="h-4 w-4 text-red-500" />
	) : isYellowAlert ? (
		<AlertTriangle className="h-4 w-4 text-yellow-500" />
	) : isCompleted ? (
		<CheckCircle className="h-4 w-4 text-green-500" />
	) : (
		<Clock className="h-4 w-4 text-muted-foreground" />
	);

	return (
		<Card
			className="p-3 cursor-pointer hover:shadow-md transition-shadow group"
			onClick={onClick}
			style={{
				backgroundColor: card.color || undefined,
			}}
		>
			<h4 className="font-medium text-sm mb-2 line-clamp-2">{card.title}</h4>

			{card.description && (
				<p className="text-xs text-muted-foreground mb-2 line-clamp-2">{card.description}</p>
			)}

			<div className="flex items-center justify-between mt-2">
				<div className="flex items-center gap-2">
					{card.due_date && (
						<div className="flex items-center gap-1 text-xs">
							{dueDateIcon}
							<span
								className={
									isOverdue || isRedAlert
										? 'text-red-500'
										: isYellowAlert
											? 'text-yellow-500'
											: isCompleted
												? 'text-green-500'
												: 'text-muted-foreground'
								}
							>
								{formatCreatedAt(card.due_date)}
							</span>
						</div>
					)}

					{card.priority !== 'none' && (
						<Badge variant="secondary" className={`text-xs ${PRIORITY_COLORS[card.priority]}`}>
							{PRIORITY_LABELS[card.priority]}
						</Badge>
					)}
				</div>

				<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
					<Button variant="ghost" size="icon" className="h-6 w-6">
						<MoreHorizontal className="h-4 w-4" />
					</Button>
				</div>
			</div>
		</Card>
	);
}
