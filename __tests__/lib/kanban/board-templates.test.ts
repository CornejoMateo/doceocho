import { applyBoardTemplate } from '@/lib/kanban/board-templates';
import { createList } from '@/lib/kanban/lists';
import { BOARD_TEMPLATES, getBoardTemplate } from '@/constants/kanban/board-templates';

jest.mock('@/lib/kanban/lists', () => ({
	createList: jest.fn(),
}));

const mockCreateList = createList as jest.Mock;

describe('lib/kanban/board-templates', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockCreateList.mockResolvedValue({ data: { id: 1 }, error: null });
	});

	test('creates the lists of the template, in order', async () => {
		const result = await applyBoardTemplate(7, 'simple');

		expect(result).toEqual({ createdCount: 3, failedNames: [] });
		expect(mockCreateList).toHaveBeenCalledTimes(3);
		// Order is what gives the board its meaning.
		expect(mockCreateList.mock.calls.map(([list]) => list.name)).toEqual([
			'Por hacer',
			'En proceso',
			'Terminado',
		]);
		expect(mockCreateList).toHaveBeenCalledWith(expect.anything(), 7);
	});

	test('creates nothing for the blank template', async () => {
		const result = await applyBoardTemplate(7, 'blank');

		expect(result).toEqual({ createdCount: 0, failedNames: [] });
		expect(mockCreateList).not.toHaveBeenCalled();
	});

	test('creates nothing for an unknown template', async () => {
		const result = await applyBoardTemplate(7, 'does-not-exist');

		expect(result).toEqual({ createdCount: 0, failedNames: [] });
		expect(mockCreateList).not.toHaveBeenCalled();
	});

	test('reports the lists that failed without stopping', async () => {
		mockCreateList
			.mockResolvedValueOnce({ data: { id: 1 }, error: null })
			.mockResolvedValueOnce({ data: null, error: new Error('DB error') })
			.mockResolvedValueOnce({ data: { id: 3 }, error: null });

		const result = await applyBoardTemplate(7, 'simple');

		expect(result).toEqual({ createdCount: 2, failedNames: ['En proceso'] });
		// The rest still gets created: a half-applied board is still usable.
		expect(mockCreateList).toHaveBeenCalledTimes(3);
	});
});

describe('constants/kanban/board-templates', () => {
	test('every template has a unique id', () => {
		const ids = BOARD_TEMPLATES.map((template) => template.id);

		expect(new Set(ids).size).toBe(ids.length);
	});

	test('every template is described and named', () => {
		BOARD_TEMPLATES.forEach((template) => {
			expect(template.name.trim().length).toBeGreaterThan(0);
			expect(template.description.trim().length).toBeGreaterThan(0);
		});
	});

	test('only the blank template has no lists', () => {
		BOARD_TEMPLATES.forEach((template) => {
			if (template.id === 'blank') {
				expect(template.lists).toHaveLength(0);
			} else {
				expect(template.lists.length).toBeGreaterThan(0);
			}
		});
	});

	test('no template repeats a list name', () => {
		BOARD_TEMPLATES.forEach((template) => {
			expect(new Set(template.lists).size).toBe(template.lists.length);
		});
	});

	test('getBoardTemplate finds a template and ignores an unknown id', () => {
		expect(getBoardTemplate('simple')?.lists).toEqual(['Por hacer', 'En proceso', 'Terminado']);
		expect(getBoardTemplate('nope')).toBeUndefined();
	});
});
