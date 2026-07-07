import { renderHook, act, waitFor } from '@testing-library/react';
import { useCards } from '@/hooks/kanban/use-cards';
import {
	getCardsByListId,
	createCard,
	updateCard,
	moveCard,
	updateCardPosition,
	deleteCard,
} from '@/lib/kanban/cards';

jest.mock('@/lib/kanban/cards', () => ({
	getCardsByListId: jest.fn(),
	createCard: jest.fn(),
	updateCard: jest.fn(),
	moveCard: jest.fn(),
	updateCardPosition: jest.fn(),
	deleteCard: jest.fn(),
}));

const mockCard = {
	id: 1,
	created_at: '2024-01-01',
	list_id: 1,
	title: 'Test Card',
	description: null,
	position: 0,
	due_date: null,
	priority: 'none' as const,
	completed_at: null,
	color: null,
};

describe('useCards', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('fetches cards on mount', async () => {
		(getCardsByListId as jest.Mock).mockResolvedValue({ data: [mockCard], error: null });

		const { result } = renderHook(() => useCards(1));

		expect(result.current.loading).toBe(true);

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		expect(getCardsByListId).toHaveBeenCalledWith(1);
		expect(result.current.cards).toEqual([mockCard]);
	});

	it('does not fetch when listId is null', () => {
		const { result } = renderHook(() => useCards(null));

		expect(getCardsByListId).not.toHaveBeenCalled();
		expect(result.current.cards).toEqual([]);
	});

	it('sets error on fetch failure', async () => {
		(getCardsByListId as jest.Mock).mockResolvedValue({ data: null, error: { message: 'Failed' } });

		const { result } = renderHook(() => useCards(1));

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		expect(result.current.error).toBe('Failed');
		expect(result.current.cards).toEqual([]);
	});

	it('addCard appends card on success', async () => {
		(getCardsByListId as jest.Mock).mockResolvedValue({ data: [], error: null });
		const newCard = { ...mockCard, id: 2, title: 'New Card' };
		(createCard as jest.Mock).mockResolvedValue({ data: newCard, error: null });

		const { result } = renderHook(() => useCards(1));

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		await act(async () => {
			const data = await result.current.addCard({ title: 'New Card' });
			expect(data).toEqual(newCard);
		});

		expect(result.current.cards).toEqual([newCard]);
	});

	it('addCard returns null when listId is null', async () => {
		const { result } = renderHook(() => useCards(null));

		await act(async () => {
			const data = await result.current.addCard({ title: 'Card' });
			expect(data).toBeNull();
		});

		expect(createCard).not.toHaveBeenCalled();
	});

	it('editCard updates card in state on success', async () => {
		(getCardsByListId as jest.Mock).mockResolvedValue({ data: [mockCard], error: null });
		const updated = { ...mockCard, title: 'Updated' };
		(updateCard as jest.Mock).mockResolvedValue({ data: updated, error: null });

		const { result } = renderHook(() => useCards(1));

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		await act(async () => {
			const data = await result.current.editCard(1, { title: 'Updated' });
			expect(data).toEqual(updated);
		});

		expect(result.current.cards[0].title).toBe('Updated');
	});

	it('moveCardToList removes card from current list', async () => {
		(getCardsByListId as jest.Mock).mockResolvedValue({ data: [mockCard], error: null });
		(moveCard as jest.Mock).mockResolvedValue({ data: {}, error: null });

		const { result } = renderHook(() => useCards(1));

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		await act(async () => {
			const res = await result.current.moveCard(1, 2, 0);
			expect(res.data).toEqual({});
		});

		expect(moveCard).toHaveBeenCalledWith(1, 2, 0);
		expect(result.current.cards).toEqual([]);
	});

	it('updatePosition updates and sorts cards', async () => {
		const card2 = { ...mockCard, id: 2, position: 1 };
		(getCardsByListId as jest.Mock).mockResolvedValue({ data: [mockCard, card2], error: null });
		const movedCard = { ...mockCard, position: 2 };
		(updateCardPosition as jest.Mock).mockResolvedValue({ data: movedCard, error: null });

		const { result } = renderHook(() => useCards(1));

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		await act(async () => {
			const res = await result.current.updatePosition(1, 2);
			expect(res.data).toEqual(movedCard);
		});

		expect(updateCardPosition).toHaveBeenCalledWith(1, 2);
	});

	it('removeCard removes card from state on success', async () => {
		(getCardsByListId as jest.Mock).mockResolvedValue({ data: [mockCard], error: null });
		(deleteCard as jest.Mock).mockResolvedValue({ error: null });

		const { result } = renderHook(() => useCards(1));

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		await act(async () => {
			await result.current.removeCard(1);
		});

		expect(deleteCard).toHaveBeenCalledWith(1);
		expect(result.current.cards).toEqual([]);
	});

	it('removeCard sets error on failure', async () => {
		(getCardsByListId as jest.Mock).mockResolvedValue({ data: [mockCard], error: null });
		(deleteCard as jest.Mock).mockResolvedValue({ error: { message: 'Failed' } });

		const { result } = renderHook(() => useCards(1));

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		await act(async () => {
			await result.current.removeCard(1);
		});

		expect(result.current.error).toBe('Failed');
		expect(result.current.cards).toHaveLength(1);
	});
});
