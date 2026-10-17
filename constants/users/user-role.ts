export type UserRole = 'Taller' | 'Admin' | 'Superadmin' | 'QR';

export const roles: UserRole[] = ['Taller', 'Admin', 'Superadmin', 'QR']; // Used for selects

// Superadmin can do everything Admin can; use this for every "is this user an admin" check.
export function isAdminRole(role: UserRole | string | undefined | null): boolean {
	return role === 'Admin' || role === 'Superadmin';
}

// Only Superadmin can create/edit/delete attendances and settlements
export function isSuperadmin(role: UserRole | string | undefined | null): boolean {
	return role === 'Superadmin';
}

// Roles a caller may see in a role Select. Non-Superadmin callers can't assign Superadmin,
// but if the target already has it, it's included (disabled by the caller) so the value still displays.
export function getSelectableRoles(
	callerRole: UserRole | string | undefined | null,
	targetRole?: UserRole | string | null
): UserRole[] {
	if (isSuperadmin(callerRole)) return roles;
	const assignable = roles.filter((r) => r !== 'Superadmin');
	return targetRole === 'Superadmin' ? [...assignable, 'Superadmin'] : assignable;
}

// True when a non-Superadmin caller must not be allowed to change this target's role at all.
export function isRoleSelectLocked(
	callerRole: UserRole | string | undefined | null,
	targetRole?: UserRole | string | null
): boolean {
	return isSuperadmin(targetRole) && !isSuperadmin(callerRole);
}
