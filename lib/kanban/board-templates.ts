import { createList } from '@/lib/kanban/lists';
import { getBoardTemplate } from '@/constants/kanban/board-templates';

export type ApplyTemplateResult = {
	createdCount: number;
	/** Names that could not be created, so the caller can say what is missing. */
	failedNames: string[];
};

/**
 * Creates the lists of a template on a board, in order.
 * Lists are created one by one because their order is what gives the board its
 * meaning, and a half-applied template still leaves a usable board: the user
 * can add whatever is missing by hand.
 */
export async function applyBoardTemplate(
	boardId: number,
	templateId: string
): Promise<ApplyTemplateResult> {
	const template = getBoardTemplate(templateId);

	if (!template || template.lists.length === 0) {
		return { createdCount: 0, failedNames: [] };
	}

	const failedNames: string[] = [];
	let createdCount = 0;

	for (const name of template.lists) {
		const { error } = await createList({ name }, boardId);

		if (error) {
			failedNames.push(name);
		} else {
			createdCount++;
		}
	}

	return { createdCount, failedNames };
}
