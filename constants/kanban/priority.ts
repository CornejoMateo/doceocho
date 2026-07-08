export const PRIORITY_OPTIONS = [
	{ value: 'none', label: 'Sin prioridad' },
	{ value: 'low', label: 'Baja' },
	{ value: 'medium', label: 'Media' },
	{ value: 'high', label: 'Alta' },
	{ value: 'very_high', label: 'Muy alta' },
] as const;

export type Priority = (typeof PRIORITY_OPTIONS)[number]['value'];
