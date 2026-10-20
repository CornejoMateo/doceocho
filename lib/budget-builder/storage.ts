import type { Budget, BudgetBuilderSettings } from '@/lib/budget-builder/types';
import { DEFAULT_SETTINGS, STORAGE_KEYS } from '@/constants/budget-builder/budget-builder';

/**
 * MVP storage: the browser's localStorage, so the module can be tried without any table.
 * Everything goes through these four functions, so moving to Supabase only changes this file.
 */

function read<T>(key: string, fallback: T): T {
	try {
		const raw = window.localStorage.getItem(key);
		return raw ? (JSON.parse(raw) as T) : fallback;
	} catch {
		return fallback;
	}
}

function write(key: string, value: unknown) {
	try {
		window.localStorage.setItem(key, JSON.stringify(value));
	} catch (error) {
		console.error('[budget-builder] Could not save to localStorage:', error);
	}
}

export function loadSettings(): BudgetBuilderSettings {
	const stored = read<Partial<BudgetBuilderSettings>>(STORAGE_KEYS.settings, {});
	// Merged with the defaults so a field added later never comes back undefined.
	return {
		...DEFAULT_SETTINGS,
		...stored,
		company: { ...DEFAULT_SETTINGS.company, ...stored.company },
	};
}

export function saveSettings(settings: BudgetBuilderSettings) {
	write(STORAGE_KEYS.settings, settings);
}

export function loadBudgets(): Budget[] {
	return read<Budget[]>(STORAGE_KEYS.budgets, []);
}

export function saveBudgets(budgets: Budget[]) {
	write(STORAGE_KEYS.budgets, budgets);
}
