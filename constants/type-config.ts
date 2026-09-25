import { Clock, CheckCircle, AlertCircle, PauseCircle } from 'lucide-react';

export const statusOptions = [
	{ value: 'pending', label: 'Pendiente', icon: Clock, color: 'text-gray-400' },
	{ value: 'in_progress', label: 'En progreso', icon: AlertCircle, color: 'text-yellow-500' },
	{ value: 'completed', label: 'Finalizada', icon: CheckCircle, color: 'text-green-500' },
	{ value: 'paused', label: 'En pausa', icon: PauseCircle, color: 'text-orange-500' },
];

export const statusConfig = [
	{ value: 'pending', label: 'Pendiente', icon: Clock, color: 'text-chart-3 bg-chart-3/10' },
	{
		value: 'in_progress',
		label: 'En progreso',
		icon: AlertCircle,
		color: 'text-chart-1 bg-chart-1/10',
	},
	{ value: 'completed', label: 'Finalizada', icon: CheckCircle, color: 'text-accent bg-accent/10' },
	{
		value: 'paused',
		label: 'En pausa',
		icon: PauseCircle,
		color: 'text-orange-500 bg-orange-500/10',
	},
];

export type StatusFilter = 'all' | 'pending' | 'in_progress' | 'completed' | 'paused';
