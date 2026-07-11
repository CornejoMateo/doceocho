import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export function getDueDateIcon({
	isOverdue,
	isRedAlert,
	isYellowAlert,
	isCompleted,
}: {
	isOverdue: boolean | string | null;
	isRedAlert: boolean | string | null;
	isYellowAlert: boolean | string | null;
	isCompleted: boolean;
}) {
	return isOverdue ? (
		<AlertTriangle data-testid="icon-overdue" className="h-4 w-4 text-red-500" />
	) : isRedAlert ? (
		<AlertTriangle data-testid="icon-red-alert" className="h-4 w-4 text-red-500" />
	) : isYellowAlert ? (
		<AlertTriangle data-testid="icon-yellow-alert" className="h-4 w-4 text-yellow-500" />
	) : isCompleted ? (
		<CheckCircle data-testid="icon-completed" className="h-4 w-4 text-green-500" />
	) : (
		<Clock data-testid="icon-clock" className="h-4 w-4 text-muted-foreground" />
	);
}
