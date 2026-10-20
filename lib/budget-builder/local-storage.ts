import type { Budget, BudgetBuilderSettings } from '@/lib/budget-builder/types';
import { STORAGE_KEYS } from '@/constants/budget-builder/budget-builder';

/**
 * What the MVP left in this browser's localStorage, before budgets moved to Supabase.
 * Only read to offer a one-time import, then cleared.
 */

function read<T>(key: string): T | null {
	try {
		const raw = window.localStorage.getItem(key);
		return raw ? (JSON.parse(raw) as T) : null;
	} catch {
		return null;
	}
}

export function readLocalData(): {
	settings: Partial<BudgetBuilderSettings> | null;
	budgets: Budget[];
} {
	const budgets = read<Budget[]>(STORAGE_KEYS.budgets);
	return {
		settings: read<Partial<BudgetBuilderSettings>>(STORAGE_KEYS.settings),
		budgets: Array.isArray(budgets) ? budgets : [],
	};
}

export function clearLocalData() {
	try {
		window.localStorage.removeItem(STORAGE_KEYS.budgets);
		window.localStorage.removeItem(STORAGE_KEYS.settings);
	} catch {
		// Nothing to clear when storage is blocked.
	}
}
