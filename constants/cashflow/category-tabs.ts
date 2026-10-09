import { CategoryKind } from '@/lib/categories/categories';
import { CashFlowTabValue } from '@/constants/cashflow/tabs';

interface CategoryTabConfig {
	kind: CategoryKind;
	title: string;
	triggerLabel: string;
	newLabel: string;
	emptyLabel: string;
}

export const CATEGORY_TABS: Partial<Record<CashFlowTabValue, CategoryTabConfig>> = {
	incomes: {
		kind: 'income',
		title: 'Categorías de ingresos',
		triggerLabel: 'Configurar categorías',
		newLabel: 'Nueva categoría',
		emptyLabel: 'No hay categorías de ingresos registradas',
	},
	expenses: {
		kind: 'expense',
		title: 'Categorías de gastos',
		triggerLabel: 'Configurar categorías',
		newLabel: 'Nueva categoría',
		emptyLabel: 'No hay categorías de gastos registradas',
	},
	payments: {
		kind: 'payment',
		title: 'Categorías de pagos',
		triggerLabel: 'Configurar categorías',
		newLabel: 'Nueva categoría',
		emptyLabel: 'No hay categorías de pagos registradas',
	},
	collections: {
		kind: 'collection',
		title: 'Categorías de cobros',
		triggerLabel: 'Configurar categorías',
		newLabel: 'Nueva categoría',
		emptyLabel: 'No hay categorías de cobros registradas',
	},
	'fixed-expenses': {
		kind: 'fixed_expense',
		title: 'Categorías de gastos fijos',
		triggerLabel: 'Configurar categorías',
		newLabel: 'Nueva categoría',
		emptyLabel: 'No hay categorías de gastos fijos registradas',
	},
};
