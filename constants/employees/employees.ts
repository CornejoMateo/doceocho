import type { UserRole } from '@/constants/users/user-role';

export type EmployeesTabValue = 'fichajes' | 'modulos' | 'fichas' | 'evaluaciones' | 'vacaciones';

export const TABS: { value: EmployeesTabValue; label: string; roles: UserRole[] }[] = [
	{ value: 'fichajes', label: 'Fichajes', roles: ['Admin', 'Taller', 'QR'] },
	{ value: 'modulos', label: 'Módulos', roles: ['Admin', 'Taller'] },
	{ value: 'fichas', label: 'Fichas', roles: ['Admin'] },
	{ value: 'evaluaciones', label: 'Evaluaciones', roles: ['Admin'] },
	{ value: 'vacaciones', label: 'Vacaciones', roles: ['Admin', 'Taller'] },
];
