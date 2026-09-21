import {
	AlertCircle,
	BarChart3,
	Briefcase,
	Calendar,
	ClipboardCheck,
	Clock,
	DollarSign,
	FileText,
	LayoutDashboard,
	LayoutList,
	MessageSquare,
	Package,
	Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { UserRole } from '@/constants/users/user-role';

export type NavigationItem = {
	name: string;
	href: string;
	icon: LucideIcon;
	disabled: boolean;
};

/** Every module the app ships. Visibility is decided by ALLOWED_MODULES_BY_ROLE. */
export const NAVIGATION_ITEMS: NavigationItem[] = [
	{ name: 'Panel', href: '/', icon: LayoutDashboard, disabled: false },
	{ name: 'Insumos', href: '/supplies', icon: Package, disabled: false },
	{ name: 'Clientes', href: '/clients', icon: Users, disabled: false },
	{ name: 'Obras', href: '/works', icon: ClipboardCheck, disabled: false },
	{ name: 'Kanban', href: '/kanban', icon: LayoutList, disabled: false },
	{ name: 'Calendario', href: '/calendar', icon: Calendar, disabled: false },
	{ name: 'Ajustes y Diario', href: '/claims', icon: AlertCircle, disabled: false },
	{ name: 'Reportes de Presupuestos', href: '/budgets', icon: FileText, disabled: false },
	{ name: 'Reportes', href: '/reports', icon: BarChart3, disabled: false },
	{ name: 'Flujo de Fondos', href: '/cash-flow', icon: DollarSign, disabled: false },
	{ name: 'Chat', href: '/chat', icon: MessageSquare, disabled: false },
	{ name: 'Fichar', href: '/clock-in', icon: Clock, disabled: false },
	{ name: 'Recursos Humanos', href: '/human-resources', icon: Briefcase, disabled: false },
];

/**
 * Modules each role can reach. A module missing from every list stays shipped
 * but unreachable, which is how a module gets switched off.
 */
export const ALLOWED_MODULES_BY_ROLE: Record<UserRole, string[]> = {
	Admin: [
		'Panel',
		'Insumos',
		'Clientes',
		'Kanban',
		'Calendario',
		'Flujo de Fondos',
		'Obras',
		'Chat',
		'Reportes',
		'Fichar',
		'Recursos Humanos',
	],
	Taller: [
		'Insumos',
		'Clientes',
		'Kanban',
		'Calendario',
		'Chat',
		'Obras',
		'Fichar',
		'Recursos Humanos',
	],
	QR: ['Fichar'],
};

export const HOME_ROUTE_BY_ROLE: Record<UserRole, string> = {
	Admin: '/',
	Taller: '/supplies',
	QR: '/clock-in',
};

export function getNavigationForRole(role: UserRole | undefined): NavigationItem[] {
	if (!role) return [];

	const allowed = ALLOWED_MODULES_BY_ROLE[role] ?? [];

	return NAVIGATION_ITEMS.filter((item) => allowed.includes(item.name));
}

export function isRouteAllowedForRole(href: string, role: UserRole | undefined): boolean {
	if (!role) return false;

	const allowed = ALLOWED_MODULES_BY_ROLE[role] ?? [];
	const item = NAVIGATION_ITEMS.find((candidate) => candidate.href === href);

	return Boolean(item && allowed.includes(item.name));
}
