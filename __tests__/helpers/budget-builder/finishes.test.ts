import { applyFinish, finishOf, isFinishLine } from '@/helpers/budget-builder/finishes';
import { calculateItem, itemFromTemplate } from '@/helpers/budget-builder/calculate';
import { toClientBudget } from '@/helpers/budget-builder/share';
import { createBudget } from '@/helpers/budget-builder/calculate';
import { DEFAULT_SETTINGS } from '@/constants/budget-builder/budget-builder';
import type { Finish } from '@/lib/budget-builder/types';

const banco = DEFAULT_SETTINGS.templates.find((template) => template.id === 'banco')!;
const verde: Finish = { id: 'verde', name: 'Laqueado verde', color: '#7a8f6a', price: 5000 };
const natural: Finish = { id: 'natural', name: 'Natural', color: '#c8a27a', price: 0 };

describe('helpers/budget-builder/finishes', () => {
	test('a priced finish adds its own line on the surface to finish', () => {
		const item = itemFromTemplate(banco, DEFAULT_SETTINGS.catalog, verde);
		const line = item.lines.find(isFinishLine)!;

		expect(line).toMatchObject({
			name: 'Terminación Laqueado verde',
			unit: 'm2',
			price: 5000,
			quantity: 'superficie_total',
		});
		expect(item).toMatchObject({
			finish: 'verde',
			finishName: 'Laqueado verde',
			finishColor: '#7a8f6a',
		});
	});

	test('the finish price follows the piece size', () => {
		const item = itemFromTemplate(banco, DEFAULT_SETTINGS.catalog, verde);
		const calc = calculateItem(item);
		const line = calc.lines.find(isFinishLine)!;

		expect(line.amount).toBe(calc.variables.superficie_total);
		expect(line.subtotal).toBeCloseTo(calc.variables.superficie_total * 5000);
	});

	test('changing finish replaces its line instead of adding another', () => {
		const withGreen = itemFromTemplate(banco, DEFAULT_SETTINGS.catalog, verde);
		const black = applyFinish(withGreen, {
			id: 'negro',
			name: 'Negro',
			color: '#222',
			price: 7000,
		});

		expect(black.lines.filter(isFinishLine)).toHaveLength(1);
		expect(black.lines.find(isFinishLine)?.price).toBe(7000);
	});

	test('a finish without price adds no line and removes the previous one', () => {
		const withGreen = itemFromTemplate(banco, DEFAULT_SETTINGS.catalog, verde);
		const plain = applyFinish(withGreen, natural);

		expect(plain.lines.some(isFinishLine)).toBe(false);
		expect(plain.lines).toHaveLength(withGreen.lines.length - 1);
	});

	test('older pieces with only a built-in id still show their name and color', () => {
		expect(finishOf({ finish: 'nogal' })).toEqual({ name: 'Nogal', color: '#6f4e37' });
	});

	test('the client gets the finish name and color, never its price line', () => {
		const budget = {
			...createBudget(DEFAULT_SETTINGS, []),
			items: [itemFromTemplate(banco, DEFAULT_SETTINGS.catalog, verde)],
		};
		const data = toClientBudget(budget, DEFAULT_SETTINGS.company);

		expect(data.items[0]).toMatchObject({ finishName: 'Laqueado verde', finishColor: '#7a8f6a' });
		expect(JSON.stringify(data)).not.toContain('Terminación Laqueado verde');
	});
});
