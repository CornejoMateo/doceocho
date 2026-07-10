import { renderHook, act, waitFor } from '@testing-library/react';
import { useBoards } from '@/hooks/kanban/use-boards';
import { listBoards, createBoard, updateBoard, deleteBoard } from '@/lib/kanban/boards';
import { useAuth } from '@/components/provider/auth-provider';

jest.mock('@/components/provider/auth-provider', () => ({
	useAuth: jest.fn(),
}));

jest.mock('@/lib/kanban/boards', () => ({
	listBoards: jest.fn(),
	createBoard: jest.fn(),
	updateBoard: jest.fn(),
	deleteBoard: jest.fn(),
}));

const mockBoard = {
	id: 1,
	name: 'Test Board',
	description: null,
	color: '#fff',
	created_at: '2024-01-01',
	due_date_tolerance_yellow: 3,
	due_date_tolerance_red: 1,
};

describe('useBoards', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(useAuth as jest.Mock).mockReturnValue({
			user: { username: 'test', name: 'Test', last_name: 'User', role: 'Admin', uid: '1' },
			loading: false,
			signIn: jest.fn(),
			signOutUser: jest.fn(),
		});
	});

	it('starts with empty boards and not loading', () => {
		const { result } = renderHook(() => useBoards());
		expect(result.current.boards).toEqual([]);
		expect(result.current.loading).toBe(false);
	});

	it('fetchBoards loads boards', async () => {
		(listBoards as jest.Mock).mockResolvedValue({ data: [mockBoard], error: null });

		const { result } = renderHook(() => useBoards());

		await act(async () => {
			await result.current.fetchBoards();
		});

		expect(listBoards).toHaveBeenCalled();
		expect(result.current.boards).toEqual([mockBoard]);
		expect(result.current.loading).toBe(false);
	});

	it('fetchBoards sets error on failure', async () => {
		(listBoards as jest.Mock).mockResolvedValue({ data: null, error: { message: 'Failed' } });

		const { result } = renderHook(() => useBoards());

		await act(async () => {
			await result.current.fetchBoards();
		});

		expect(result.current.error).toBe('Failed');
		expect(result.current.boards).toEqual([]);
	});

	it('addBoard adds board to list on success', async () => {
		const newBoard = { ...mockBoard, id: 2, name: 'New Board' };
		(createBoard as jest.Mock).mockResolvedValue({ data: newBoard, error: null });

		const { result } = renderHook(() => useBoards());

		await act(async () => {
			const data = await result.current.addBoard({ name: 'New Board' });
			expect(data).toEqual(newBoard);
		});

		expect(result.current.boards).toEqual([newBoard]);
	});

	it('addBoard returns null and sets error on failure', async () => {
		(createBoard as jest.Mock).mockResolvedValue({ data: null, error: { message: 'Failed' } });

		const { result } = renderHook(() => useBoards());

		await act(async () => {
			const data = await result.current.addBoard({ name: 'Board' });
			expect(data).toBeNull();
		});

		expect(result.current.error).toBe('Failed');
	});

	it('editBoard updates board in list on success', async () => {
		(listBoards as jest.Mock).mockResolvedValue({ data: [mockBoard], error: null });
		const updated = { ...mockBoard, name: 'Updated' };
		(updateBoard as jest.Mock).mockResolvedValue({ data: updated, error: null });

		const { result } = renderHook(() => useBoards());

		await act(async () => {
			await result.current.fetchBoards();
		});

		await act(async () => {
			const data = await result.current.editBoard(1, { name: 'Updated' });
			expect(data).toEqual(updated);
		});

		expect(result.current.boards[0].name).toBe('Updated');
	});

	it('editBoard sets error on failure', async () => {
		(listBoards as jest.Mock).mockResolvedValue({ data: [mockBoard], error: null });
		(updateBoard as jest.Mock).mockResolvedValue({ data: null, error: { message: 'Failed' } });

		const { result } = renderHook(() => useBoards());

		await act(async () => {
			await result.current.fetchBoards();
		});

		await act(async () => {
			const data = await result.current.editBoard(1, { name: 'Updated' });
			expect(data).toBeNull();
		});

		expect(result.current.error).toBe('Failed');
	});

	it('removeBoard removes board from list on success', async () => {
		(listBoards as jest.Mock).mockResolvedValue({ data: [mockBoard], error: null });
		(deleteBoard as jest.Mock).mockResolvedValue({ error: null });

		const { result } = renderHook(() => useBoards());

		await act(async () => {
			await result.current.fetchBoards();
		});

		expect(result.current.boards).toHaveLength(1);

		await act(async () => {
			await result.current.removeBoard(1);
		});

		expect(result.current.boards).toEqual([]);
	});

	it('removeBoard sets error on failure', async () => {
		(listBoards as jest.Mock).mockResolvedValue({ data: [mockBoard], error: null });
		(deleteBoard as jest.Mock).mockResolvedValue({ error: { message: 'Failed' } });

		const { result } = renderHook(() => useBoards());

		await act(async () => {
			await result.current.fetchBoards();
		});

		await act(async () => {
			await result.current.removeBoard(1);
		});

		expect(result.current.error).toBe('Failed');
		expect(result.current.boards).toHaveLength(1);
	});
});
