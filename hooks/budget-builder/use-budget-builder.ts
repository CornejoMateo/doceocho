import { useCallback, useEffect, useState } from 'react';
import type { Budget, BudgetBuilderSettings } from '@/lib/budget-builder/types';
import { loadBudgets, loadSettings, saveBudgets, saveSettings } from '@/lib/budget-builder/storage';
import { createBudget, newId } from '@/helpers/budget-builder/calculate';
import { DEFAULT_SETTINGS } from '@/constants/budget-builder/budget-builder';

/** Settings and budgets, saved on every change: there is no "Guardar" button to forget. */
export function useBudgetBuilder() {
	const [settings, setSettings] = useState<BudgetBuilderSettings>(DEFAULT_SETTINGS);
	const [budgets, setBudgets] = useState<Budget[]>([]);
	const [loaded, setLoaded] = useState(false);

	// localStorage only exists in the browser, so it is read after mounting.
	useEffect(() => {
		setSettings(loadSettings());
		setBudgets(loadBudgets());
		setLoaded(true);
	}, []);

	const updateSettings = useCallback((next: BudgetBuilderSettings) => {
		setSettings(next);
		saveSettings(next);
	}, []);

	const commitBudgets = useCallback((update: (previous: Budget[]) => Budget[]) => {
		setBudgets((previous) => {
			const next = update(previous);
			saveBudgets(next);
			return next;
		});
	}, []);

	const addBudget = useCallback((): Budget => {
		const budget = createBudget(settings, budgets);
		commitBudgets((previous) => [budget, ...previous]);
		return budget;
	}, [settings, budgets, commitBudgets]);

	const updateBudget = useCallback(
		(budget: Budget) =>
			commitBudgets((previous) =>
				previous.map((current) => (current.id === budget.id ? budget : current))
			),
		[commitBudgets]
	);

	const removeBudget = useCallback(
		(id: string) => commitBudgets((previous) => previous.filter((budget) => budget.id !== id)),
		[commitBudgets]
	);

	const duplicateBudget = useCallback(
		(source: Budget): Budget => {
			const copy: Budget = {
				...createBudget(settings, budgets),
				clientName: source.clientName,
				clientContact: source.clientContact,
				marginPercent: source.marginPercent,
				validityDays: source.validityDays,
				notes: source.notes,
				items: source.items.map((item) => ({
					...item,
					id: newId(),
					lines: item.lines.map((line) => ({ ...line, id: newId() })),
				})),
			};
			commitBudgets((previous) => [copy, ...previous]);
			return copy;
		},
		[settings, budgets, commitBudgets]
	);

	return {
		loaded,
		settings,
		budgets,
		updateSettings,
		addBudget,
		updateBudget,
		removeBudget,
		duplicateBudget,
	};
}
