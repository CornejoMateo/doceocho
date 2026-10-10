import { CashFlowCategory } from '@/lib/categories/categories';
import { FixedExpensePaymentWithDetails } from '@/lib/fixed-expenses/fixed-expense-payments';

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

export type FixedExpensePaymentTotals = {
	net: number;
	iva: number;
	total: number;
	count: number;
	average: number;
};

export type FixedExpensePaymentMonthRow = {
	month: number;
	net: number;
	iva: number;
	total: number;
};

export type FixedExpensePaymentCategoryRow = {
	categoryId: number;
	categoryName: string;
	net: number;
};

function round2(value: number): number {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function computeFixedExpensePaymentTotals(
	payments: FixedExpensePaymentWithDetails[]
): FixedExpensePaymentTotals {
	const net = round2(payments.reduce((sum, p) => sum + Number(p.net_amount), 0));
	const iva = round2(payments.reduce((sum, p) => sum + Number(p.iva_amount), 0));
	const total = round2(payments.reduce((sum, p) => sum + Number(p.total_amount), 0));
	const count = payments.length;
	const average = count > 0 ? round2(total / count) : 0;
	return { net, iva, total, count, average };
}

export function groupFixedExpensePaymentsByMonth(
	payments: FixedExpensePaymentWithDetails[]
): FixedExpensePaymentMonthRow[] {
	const rows: FixedExpensePaymentMonthRow[] = MONTH_LABELS_ES.map((_, month) => ({
		month,
		net: 0,
		iva: 0,
		total: 0,
	}));
	for (const payment of payments) {
		const month = Number(payment.period.slice(5, 7)) - 1;
		if (month < 0 || month > 11) continue;
		rows[month].net += Number(payment.net_amount);
		rows[month].iva += Number(payment.iva_amount);
		rows[month].total += Number(payment.total_amount);
	}
	return rows.map((row) => ({
		...row,
		net: round2(row.net),
		iva: round2(row.iva),
		total: round2(row.total),
	}));
}

export function groupFixedExpensePaymentsByCategory(
	payments: FixedExpensePaymentWithDetails[],
	categories: CashFlowCategory[]
): FixedExpensePaymentCategoryRow[] {
	const netByCategory = new Map<number, number>();
	const nameByCategory = new Map<number, string>();
	for (const payment of payments) {
		netByCategory.set(
			payment.category_id,
			(netByCategory.get(payment.category_id) ?? 0) + Number(payment.net_amount)
		);
		if (!nameByCategory.has(payment.category_id)) {
			const category = categories.find((c) => c.id === payment.category_id);
			nameByCategory.set(payment.category_id, category?.name ?? payment.category_name);
		}
	}

	const rows = new Map<number, FixedExpensePaymentCategoryRow>();
	for (const category of categories) {
		// skip inactive categories with no payments, so they stay hidden
		if (!category.is_active && !netByCategory.has(category.id)) continue;
		rows.set(category.id, {
			categoryId: category.id,
			categoryName: category.name,
			net: round2(netByCategory.get(category.id) ?? 0),
		});
	}
	// payments whose category_id isn't in the categories list at all
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
