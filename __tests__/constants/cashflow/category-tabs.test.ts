import { CATEGORY_TABS } from '@/constants/cashflow/category-tabs';

describe('CATEGORY_TABS', () => {
	it('maps each cash-flow tab to its category kind', () => {
		expect(CATEGORY_TABS.incomes?.kind).toBe('income');
		expect(CATEGORY_TABS.expenses?.kind).toBe('expense');
		expect(CATEGORY_TABS.payments?.kind).toBe('payment');
		expect(CATEGORY_TABS.collections?.kind).toBe('collection');
		// Costos fijos shares the 'expense' category pool with Gastos.
		expect(CATEGORY_TABS['fixed-expenses']?.kind).toBe('expense');
	});
});
