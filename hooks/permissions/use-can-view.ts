import { useCallback } from 'react';
import { useAuth } from '@/components/provider/auth-provider';
import { canView } from '@/helpers/permissions/views';

/** `canView('clients.budgets')` tells whether the logged-in user can see that module or tab. */
export function useCanView() {
	const { user } = useAuth();
	const views = user?.views;

	return useCallback((key: string) => canView(views ?? [], key), [views]);
}
