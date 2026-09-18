export type VacationStatus = 'Pendiente' | 'Aprobada' | 'Rechazada';

export const VACATION_STATUSES: VacationStatus[] = ['Pendiente', 'Aprobada', 'Rechazada'];

export const VACATION_REQUESTS_PER_PAGE = 8;

// Badge variant used for each status.
export const VACATION_STATUS_VARIANTS: Record<
	VacationStatus,
	'default' | 'secondary' | 'destructive' | 'outline'
> = {
	Pendiente: 'outline',
	Aprobada: 'default',
	Rechazada: 'destructive',
};
