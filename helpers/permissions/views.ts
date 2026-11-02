import { VIEW_CATALOG } from '@/constants/permissions/views';
import { isSuperadmin, type UserRole } from '@/constants/users/user-role';

export const ALL_VIEW_KEYS: string[] = VIEW_CATALOG.flatMap((module) => [
	module.key,
	...module.tabs.map((tab) => tab.key),
]);

/** What a role sees when the user has no customization. */
export function getDefaultViews(role: UserRole | string | undefined | null): string[] {
	if (!role) return [];
	if (isSuperadmin(role)) return ALL_VIEW_KEYS;

	return VIEW_CATALOG.flatMap((module) => {
		if (!module.roles.includes(role as UserRole)) return [];

		return [
			module.key,
			...module.tabs.filter((tab) => tab.roles.includes(role as UserRole)).map((tab) => tab.key),
		];
	});
}

/**
 * The views a user ends up with. Superadmin always sees everything, so nobody can lock them out;
 * everyone else uses their customization, or their role's defaults when they have none.
 */
export function resolveViews(
	role: UserRole | string | undefined | null,
	customViews: string[] | null | undefined
): string[] {
	if (isSuperadmin(role)) return ALL_VIEW_KEYS;
	if (Array.isArray(customViews)) return customViews;

	return getDefaultViews(role);
}

/** A tab is only visible when its module is too: `clients.budgets` needs `clients`. */
export function canView(views: string[], key: string): boolean {
	const moduleKey = key.split('.')[0];

	return views.includes(key) && views.includes(moduleKey);
}

/** Keeps only known keys, without repeats. Anything that is not a list means "no customization". */
export function sanitizeViews(input: unknown): string[] | null {
	if (!Array.isArray(input)) return null;

	return ALL_VIEW_KEYS.filter((key) => input.includes(key));
}

/** A customization must leave at least one module, otherwise the user has nowhere to land. */
export function hasAnyModule(views: string[]): boolean {
	return VIEW_CATALOG.some((module) => views.includes(module.key));
}

/**
 * Turns what the client sent into what gets stored: `undefined` leaves it untouched,
 * `null` goes back to the role defaults, a list is cleaned to known keys.
 * Superadmin always sees everything, so nothing is stored for them.
 */
export function parseViewsInput(
	input: unknown,
	role: UserRole | string | undefined | null
): { views?: string[] | null; error?: string } {
	if (input === undefined) return {};
	if (input === null || isSuperadmin(role)) return { views: null };

	const views = sanitizeViews(input);

	if (!views) return { error: 'Las vistas tienen un formato inválido' };
	if (!hasAnyModule(views)) return { error: 'Elegí al menos un módulo para el usuario' };

	return { views };
}
