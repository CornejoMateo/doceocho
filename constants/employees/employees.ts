import type { UserRole } from '@/constants/users/user-role';

export type EmployeesTabValue =
	'fichar' | 'fichajes' | 'modulos' | 'fichas' | 'evaluaciones' | 'vacaciones';

export const TABS: { value: EmployeesTabValue; label: string; roles: UserRole[] }[] = [
	{ value: 'fichar', label: 'Fichar', roles: ['Admin', 'Superadmin', 'Taller', 'QR'] },
	{ value: 'fichajes', label: 'Historial de fichajes', roles: ['Admin', 'Superadmin', 'Taller'] },
	{ value: 'modulos', label: 'Módulos', roles: ['Admin', 'Superadmin', 'Taller'] },
	{ value: 'fichas', label: 'Fichas', roles: ['Admin', 'Superadmin'] },
	{ value: 'evaluaciones', label: 'Evaluaciones', roles: ['Admin', 'Superadmin'] },
	{ value: 'vacaciones', label: 'Vacaciones', roles: ['Admin', 'Superadmin', 'Taller'] },
];
