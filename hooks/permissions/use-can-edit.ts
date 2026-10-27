import { useCallback } from 'react';
import { useAuth } from '@/components/provider/auth-provider';
import { canEdit } from '@/helpers/permissions/edits';

/** `canEdit('clients.budgets')` tells whether the logged-in user can create, change and delete there. */
export function useCanEdit() {
	const { user } = useAuth();
	const views = user?.views;
	const edits = user?.edits;

	return useCallback((key: string) => canEdit(views ?? [], edits ?? [], key), [views, edits]);
}
