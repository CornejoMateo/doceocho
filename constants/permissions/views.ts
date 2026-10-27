import type { UserRole } from '@/constants/users/user-role';
import { TABS as EMPLOYEES_TABS } from '@/constants/employees/employees';
import { CASH_FLOW_TABS } from '@/constants/cashflow/tabs';

const ADMINS: UserRole[] = ['Admin', 'Superadmin'];
const STAFF: UserRole[] = ['Admin', 'Superadmin', 'Taller'];

export type ViewTab = {
	/** `<module>.<tab value>`, the same value the module's Tabs use. */
	key: string;
	label: string;
	/** Roles that get this tab by default, before any customization. */
	roles: UserRole[];
};

export type ViewModule = {
	/** Matches NavigationItem.key. */
	key: string;
	label: string;
	roles: UserRole[];
	tabs: ViewTab[];
};

/**
 * Every view a Superadmin can grant or take away, grouped by module.
 * The roles here are the defaults, so a user without customization sees exactly what their role saw before.
 */
export const VIEW_CATALOG: ViewModule[] = [
	{ key: 'panel', label: 'Panel', roles: ADMINS, tabs: [] },
	{ key: 'supplies', label: 'Insumos', roles: STAFF, tabs: [] },
	{
		key: 'clients',
		label: 'Clientes',
		roles: STAFF,
		tabs: [
			{ key: 'clients.info', label: 'Información', roles: ADMINS },
			{ key: 'clients.works', label: 'Obras', roles: STAFF },
			{ key: 'clients.budgets', label: 'Presupuestos', roles: ADMINS },
			{ key: 'clients.balances', label: 'Cuentas corrientes', roles: ADMINS },
			{ key: 'clients.images', label: 'Archivos', roles: STAFF },
		],
	},
	{
		key: 'works',
		label: 'Obras',
		roles: STAFF,
		tabs: [{ key: 'works.metrics', label: 'Métricas', roles: ADMINS }],
	},
	{ key: 'kanban', label: 'Kanban', roles: STAFF, tabs: [] },
	{
		key: 'calendar',
		label: 'Calendario',
		roles: STAFF,
		tabs: [{ key: 'calendar.appointments', label: 'Citas', roles: ADMINS }],
	},
	{ key: 'reports', label: 'Reportes', roles: ADMINS, tabs: [] },
	{
		key: 'cash-flow',
		label: 'Flujo de Fondos',
		roles: ADMINS,
		tabs: CASH_FLOW_TABS.map((tab) => ({
			key: `cash-flow.${tab.value}`,
			label: tab.label,
			roles: ADMINS,
		})),
	},
	{ key: 'chat', label: 'Chat', roles: STAFF, tabs: [] },
	{
		key: 'employees',
		label: 'Empleados',
		roles: [...STAFF, 'QR'],
		tabs: EMPLOYEES_TABS.map((tab) => ({
			key: `employees.${tab.value}`,
			label: tab.label,
			roles: tab.roles,
		})),
	},
];
