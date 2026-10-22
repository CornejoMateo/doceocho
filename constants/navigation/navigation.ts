import {
	AlertCircle,
	BarChart3,
	Calendar,
	ClipboardCheck,
	DollarSign,
	FileText,
	IdCardLanyard,
	LayoutDashboard,
	LayoutList,
	MessageSquare,
	Package,
	Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { UserRole } from '@/constants/users/user-role';

export type NavigationItem = {
	/** Matches the module key in VIEW_CATALOG. */
	key: string;
	name: string;
	href: string;
	icon: LucideIcon;
	disabled: boolean;
};

/**
 * Every module the app ships. Visibility is decided by the user's views (see VIEW_CATALOG);
 * a module missing from the catalog stays shipped but unreachable, which is how it gets switched off.
 */
export const NAVIGATION_ITEMS: NavigationItem[] = [
	{ key: 'panel', name: 'Panel', href: '/', icon: LayoutDashboard, disabled: false },
	{ key: 'supplies', name: 'Insumos', href: '/supplies', icon: Package, disabled: false },
	{ key: 'clients', name: 'Clientes', href: '/clients', icon: Users, disabled: false },
	{ key: 'works', name: 'Obras', href: '/works', icon: ClipboardCheck, disabled: false },
	{ key: 'kanban', name: 'Kanban', href: '/kanban', icon: LayoutList, disabled: false },
	{ key: 'calendar', name: 'Calendario', href: '/calendar', icon: Calendar, disabled: false },
	{ key: 'claims', name: 'Ajustes y Diario', href: '/claims', icon: AlertCircle, disabled: false },
	{
		key: 'budgets',
		name: 'Reportes de Presupuestos',
		href: '/budgets',
		icon: FileText,
		disabled: false,
	},
	{ key: 'reports', name: 'Reportes', href: '/reports', icon: BarChart3, disabled: false },
	{
		key: 'cash-flow',
		name: 'Flujo de Fondos',
		href: '/cash-flow',
		icon: DollarSign,
		disabled: false,
	},
	{ key: 'chat', name: 'Chat', href: '/chat', icon: MessageSquare, disabled: false },
	{ key: 'employees', name: 'Empleados', href: '/employees', icon: IdCardLanyard, disabled: false },
];

export const HOME_ROUTE_BY_ROLE: Record<UserRole, string> = {
	Admin: '/',
	Superadmin: '/',
	Taller: '/supplies',
	QR: '/employees',
};

export function getNavigationForViews(views: string[]): NavigationItem[] {
	return NAVIGATION_ITEMS.filter((item) => views.includes(item.key));
}

export function isRouteAllowedForViews(href: string, views: string[]): boolean {
	const item = NAVIGATION_ITEMS.filter(
		(candidate) => candidate.href === href || href.startsWith(`${candidate.href}/`)
	).sort((a, b) => b.href.length - a.href.length)[0];

	return Boolean(item && views.includes(item.key));
}

/** The role's usual home, or the first module the user can open when a customization hides it. */
export function getHomeRoute(role: UserRole | undefined, views: string[]): string | null {
	const roleHome = role ? HOME_ROUTE_BY_ROLE[role] : undefined;

	if (roleHome && isRouteAllowedForViews(roleHome, views)) return roleHome;

	return getNavigationForViews(views)[0]?.href ?? null;
}
