import { CashFlowCategory } from '@/lib/categories/categories';
import type { IncomeExpenseEntry } from '@/hooks/income-expense/use-income-expense-tab';
import { MONTH_LABELS_ES } from '@/helpers/fixed-expenses/fixed-expenses-summary';

export { MONTH_LABELS_ES };

export type IncomeExpenseMonthRow = {
	month: number;
	net: number;
	iva: number;
	total: number;
};

export type IncomeExpenseCategoryRow = {
	categoryId: number | null;
	categoryName: string;
	net: number;
};

function round2(value: number): number {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}

// Mirrors groupFixedExpensePaymentsByMonth: Ene-Dic zero-filled, month from 'YYYY-MM-DD' slice (no Date/timezone).
export function computeIncomeExpenseByMonth(
	entries: IncomeExpenseEntry[]
): IncomeExpenseMonthRow[] {
	const rows: IncomeExpenseMonthRow[] = MONTH_LABELS_ES.map((_, month) => ({
		month,
		net: 0,
		iva: 0,
		total: 0,
	}));
	for (const entry of entries) {
		const month = Number(entry.date.slice(5, 7)) - 1;
		if (month < 0 || month > 11) continue;
		rows[month].net += Number(entry.net_amount);
		rows[month].iva += Number(entry.iva_amount);
		rows[month].total += Number(entry.total_amount);
	}
	return rows.map((row) => ({
		...row,
		net: round2(row.net),
		iva: round2(row.iva),
		total: round2(row.total),
	}));
}

export function computeIncomeExpenseByCategory(
	entries: IncomeExpenseEntry[],
	categories: CashFlowCategory[]
): IncomeExpenseCategoryRow[] {
	const netByCategory = new Map<number | null, number>();
	const nameByCategory = new Map<number | null, string>();
	for (const entry of entries) {
		netByCategory.set(
			entry.category_id,
			(netByCategory.get(entry.category_id) ?? 0) + Number(entry.net_amount)
		);
		if (!nameByCategory.has(entry.category_id))
			nameByCategory.set(
				entry.category_id,
				entry.category_id === null ? 'Sin categoría' : entry.category_name
			);
	}

	const rows = new Map<number | null, IncomeExpenseCategoryRow>();
	for (const category of categories) {
		// skip inactive categories with no movements, so they stay hidden
		if (!category.is_active && !netByCategory.has(category.id)) continue;
		rows.set(category.id, {
			categoryId: category.id,
			categoryName: category.name,
			net: round2(netByCategory.get(category.id) ?? 0),
		});
	}
	// entries whose category_id isn't in the categories list at all
	for (const [categoryId, net] of netByCategory) {
		if (rows.has(categoryId)) continue;
		rows.set(categoryId, {
			categoryId,
			categoryName: nameByCategory.get(categoryId) ?? '',
			net: round2(net),
		});
	}

	return Array.from(rows.values()).sort((a, b) => b.net - a.net);
}
