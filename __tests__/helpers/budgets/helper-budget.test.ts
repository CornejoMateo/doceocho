import {
	normalizeType,
	workLabel,
	formatCurrency,
	groupBudgetsByType,
	getOrderedTypeKeys,
	parseAmount,
} from '@/helpers/budgets/helper-budget';
import { FolderBudget } from '@/lib/budgets/folder_budgets';
import { BudgetWithWork } from '@/lib/balances/balances';

describe('normalizeType', () => {
	it('returns the type trimmed when valid', () => {
		expect(normalizeType('MDF')).toBe('MDF');
		expect(normalizeType('  MDF  ')).toBe('MDF');
	});

	it('returns "Otros" for null or undefined', () => {
		expect(normalizeType(null)).toBe('Otros');
		expect(normalizeType(undefined)).toBe('Otros');
	});

	it('returns "Otros" for empty string', () => {
		expect(normalizeType('')).toBe('Otros');
		expect(normalizeType('   ')).toBe('Otros');
	});
});

describe('workLabel', () => {
	it('returns "Sin obra" when works is null', () => {
		const folder = { work_id: null, works: null } as unknown as FolderBudget;
		expect(workLabel(folder)).toBe('Sin obra');
	});

	it('returns "Sin obra" when works is undefined', () => {
		const folder = {} as FolderBudget;
		expect(workLabel(folder)).toBe('Sin obra');
	});

	it('returns address - locality when both exist', () => {
		const folder = {
			works: { address: 'Av. Siempre Viva', locality: 'Springfield', status: 'active' },
		} as FolderBudget;
		expect(workLabel(folder)).toBe('Av. Siempre Viva - Springfield');
	});

	it('returns only address when locality is null', () => {
		const folder = {
			works: { address: 'Calle 123', locality: null, status: null },
		} as FolderBudget;
		expect(workLabel(folder)).toBe('Calle 123');
	});

	it('returns only locality when address is null', () => {
		const folder = {
			works: { address: null, locality: 'Buenos Aires', status: null },
		} as FolderBudget;
		expect(workLabel(folder)).toBe('Buenos Aires');
	});

	it('returns "Obra" when both address and locality are null', () => {
		const folder = {
			works: { address: null, locality: null, status: null },
		} as FolderBudget;
		expect(workLabel(folder)).toBe('Obra');
	});
});

describe('formatCurrency', () => {
	it('formats a number with ARS currency', () => {
		const result = formatCurrency(1500.5, 'ARS');
		expect(result).toContain('$');
		expect(result).toContain('ARS');
	});

	it('formats a number with USD currency', () => {
		const result = formatCurrency(500, 'USD');
		expect(result).toContain('$');
		expect(result).toContain('USD');
	});

	it('returns fallback when amount is null', () => {
		expect(formatCurrency(null, 'ARS')).toBe('Monto ARS no cargado');
	});

	it('returns fallback when amount is undefined', () => {
		expect(formatCurrency(undefined, 'USD')).toBe('Monto USD no cargado');
	});
});

describe('groupBudgetsByType', () => {
	it('groups budgets by their type', () => {
		const budgets = [
			{
				id: 1,
				type: 'MDF',
				amount_ars: 100,
				amount_usd: 0,
				created_at: '',
				folder_budget: { id: 1, work_id: null, work: null },
			},
			{
				id: 2,
				type: 'MDF',
				amount_ars: 200,
				amount_usd: 0,
				created_at: '',
				folder_budget: { id: 1, work_id: null, work: null },
			},
			{
				id: 3,
				type: 'Herrería',
				amount_ars: 300,
				amount_usd: 0,
				created_at: '',
				folder_budget: { id: 1, work_id: null, work: null },
			},
		] as BudgetWithWork[];

		const grouped = groupBudgetsByType(budgets);

		expect(grouped.get('MDF')).toHaveLength(2);
		expect(grouped.get('Herrería')).toHaveLength(1);
	});

	it('normalizes null type to "Otros"', () => {
		const budgets = [
			{
				id: 1,
				type: null,
				amount_ars: 100,
				amount_usd: 0,
				created_at: '',
				folder_budget: { id: 1, work_id: null, work: null },
			},
		] as BudgetWithWork[];

		const grouped = groupBudgetsByType(budgets);
		expect(grouped.get('Otros')).toHaveLength(1);
	});

	it('returns empty map for empty array', () => {
		const grouped = groupBudgetsByType([]);
		expect(grouped.size).toBe(0);
	});
});

describe('getOrderedTypeKeys', () => {
	it('sorts keys alphabetically', () => {
		const map = new Map<string, BudgetWithWork[]>();
		map.set('Otros', []);
		map.set('MDF', []);
		map.set('Zebra', []);

		const keys = getOrderedTypeKeys(map);
		expect(keys).toEqual(['MDF', 'Otros', 'Zebra']);
	});

	it('returns empty array for empty map', () => {
		expect(getOrderedTypeKeys(new Map())).toEqual([]);
	});
});

describe('parseAmount', () => {
	it('parses a valid number string', () => {
		expect(parseAmount('1500')).toBe(1500);
		expect(parseAmount('1500.50')).toBe(1500.5);
	});

	it('returns null for empty string', () => {
		expect(parseAmount('')).toBe(null);
		expect(parseAmount('   ')).toBe(null);
	});

	it('returns null for non-numeric string', () => {
		expect(parseAmount('abc')).toBe(null);
	});
});
