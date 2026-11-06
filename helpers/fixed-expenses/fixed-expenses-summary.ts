import { CashFlowCategory } from '@/lib/categories/categories';
import { FixedExpenseWithCategory } from '@/lib/fixed-expenses/fixed-expenses';

export const MONTH_LABELS_ES = [
	'Ene',
	'Feb',
	'Mar',
	'Abr',
	'May',
	'Jun',
	'Jul',
	'Ago',
	'Sep',
	'Oct',
	'Nov',
	'Dic',
] as const;

export type FixedExpenseTotals = {
	net: number;
	iva: number;
	total: number;
	count: number;
	average: number;
};

export type FixedExpenseCategoryRow = {
	categoryId: number;
	categoryName: string;
	net: number;
};

function round2(value: number): number {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}

// Sums the active fixed-expense templates; `total` is the monthly recurring total (con IVA).
export function computeFixedExpenseTotals(
	expenses: FixedExpenseWithCategory[]
): FixedExpenseTotals {
	const net = round2(expenses.reduce((sum, e) => sum + Number(e.net_amount), 0));
	const iva = round2(expenses.reduce((sum, e) => sum + Number(e.iva_amount), 0));
	const total = round2(expenses.reduce((sum, e) => sum + Number(e.amount), 0));
	const count = expenses.length;
	const average = count > 0 ? round2(total / count) : 0;
	return { net, iva, total, count, average };
}

export function groupFixedExpensesByCategory(
	expenses: FixedExpenseWithCategory[],
	categories: CashFlowCategory[]
): FixedExpenseCategoryRow[] {
	const netByCategory = new Map<number, number>();
	const nameByCategory = new Map<number, string>();
	for (const expense of expenses) {
		netByCategory.set(
			expense.category_id,
			(netByCategory.get(expense.category_id) ?? 0) + Number(expense.net_amount)
		);
		if (!nameByCategory.has(expense.category_id)) {
			const category = categories.find((c) => c.id === expense.category_id);
			nameByCategory.set(expense.category_id, category?.name ?? expense.category_name);
		}
	}

	const rows = new Map<number, FixedExpenseCategoryRow>();
	for (const category of categories) {
		// skip inactive categories with no active fixed expenses, so they stay hidden
		if (!category.is_active && !netByCategory.has(category.id)) continue;
		rows.set(category.id, {
			categoryId: category.id,
			categoryName: category.name,
			net: round2(netByCategory.get(category.id) ?? 0),
		});
	}
	// fixed expenses whose category_id isn't in the categories list at all
	for (const [categoryId, net] of netByCategory) {
		if (rows.has(categoryId)) continue;
		rows.set(categoryId, {
			categoryId,
			categoryName: nameByCategory.get(categoryId) ?? '',
			net: round2(net),
		});
	}

	return Array.from(rows.values()).sort((a, b) => a.categoryName.localeCompare(b.categoryName));
}
