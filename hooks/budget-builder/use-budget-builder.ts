import { useCallback, useEffect, useRef, useState } from 'react';
import type { Budget, BudgetBuilderSettings } from '@/lib/budget-builder/types';
import {
	createBudget,
	deleteBudget,
	listBudgets,
	loadSettings,
	saveSettings,
	updateBudget as saveBudget,
} from '@/lib/budget-builder/budget-builder';
import { clearLocalData, readLocalData } from '@/lib/budget-builder/local-storage';
import { newId } from '@/helpers/budget-builder/calculate';
import { DEFAULT_SETTINGS } from '@/constants/budget-builder/budget-builder';
import { translateError } from '@/lib/error-translator';

/** Waits for a pause in typing, so a price is one write instead of one per key. */
const SAVE_DELAY_MS = 700;

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const EMPTY_SETTINGS: BudgetBuilderSettings = { ...DEFAULT_SETTINGS, catalog: [], templates: [] };

/** Settings and budgets from Supabase, saved on every change: there is no "Guardar" button to forget. */
export function useBudgetBuilder() {
	const [settings, setSettings] = useState<BudgetBuilderSettings>(EMPTY_SETTINGS);
	const [budgets, setBudgets] = useState<Budget[]>([]);
	const [loaded, setLoaded] = useState(false);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [saveState, setSaveState] = useState<SaveState>('idle');
	const [localBudgetsCount, setLocalBudgetsCount] = useState(0);

	// Last version known to be in the database, and the pending writes.
	const savedSettings = useRef<BudgetBuilderSettings>(EMPTY_SETTINGS);
	const latestSettings = useRef<BudgetBuilderSettings>(EMPTY_SETTINGS);
	const settingsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const pendingBudgets = useRef(
		new Map<string, { budget: Budget; timer: ReturnType<typeof setTimeout> }>()
	);
	const savedBudgets = useRef(new Map<string, Budget>());

	const reportSave = useCallback((error: any) => {
		if (error) console.error('[budget-builder] Save failed:', error);
		setSaveState(error ? 'error' : 'saved');
	}, []);

	useEffect(() => {
		Promise.all([loadSettings(), listBudgets()]).then(([settingsResult, budgetsResult]) => {
			const error = settingsResult.error ?? budgetsResult.error;
			if (error) {
				setLoadError(translateError(error) || 'No se pudo cargar el presupuestador.');
			} else if (settingsResult.data) {
				savedSettings.current = settingsResult.data;
				latestSettings.current = settingsResult.data;
				setSettings(settingsResult.data);
				setBudgets(budgetsResult.data);
				budgetsResult.data.forEach((budget) => savedBudgets.current.set(budget.id, budget));
			}
			setLocalBudgetsCount(readLocalData().budgets.length);
			setLoaded(true);
		});
	}, []);

	const flushSettings = useCallback(async () => {
		settingsTimer.current = null;
		const next = latestSettings.current;
		setSaveState('saving');
		const { error } = await saveSettings(savedSettings.current, next);
		if (!error) savedSettings.current = next;
		reportSave(error);
	}, [reportSave]);

	const flushBudget = useCallback(
		async (id: string) => {
			const pending = pendingBudgets.current.get(id);
			if (!pending) return;
			pendingBudgets.current.delete(id);
			setSaveState('saving');
			const saved = savedBudgets.current.get(id);
			const { error } = await saveBudget(pending.budget, {
				includeStatus: !saved || saved.status !== pending.budget.status,
			});
			if (!error) savedBudgets.current.set(id, pending.budget);
			reportSave(error);
		},
		[reportSave]
	);

	// Whatever is still waiting goes out when leaving the module, and the browser warns before closing.
	useEffect(() => {
		const pendingWrites = pendingBudgets.current;
		const warn = (event: BeforeUnloadEvent) => {
			if (settingsTimer.current || pendingWrites.size > 0) event.preventDefault();
		};
		window.addEventListener('beforeunload', warn);

		return () => {
			window.removeEventListener('beforeunload', warn);
			if (settingsTimer.current) {
				clearTimeout(settingsTimer.current);
				flushSettings();
			}
			for (const [id, { timer }] of pendingWrites) {
				clearTimeout(timer);
				flushBudget(id);
			}
		};
	}, [flushSettings, flushBudget]);

	const updateSettings = useCallback(
		(next: BudgetBuilderSettings) => {
			setSettings(next);
			latestSettings.current = next;
			setSaveState('saving');
			if (settingsTimer.current) clearTimeout(settingsTimer.current);
			settingsTimer.current = setTimeout(flushSettings, SAVE_DELAY_MS);
		},
		[flushSettings]
	);

	const updateBudget = useCallback(
		(budget: Budget) => {
			setBudgets((previous) =>
				previous.map((current) => (current.id === budget.id ? budget : current))
			);
			setSaveState('saving');
			const pending = pendingBudgets.current.get(budget.id);
			if (pending) clearTimeout(pending.timer);
			pendingBudgets.current.set(budget.id, {
				budget,
				timer: setTimeout(() => flushBudget(budget.id), SAVE_DELAY_MS),
			});
		},
		[flushBudget]
	);

	const insertBudget = useCallback(
		async (fields: Partial<Budget>): Promise<Budget | null> => {
			setSaveState('saving');
			const { data, error } = await createBudget(fields);
			reportSave(error);
			if (data) {
				savedBudgets.current.set(data.id, data);
				setBudgets((previous) => [data, ...previous]);
			}
			return data;
		},
		[reportSave]
	);

	const addBudget = useCallback(
		() =>
			insertBudget({
				marginPercent: settings.defaultMarginPercent,
				validityDays: settings.defaultValidityDays,
			}),
		[insertBudget, settings]
	);

	const duplicateBudget = useCallback(
		(source: Budget) =>
			insertBudget({
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
			}),
		[insertBudget]
	);

	const removeBudget = useCallback(
		async (id: string) => {
			const pending = pendingBudgets.current.get(id);
			if (pending) clearTimeout(pending.timer);
			pendingBudgets.current.delete(id);
			setBudgets((previous) => previous.filter((budget) => budget.id !== id));
			setSaveState('saving');
			reportSave((await deleteBudget(id)).error);
		},
		[reportSave]
	);

	/** Fills an empty catalog with the sample supplies and furniture types. */
	const loadExamples = useCallback(
		() =>
			updateSettings({
				...latestSettings.current,
				catalog: DEFAULT_SETTINGS.catalog,
				templates: DEFAULT_SETTINGS.templates,
			}),
		[updateSettings]
	);

	/** Brings in what the MVP saved in this browser, then forgets it there. */
	const importLocalData = useCallback(async () => {
		const local = readLocalData();
		const current = latestSettings.current;

		if (current.catalog.length === 0 && current.templates.length === 0 && local.settings) {
			updateSettings({
				...current,
				...local.settings,
				company: { ...current.company, ...local.settings.company },
			});
		}

		// Oldest first, so the new numbers keep the original order.
		for (const budget of [...local.budgets].reverse()) {
			await insertBudget({ ...budget, status: budget.status ?? 'borrador' });
		}

		clearLocalData();
		setLocalBudgetsCount(0);
	}, [insertBudget, updateSettings]);

	return {
		loaded,
		loadError,
		saveState,
		settings,
		budgets,
		localBudgetsCount,
		updateSettings,
		addBudget,
		updateBudget,
		removeBudget,
		duplicateBudget,
		loadExamples,
		importLocalData,
	};
}
