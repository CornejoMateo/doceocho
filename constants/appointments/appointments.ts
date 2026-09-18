export type AppointmentStatus = 'Pendiente' | 'Aceptada' | 'Rechazada' | 'Cancelada';

export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
	'Pendiente',
	'Aceptada',
	'Rechazada',
	'Cancelada',
];

/** A slot is only free if no live appointment holds it. */
export const ACTIVE_APPOINTMENT_STATUSES: AppointmentStatus[] = ['Pendiente', 'Aceptada'];

export const APPOINTMENT_STATUS_VARIANTS: Record<
	AppointmentStatus,
	'default' | 'secondary' | 'destructive' | 'outline'
> = {
	Pendiente: 'outline',
	Aceptada: 'default',
	Rechazada: 'destructive',
	Cancelada: 'secondary',
};

/** Indexed by JavaScript's getDay(): 0 = domingo. */
export const WEEKDAYS = [
	{ value: 0, label: 'Domingo' },
	{ value: 1, label: 'Lunes' },
	{ value: 2, label: 'Martes' },
	{ value: 3, label: 'Miércoles' },
	{ value: 4, label: 'Jueves' },
	{ value: 5, label: 'Viernes' },
	{ value: 6, label: 'Sábado' },
];

export const SLOT_DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

export const APPOINTMENTS_PER_PAGE = 8;

/** Public page where clients pick a slot. */
export const PUBLIC_BOOKING_PATH = '/citas';
