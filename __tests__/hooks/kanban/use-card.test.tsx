import { renderHook, act, waitFor } from '@testing-library/react';
import { useCard } from '@/hooks/kanban/use-card';
import { getCardWithRelations, updateCard, deleteCard } from '@/lib/kanban/cards';
import { uploadKanbanFile, deleteKanbanFile } from '@/lib/kanban/files';

jest.mock('@/lib/kanban/cards', () => ({
	getCardWithRelations: jest.fn(),
	updateCard: jest.fn(),
	deleteCard: jest.fn(),
}));

jest.mock('@/lib/kanban/files', () => ({
	uploadKanbanFile: jest.fn(),
	deleteKanbanFile: jest.fn(),
}));

const mockCard = {
	id: 1,
	created_at: '2024-01-01',
	list_id: 1,
	title: 'Test Card',
	description: 'A description',
	position: 0,
	due_date: null,
	priority: 'none',
	completed_at: null,
	color: null,
	files: [],
	list: { id: 1, name: 'To Do' },
};

describe('useCard', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('fetches card on mount', async () => {
		(getCardWithRelations as jest.Mock).mockResolvedValue({ data: mockCard, error: null });

		const { result } = renderHook(() => useCard(1));

		expect(result.current.loading).toBe(true);

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		expect(getCardWithRelations).toHaveBeenCalledWith(1);
		expect(result.current.card).toEqual(mockCard);
	});

	it('does not fetch when cardId is null', () => {
		const { result } = renderHook(() => useCard(null));

		expect(getCardWithRelations).not.toHaveBeenCalled();
		expect(result.current.card).toBeNull();
	});

	it('handles fetch error', async () => {
		(getCardWithRelations as jest.Mock).mockResolvedValue({
			data: null,
			error: { message: 'Not found' },
		});

		const { result } = renderHook(() => useCard(1));

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		expect(result.current.error).toBe('Not found');
		expect(result.current.card).toBeNull();
	});

	it('updates card info', async () => {
		(getCardWithRelations as jest.Mock).mockResolvedValue({ data: mockCard, error: null });
		(updateCard as jest.Mock).mockResolvedValue({
			data: { ...mockCard, title: 'Updated' },
			error: null,
		});

		const { result } = renderHook(() => useCard(1));

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		await act(async () => {
			await result.current.updateCard({ title: 'Updated' });
		});

		expect(updateCard).toHaveBeenCalledWith(1, { title: 'Updated' });
		expect(result.current.card?.title).toBe('Updated');
	});

	it('does not call updateCard when cardId is null', async () => {
		(getCardWithRelations as jest.Mock).mockResolvedValue({ data: null, error: null });
		(updateCard as jest.Mock).mockResolvedValue({ data: null, error: null });

		const { result } = renderHook(() => useCard(null));

		await act(async () => {
			const data = await result.current.updateCard({ title: 'Updated' });
			expect(data).toBeNull();
		});

		expect(updateCard).not.toHaveBeenCalled();
	});

	it('uploads a file and refetches', async () => {
		(getCardWithRelations as jest.Mock).mockResolvedValue({ data: mockCard, error: null });
		(uploadKanbanFile as jest.Mock).mockResolvedValue({
			data: { id: 1, path: '1/file.pdf', displayName: 'File' },
			error: null,
		});

		const { result } = renderHook(() => useCard(1));

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		const file = new File(['test'], 'doc.pdf', { type: 'application/pdf' });

		await act(async () => {
			await result.current.uploadFile(file, 'My File');
		});

		expect(uploadKanbanFile).toHaveBeenCalledWith(1, file, 'My File');
		expect(getCardWithRelations).toHaveBeenCalledTimes(2);
	});

	it('returns error when uploading without cardId', async () => {
		const { result } = renderHook(() => useCard(null));

		const file = new File(['test'], 'doc.pdf', { type: 'application/pdf' });

		await act(async () => {
			const res = await result.current.uploadFile(file);
			expect(res.error).toBe('No card ID provided');
		});
	});

	it('removes an attachment and refetches', async () => {
		(getCardWithRelations as jest.Mock).mockResolvedValue({ data: mockCard, error: null });
		(deleteKanbanFile as jest.Mock).mockResolvedValue({ success: true, error: null });

		const { result } = renderHook(() => useCard(1));

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		await act(async () => {
			await result.current.removeAttachment(1);
		});

		expect(deleteKanbanFile).toHaveBeenCalledWith(1);
		expect(getCardWithRelations).toHaveBeenCalledTimes(2);
	});

	it('removes a card', async () => {
		(getCardWithRelations as jest.Mock).mockResolvedValue({ data: mockCard, error: null });
		(deleteCard as jest.Mock).mockResolvedValue({ data: null, error: null });

		const { result } = renderHook(() => useCard(1));

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		await act(async () => {
			await result.current.removeCard();
		});

		expect(deleteCard).toHaveBeenCalledWith(1);
	});

	it('does not call deleteCard when cardId is null', async () => {
		const { result } = renderHook(() => useCard(null));

		await act(async () => {
			await result.current.removeCard();
		});

		expect(deleteCard).not.toHaveBeenCalled();
	});
});
