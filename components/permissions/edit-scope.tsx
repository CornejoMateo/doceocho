'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useCanEdit } from '@/hooks/permissions/use-can-edit';

const EditScopeContext = createContext<string | null>(null);

/**
 * Says which permission governs the actions inside, e.g. the works list inside a client's
 * "Obras" tab answers to `clients.works`, while the same list in the Obras module answers to `works`.
 */
export function EditScope({ edit, children }: { edit: string; children: ReactNode }) {
	return <EditScopeContext.Provider value={edit}>{children}</EditScopeContext.Provider>;
}

/** Whether the user can create, change and delete here: the nearest scope wins, else `fallbackKey`. */
export function useScopedCanEdit(fallbackKey: string): boolean {
	const scoped = useContext(EditScopeContext);
	const canEdit = useCanEdit();

	return canEdit(scoped ?? fallbackKey);
}

/**
 * Renders its children only for users who can edit here. The nearest scope decides;
 * `edit` is the permission used when the element is rendered outside any scope.
 */
export function EditOnly({ edit, children }: { edit?: string; children: ReactNode }) {
	const scoped = useContext(EditScopeContext);
	const canEdit = useCanEdit();
	const key = scoped ?? edit;

	return key && canEdit(key) ? <>{children}</> : null;
}
