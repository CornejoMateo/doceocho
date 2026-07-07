import { renderHook, act, waitFor } from '@testing-library/react';
import { useBoard } from '@/hooks/kanban/use-board';
import { getBoardWithLists, updateBoard } from '@/lib/kanban/boards';
import { getListsByBoardId, createList, updateList, deleteList } from '@/lib/kanban/lists';

jest.mock('@/lib/kanban/boards', () => ({
	getBoardWithLists: jest.fn(),
	updateBoard: jest.fn(),
}));

jest.mock('@/lib/kanban/lists', () => ({
	getListsByBoardId: jest.fn(),
	createList: jest.fn(),
	updateList: jest.fn(),
	deleteList: jest.fn(),
}));

jest.mock('@/hooks/use-optimistic-mutation', () => {
	const createMutate = (config: any) => {
		return (params: any) => {
			config.optimisticUpdate?.(params);
			config.mutationFn?.(params);
		};
	};
	return {
		useOptimisticMutation: jest.fn((config: any) => ({ mutate: createMutate(config) })),
	};
});

const mockBoard = {
	id: 1,
	name: 'Test Board',
	description: null,
	color: '#fff',
	created_at: '2024-01-01',
	due_date_tolerance_yellow: 3,
	due_date_tolerance_red: 1,
	members: [],
	lists: [
		{ id: 1, created_at: '2024-01-01', board_id: 1, name: 'To Do', cards: [] },
		{ id: 2, created_at: '2024-01-01', board_id: 1, name: 'Done', cards: [] },
	],
};

const mockCard = {
	id: 1,
	created_at: '2024-01-01',
	list_id: 1,
	title: 'Task',
	description: null,
	position: 0,
	due_date: null,
	priority: 'none',
	completed_at: null,
	color: null,
};

describe('useBoard', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('fetches board on mount', async () => {
		(getBoardWithLists as jest.Mock).mockResolvedValue({ data: mockBoard, error: null });

		const { result } = renderHook(() => useBoard(1));

		expect(result.current.loading).toBe(true);

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		expect(getBoardWithLists).toHaveBeenCalledWith(1);
		expect(result.current.board).toEqual(mockBoard);
		expect(result.current.lists).toEqual(mockBoard.lists);
	});

	it('does not fetch when boardId is null', () => {
		const { result } = renderHook(() => useBoard(null));

		expect(getBoardWithLists).not.toHaveBeenCalled();
		expect(result.current.board).toBeNull();
		expect(result.current.lists).toEqual([]);
	});

	it('sets error on fetch failure', async () => {
		(getBoardWithLists as jest.Mock).mockResolvedValue({
			data: null,
			error: { message: 'Not found' },
		});

		const { result } = renderHook(() => useBoard(1));

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		expect(result.current.error).toBe('Not found');
		expect(result.current.board).toBeNull();
	});

	it('fetchLists updates lists', async () => {
		(getBoardWithLists as jest.Mock).mockResolvedValue({ data: mockBoard, error: null });
		(getListsByBoardId as jest.Mock).mockResolvedValue({
			data: [{ id: 3, created_at: '2024-01-01', board_id: 1, name: 'New List' }],
			error: null,
		});

		const { result } = renderHook(() => useBoard(1));

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		await act(async () => {
			await result.current.fetchLists();
		});

		expect(result.current.lists).toEqual([
			{ id: 3, created_at: '2024-01-01', board_id: 1, name: 'New List' },
		]);
	});

	it('addList appends list on success', async () => {
		(getBoardWithLists as jest.Mock).mockResolvedValue({ data: mockBoard, error: null });
		const newList = { id: 3, created_at: '2024-01-01', board_id: 1, name: 'In Progress' };
		(createList as jest.Mock).mockResolvedValue({ data: newList, error: null });

		const { result } = renderHook(() => useBoard(1));

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		await act(async () => {
			const data = await result.current.addList({ name: 'In Progress' });
			expect(data).toEqual(newList);
		});

		expect(result.current.lists).toHaveLength(3);
		expect(result.current.lists[2].name).toBe('In Progress');
	});

	it('editList updates list in state on success', async () => {
		(getBoardWithLists as jest.Mock).mockResolvedValue({ data: mockBoard, error: null });
		const updated = { ...mockBoard.lists[0], name: 'Updated List' };
		(updateList as jest.Mock).mockResolvedValue({ data: updated, error: null });

		const { result } = renderHook(() => useBoard(1));

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		await act(async () => {
			const data = await result.current.editList(1, { name: 'Updated List' });
			expect(data).toEqual(updated);
		});

		expect(result.current.lists[0].name).toBe('Updated List');
	});

	it('removeList removes list from state on success', async () => {
		(getBoardWithLists as jest.Mock).mockResolvedValue({ data: mockBoard, error: null });
		(deleteList as jest.Mock).mockResolvedValue({ error: null });

		const { result } = renderHook(() => useBoard(1));

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		await act(async () => {
			await result.current.removeList(1);
		});

		expect(result.current.lists).toHaveLength(1);
		expect(result.current.lists[0].id).toBe(2);
	});

	it('updateBoard updates board state on success', async () => {
		(getBoardWithLists as jest.Mock).mockResolvedValue({ data: mockBoard, error: null });
		const updatedBoard = { ...mockBoard, name: 'Updated Board' };
		(updateBoard as jest.Mock).mockResolvedValue({ data: updatedBoard, error: null });

		const { result } = renderHook(() => useBoard(1));

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		await act(async () => {
			const data = await result.current.updateBoard({ name: 'Updated Board' });
			expect(data).toEqual(updatedBoard);
		});

		expect(result.current.board?.name).toBe('Updated Board');
	});

	it('moveCardOptimistic moves card between lists', async () => {
		const boardWithCards = {
			...mockBoard,
			lists: [
				{ ...mockBoard.lists[0], cards: [mockCard] },
				{ ...mockBoard.lists[1], cards: [] },
			],
		};
		(getBoardWithLists as jest.Mock).mockResolvedValue({ data: boardWithCards, error: null });

		const { result } = renderHook(() => useBoard(1));

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		await act(async () => {
			result.current.optimisticallyMoveCard({ cardId: 1, newListId: 2, newPosition: 0 });
		});

		const sourceList = result.current.lists.find((l) => l.id === 1);
		const destList = result.current.lists.find((l) => l.id === 2);
		expect(sourceList?.cards).toHaveLength(0);
		expect(destList?.cards).toHaveLength(1);
		expect(destList?.cards![0].id).toBe(1);
		expect(destList?.cards![0].list_id).toBe(2);
	});
});
