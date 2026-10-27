import { useCallback } from 'react';
import { useAuth } from '@/components/provider/auth-provider';
import { canView, resolveViews } from '@/helpers/permissions/views';

/** `canView('clients.budgets')` tells whether the logged-in user can see that module or tab. */
export function useCanView() {
	const { user } = useAuth();
	// The session always resolves views; a user without them falls back to their role's.
	const views = user?.views ?? (user?.role ? resolveViews(user.role, null) : undefined);

	return useCallback((key: string) => canView(views ?? [], key), [views]);
}
