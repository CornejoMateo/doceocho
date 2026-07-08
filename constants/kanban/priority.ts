export const PRIORITY_OPTIONS = [
	{ value: 'none', label: 'Sin prioridad' },
	{ value: 'low', label: 'Baja' },
	{ value: 'medium', label: 'Media' },
	{ value: 'high', label: 'Alta' },
	{ value: 'very_high', label: 'Muy alta' },
] as const;

export type Priority = (typeof PRIORITY_OPTIONS)[number]['value'];

export const PRIORITY_COLORS = {
	none: 'bg-gray-100 text-gray-600',
	low: 'bg-blue-100 text-blue-600',
	medium: 'bg-yellow-100 text-yellow-600',
	high: 'bg-orange-100 text-orange-600',
	very_high: 'bg-red-100 text-red-600',
} as const;

export type PriorityColor = (typeof PRIORITY_COLORS)[Priority];
