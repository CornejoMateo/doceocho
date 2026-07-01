import { FolderBudget } from '@/lib/budgets/folder_budgets';
import { BudgetWithWork } from '@/lib/balances/balances';

export function normalizeType(type: string | null | undefined): string {
	const t = (type ?? '').trim();
	if (!t) return 'Otros';
	return t;
}

export function workLabel(folder: FolderBudget): string {
	const w = folder.works;
	if (!w) return 'Sin obra';
	const parts = [w.address, w.locality].filter(Boolean);
	return parts.length > 0 ? parts.join(' - ') : 'Obra';
}

export function formatCurrency(amount: number | null | undefined, currency: string): string {
	if (typeof amount !== 'number') return `Monto ${currency} no cargado`;
	return `$${amount.toLocaleString('es-AR')} ${currency}`;
}

export function groupBudgetsByType(budgets: BudgetWithWork[]): Map<string, BudgetWithWork[]> {
	const budgetsByType = new Map<string, BudgetWithWork[]>();

	for (const budget of budgets) {
		const typeKey = normalizeType(budget.type);
		const prev = budgetsByType.get(typeKey) ?? [];
		prev.push(budget);
		budgetsByType.set(typeKey, prev);
	}

	return budgetsByType;
}

export function getOrderedTypeKeys(budgetsByType: Map<string, BudgetWithWork[]>): string[] {
	return Array.from(budgetsByType.keys()).sort((a, b) => a.localeCompare(b));
}

export function parseAmount(amount: string): number | null {
	const trimmed = amount.trim();
	if (!trimmed) return null;
	const parsed = Number(trimmed);
	return !Number.isNaN(parsed) ? parsed : null;
}
