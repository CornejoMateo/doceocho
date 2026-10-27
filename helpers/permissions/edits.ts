import { isAdminRole, isSuperadmin, type UserRole } from '@/constants/users/user-role';
import {
	ALL_VIEW_KEYS,
	canView,
	getDefaultViews,
	sanitizeViews,
} from '@/helpers/permissions/views';

/**
 * Edit permissions use the same keys as views: being able to edit `clients.budgets` means
 * creating, changing and deleting budgets from that tab. Editing always needs the view too.
 */

/** Before any customization admins edit everything they see and other roles none of it, as today. */
export function getDefaultEdits(role: UserRole | string | undefined | null): string[] {
	return isAdminRole(role) ? getDefaultViews(role) : [];
}

/** Superadmin always edits everything; everyone else uses their customization or their role's defaults. */
export function resolveEdits(
	role: UserRole | string | undefined | null,
	customEdits: string[] | null | undefined
): string[] {
	if (isSuperadmin(role)) return ALL_VIEW_KEYS;
	if (Array.isArray(customEdits)) return customEdits;

	return getDefaultEdits(role);
}

export function canEdit(views: string[], edits: string[], key: string): boolean {
	return canView(views, key) && edits.includes(key);
}

/**
 * Same rules as views: `undefined` leaves it untouched, `null` goes back to the role defaults,
 * a list is cleaned to known keys. Nothing is stored for a Superadmin.
 */
export function parseEditsInput(
	input: unknown,
	role: UserRole | string | undefined | null
): { edits?: string[] | null; error?: string } {
	if (input === undefined) return {};
	if (input === null || isSuperadmin(role)) return { edits: null };

	const edits = sanitizeViews(input);
	if (!edits) return { error: 'Los permisos de edición tienen un formato inválido' };

	return { edits };
}
