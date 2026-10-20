/**
 * @jest-environment node
 */

import { buildParts, computeVariables } from '@/helpers/budget-builder/geometry';
import {
	budgetCode,
	calculateBudget,
	calculateItem,
	createBudget,
	itemFromTemplate,
} from '@/helpers/budget-builder/calculate';
import {
	decodeClientBudget,
	encodeClientBudget,
	toClientBudget,
} from '@/helpers/budget-builder/share';
import { projectView } from '@/helpers/budget-builder/drawings';
import { DEFAULT_SETTINGS } from '@/constants/budget-builder/budget-builder';
import type { Budget, FurnitureDimensions } from '@/lib/budget-builder/types';

const table: FurnitureDimensions = {
	width: 100,
	depth: 50,
	height: 75,
	thickness: 3,
	legs: 4,
	shelves: 0,
	doors: 0,
};

const template = (id: string) =>
	DEFAULT_SETTINGS.templates.find((candidate) => candidate.id === id)!;

describe('geometry', () => {
	test('a table is a top plus one piece per leg', () => {
		const parts = buildParts('mesa', table);

		expect(parts.filter((part) => part.kind === 'leg')).toHaveLength(4);
		expect(parts[0]).toMatchObject({ name: 'Tapa', size: [100, 3, 50] });
	});

	test('a three-legged bench gets exactly three legs', () => {
		expect(
			buildParts('mesa', { ...table, legs: 3 }).filter((part) => part.kind === 'leg')
		).toHaveLength(3);
	});

	test('a cabinet has sides, top, bottom, back, shelves and doors', () => {
		const parts = buildParts('mueble', { ...table, thickness: 1.8, shelves: 2, doors: 2 });

		expect(parts.filter((part) => part.name === 'Lateral')).toHaveLength(2);
		expect(parts.filter((part) => part.name === 'Estante')).toHaveLength(2);
		expect(parts.filter((part) => part.kind === 'door')).toHaveLength(2);
		expect(parts.filter((part) => part.kind === 'back')).toHaveLength(1);
	});

	test('variables are in meters and follow the measurements', () => {
		const variables = computeVariables(table, buildParts('mesa', table));

		expect(variables.ancho).toBe(1);
		expect(variables.patas).toBe(4);
		// The top alone is 1 m × 0.5 m.
		expect(variables.superficie).toBeGreaterThanOrEqual(0.5);
		expect(variables.volumen).toBeGreaterThan(0.015);
	});
});

describe('calculate', () => {
	test('a template brings its lines and prices from the catalog', () => {
		const item = itemFromTemplate(template('banco'), DEFAULT_SETTINGS.catalog);

		expect(item.lines.map((line) => line.itemId)).toEqual([
			'paraiso-macizo',
			'tornillo',
			'cola',
			'laca',
			'mano-obra',
		]);
		expect(item.dimensions.legs).toBe(3);
	});

	test('quantities follow the formula: 3 legs × 4 screws', () => {
		const item = itemFromTemplate(template('banco'), DEFAULT_SETTINGS.catalog);
		const screws = calculateItem(item).lines.find((line) => line.itemId === 'tornillo')!;

		expect(screws.amount).toBe(12);
		expect(screws.subtotal).toBe(12 * 60);
	});

	test('more units multiply the cost', () => {
		const item = itemFromTemplate(template('banco'), DEFAULT_SETTINGS.catalog);
		const single = calculateItem(item).cost;

		expect(calculateItem({ ...item, units: 4 }).cost).toBeCloseTo(single * 4);
	});

	test('the margin goes on top of the cost', () => {
		const budget: Budget = {
			...createBudget(DEFAULT_SETTINGS, []),
			marginPercent: 50,
			items: [itemFromTemplate(template('mesa'), DEFAULT_SETTINGS.catalog)],
		};
		const totals = calculateBudget(budget);

		expect(totals.total).toBeCloseTo(totals.cost * 1.5, -1);
		expect(totals.margin).toBeCloseTo(totals.total - totals.cost);
	});

	test('a broken formula is flagged and counts as zero', () => {
		const item = itemFromTemplate(template('banco'), DEFAULT_SETTINGS.catalog);
		item.lines[1].quantity = 'patas *';

		const calc = calculateItem(item);

		expect(calc.hasErrors).toBe(true);
		expect(calc.lines[1].subtotal).toBe(0);
	});

	test('budget numbers keep growing and read as P-0001', () => {
		const first = createBudget(DEFAULT_SETTINGS, []);
		const second = createBudget(DEFAULT_SETTINGS, [first]);

		expect(budgetCode(first)).toBe('P-0001');
		expect(second.number).toBe(2);
	});
});

describe('client link', () => {
	const budget: Budget = {
		...createBudget(DEFAULT_SETTINGS, []),
		clientName: 'Ana',
		items: [itemFromTemplate(template('biblioteca'), DEFAULT_SETTINGS.catalog)],
	};

	test('the client only gets final prices, never costs or lines', () => {
		const data = toClientBudget(budget, DEFAULT_SETTINGS.company);
		const json = JSON.stringify(data);

		expect(data.total).toBe(calculateBudget(budget).total);
		expect(json).not.toContain('lines');
		expect(json).not.toContain('marginPercent');
		expect(json).not.toContain('Melamina');
	});

	test('survives the round trip through the link', async () => {
		const data = toClientBudget(budget, DEFAULT_SETTINGS.company);
		const token = await encodeClientBudget(data);

		expect(token).toMatch(/^[a-z][A-Za-z0-9_-]+$/);
		await expect(decodeClientBudget(token)).resolves.toEqual(data);
	});

	test('a tampered link opens nothing instead of crashing', async () => {
		await expect(decodeClientBudget('zno-es-un-presupuesto')).resolves.toBeNull();
		await expect(decodeClientBudget('')).resolves.toBeNull();
	});
});

describe('drawings', () => {
	test('the front view measures width by height', () => {
		const front = projectView('mesa', table, 'frente');

		expect(front.width).toBeCloseTo(100);
		expect(front.height).toBeCloseTo(75);
	});

	test('the side view measures depth by height, the top view width by depth', () => {
		expect(projectView('mesa', table, 'lateral').width).toBeCloseTo(50);
		const top = projectView('mesa', table, 'planta');
		expect([top.width, top.height]).toEqual([100, 50]);
	});

	test('back panels are drawn first so pieces in front cover them', () => {
		const front = projectView('mueble', { ...table, thickness: 1.8, doors: 2 }, 'frente');

		expect(front.rects[0].kind).toBe('back');
	});
});
