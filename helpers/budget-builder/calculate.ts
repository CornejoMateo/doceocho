import type {
	Budget,
	BudgetBuilderSettings,
	BudgetItem,
	BudgetLine,
	CatalogItem,
	FurnitureTemplate,
} from '@/lib/budget-builder/types';
import { FINISHES } from '@/constants/budget-builder/budget-builder';
import { buildParts, computeVariables } from '@/helpers/budget-builder/geometry';
import { tryEvaluateFormula } from '@/helpers/budget-builder/formula';

export function newId(): string {
	return typeof crypto !== 'undefined' && 'randomUUID' in crypto
		? crypto.randomUUID()
		: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function lineFromCatalog(item: CatalogItem, quantity = '1'): BudgetLine {
	return {
		id: newId(),
		itemId: item.id,
		name: item.name,
		category: item.category,
		unit: item.unit,
		price: item.price,
		quantity,
	};
}

/** A template copied into the budget; later catalog changes do not alter a budget already made. */
export function itemFromTemplate(template: FurnitureTemplate, catalog: CatalogItem[]): BudgetItem {
	const lines = template.lines.flatMap((templateLine) => {
		const item = catalog.find((candidate) => candidate.id === templateLine.itemId);
		return item ? [lineFromCatalog(item, templateLine.quantity)] : [];
	});

	return {
		id: newId(),
		name: template.name,
		templateId: template.id,
		shape: template.shape,
		dimensions: { ...template.dimensions },
		finish: FINISHES[0].value,
		units: 1,
		notes: '',
		lines,
	};
}

export type EvaluatedLine = BudgetLine & { amount: number; subtotal: number; error: string | null };

export type ItemCost = {
	variables: Record<string, number>;
	lines: EvaluatedLine[];
	/** Cost of one piece. */
	unitCost: number;
	/** Cost of all the units. */
	cost: number;
	hasErrors: boolean;
};

export function calculateItem(item: BudgetItem): ItemCost {
	const variables = computeVariables(item.dimensions, buildParts(item.shape, item.dimensions));

	const lines = item.lines.map((line) => {
		const { value, error } = tryEvaluateFormula(line.quantity, variables);
		const amount = Math.max(value, 0);
		return { ...line, amount, subtotal: amount * (line.price || 0), error };
	});

	const unitCost = lines.reduce((sum, line) => sum + line.subtotal, 0);
	const units = Math.max(item.units || 1, 1);

	return {
		variables,
		lines,
		unitCost,
		cost: unitCost * units,
		hasErrors: lines.some((line) => line.error),
	};
}

export type BudgetTotals = {
	items: { item: BudgetItem; calc: ItemCost; price: number }[];
	cost: number;
	margin: number;
	total: number;
};

/** The client only ever sees prices with the margin applied, never the internal costs. */
export function calculateBudget(budget: Budget): BudgetTotals {
	const factor = 1 + (budget.marginPercent || 0) / 100;

	const items = budget.items.map((item) => {
		const calc = calculateItem(item);
		return { item, calc, price: roundMoney(calc.cost * factor) };
	});

	const cost = items.reduce((sum, entry) => sum + entry.calc.cost, 0);
	const total = items.reduce((sum, entry) => sum + entry.price, 0);

	return { items, cost, margin: total - cost, total };
}

export function roundMoney(value: number): number {
	return Math.round(value);
}

export function createBudget(settings: BudgetBuilderSettings, existing: Budget[]): Budget {
	const number = existing.reduce((max, budget) => Math.max(max, budget.number), 0) + 1;

	return {
		id: newId(),
		number,
		createdAt: new Date().toISOString(),
		clientName: '',
		clientContact: '',
		status: 'borrador',
		marginPercent: settings.defaultMarginPercent,
		validityDays: settings.defaultValidityDays,
		notes: '',
		items: [],
		publicToken: '',
		clientResponse: null,
		clientComment: null,
		respondedAt: null,
	};
}

export function formatDimensions(item: BudgetItem): string {
	const { width, height, depth } = item.dimensions;
	return `${width} × ${depth} × ${height} cm`;
}

export function finishLabel(value: string): string {
	return FINISHES.find((finish) => finish.value === value)?.label ?? value;
}

export function finishColor(value: string): string {
	return FINISHES.find((finish) => finish.value === value)?.color ?? FINISHES[0].color;
}

export function budgetCode(budget: Pick<Budget, 'number'>): string {
	return `P-${String(budget.number).padStart(4, '0')}`;
}
