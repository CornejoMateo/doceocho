import type { BudgetItem, BudgetLine, Finish } from '@/lib/budget-builder/types';
import { DEFAULT_FINISHES } from '@/constants/budget-builder/budget-builder';
import { newId } from '@/helpers/budget-builder/id';

/** Lines added by a finish are marked with this item id, so changing finish replaces them. */
const FINISH_LINE_PREFIX = 'finish:';

/** The finish is priced on every face to finish, the same surface lacquer is calculated on. */
export const FINISH_QUANTITY = 'superficie_total';

export function isFinishLine(line: BudgetLine): boolean {
	return Boolean(line.itemId?.startsWith(FINISH_LINE_PREFIX));
}

/**
 * Puts a finish on a piece: its name and color for the 3D view and the client, and its price
 * as a regular line (m² × price) that the seller can still adjust like any other.
 */
export function applyFinish(item: BudgetItem, finish: Finish): BudgetItem {
	const lines = item.lines.filter((line) => !isFinishLine(line));

	if (finish.price > 0) {
		lines.push({
			id: newId(),
			itemId: `${FINISH_LINE_PREFIX}${finish.id}`,
			name: `Terminación ${finish.name}`,
			category: 'Terminaciones',
			unit: 'm2',
			price: finish.price,
			quantity: FINISH_QUANTITY,
		});
	}

	return { ...item, finish: finish.id, finishName: finish.name, finishColor: finish.color, lines };
}

/** Name and color of a piece's finish; older budgets only kept the id of a built-in one. */
export function finishOf(item: Pick<BudgetItem, 'finish' | 'finishName' | 'finishColor'>): {
	name: string;
	color: string;
} {
	const builtIn = DEFAULT_FINISHES.find((finish) => finish.id === item.finish);

	return {
		name: item.finishName ?? builtIn?.name ?? item.finish,
		color: item.finishColor ?? builtIn?.color ?? DEFAULT_FINISHES[0].color,
	};
}
