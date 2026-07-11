import {
	getCardsByListId,
	getCardById,
	getCardWithRelations,
	createCard,
	updateCard,
	moveCard,
	updateCardPosition,
	deleteCard,
	completeCard,
	uncompleteCard,
} from '@/lib/kanban/cards';
import { getSupabaseClient } from '@/lib/supabase-client';
import { getKanbanFileByCardId, deleteKanbanFile } from '@/lib/kanban/files';

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: jest.fn(),
}));

jest.mock('@/lib/kanban/files', () => ({
	getKanbanFileByCardId: jest.fn(),
	deleteKanbanFile: jest.fn(),
}));

function createSupabaseMock() {
	const chain: Record<string, jest.Mock> = {
		select: jest.fn(() => chain),
		order: jest.fn(() => chain),
		eq: jest.fn(() => chain),
		insert: jest.fn(() => chain),
		update: jest.fn(() => chain),
		delete: jest.fn(() => chain),
		single: jest.fn(() => chain),
		limit: jest.fn(() => chain),
		in: jest.fn(() => chain),
	};

	const supabase = {
		from: jest.fn(() => chain),
	};

	return { supabase, chain };
}

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
};

const mockList = { id: 1, name: 'To Do' };

const mockFiles = [
	{ id: 1, uploaded_at: '2024-01-01', path: '1/doc.pdf', kanban_card_id: 1, displayName: 'Doc' },
];

describe('kanban cards lib', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getCardsByListId', () => {
		it('returns cards for a list', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const promise = Promise.resolve({ data: [mockCard], error: null });
			chain.select.mockReturnValue(chain);
			chain.eq.mockReturnValue(chain);
			chain.order.mockReturnValue(promise);

			const result = await getCardsByListId(1);

			expect(supabase.from).toHaveBeenCalledWith('kanban_cards');
			expect(chain.select).toHaveBeenCalledWith('*');
			expect(chain.eq).toHaveBeenCalledWith('list_id', 1);
			expect(chain.order).toHaveBeenCalledWith('position', { ascending: true });
			expect(result.data).toEqual([mockCard]);
		});

		it('returns error', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const promise = Promise.resolve({ data: null, error: new Error('DB error') });
			chain.select.mockReturnValue(chain);
			chain.eq.mockReturnValue(chain);
			chain.order.mockReturnValue(promise);

			const result = await getCardsByListId(1);
			expect(result.data).toBeNull();
			expect(result.error).toEqual(new Error('DB error'));
		});
	});

	describe('getCardById', () => {
		it('returns a card', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const promise = Promise.resolve({ data: mockCard, error: null });
			chain.select.mockReturnValue(chain);
			chain.eq.mockReturnValue(chain);
			chain.single.mockReturnValue(promise);

			const result = await getCardById(1);

			expect(supabase.from).toHaveBeenCalledWith('kanban_cards');
			expect(chain.select).toHaveBeenCalledWith('*');
			expect(chain.eq).toHaveBeenCalledWith('id', 1);
			expect(result.data).toEqual(mockCard);
		});

		it('returns error', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const promise = Promise.resolve({ data: null, error: new Error('Not found') });
			chain.select.mockReturnValue(chain);
			chain.eq.mockReturnValue(chain);
			chain.single.mockReturnValue(promise);

			const result = await getCardById(999);
			expect(result.data).toBeNull();
			expect(result.error).toEqual(new Error('Not found'));
		});
	});

	describe('getCardWithRelations', () => {
		it('returns card with list and files', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const dbResult = {
				...mockCard,
				list: mockList,
				files: mockFiles,
			};

			const promise = Promise.resolve({ data: dbResult, error: null });
			chain.select.mockReturnValue(chain);
			chain.eq.mockReturnValue(chain);
			chain.single.mockReturnValue(promise);

			(getKanbanFileByCardId as jest.Mock).mockResolvedValue({ data: mockFiles, error: null });

			const result = await getCardWithRelations(1);

			expect(chain.select).toHaveBeenCalledWith(expect.stringContaining('*'));
			expect(chain.select).toHaveBeenCalledWith(expect.stringContaining('kanban_lists'));
			expect(getKanbanFileByCardId).toHaveBeenCalledWith(1);
			expect(result.data).toEqual({
				...dbResult,
				files: mockFiles,
			});
		});

		it('returns error from supabase', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			chain.select.mockReturnValue(chain);
			chain.eq.mockReturnValue(chain);
			chain.single.mockResolvedValue(Promise.resolve({ data: null, error: new Error('DB error') }));

			const result = await getCardWithRelations(1);

			expect(result.data).toBeNull();
			expect(result.error).toEqual(new Error('DB error'));
		});

		it('handles missing files gracefully', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const dbResult = { ...mockCard, list: mockList, files: [] };
			const promise = Promise.resolve({ data: dbResult, error: null });
			chain.select.mockReturnValue(chain);
			chain.eq.mockReturnValue(chain);
			chain.single.mockReturnValue(promise);

			(getKanbanFileByCardId as jest.Mock).mockResolvedValue({ data: null, error: 'Some error' });

			const result = await getCardWithRelations(1);

			expect(result.data?.files).toEqual([]);
		});
	});

	describe('createCard', () => {
		it('creates a card at position 0 when no cards exist', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const maxPosPromise = Promise.resolve({ data: null, error: null });
			chain.select.mockReturnValue(chain);
			chain.eq.mockReturnValue(chain);
			chain.order.mockReturnValue(chain);
			chain.limit.mockReturnValue(chain);
			chain.single.mockResolvedValueOnce(maxPosPromise);

			const insertPromise = Promise.resolve({ data: { ...mockCard, position: 0 }, error: null });
			chain.insert.mockReturnValue(chain);
			chain.select.mockReturnValue(chain);
			chain.single.mockResolvedValueOnce(insertPromise);

			const result = await createCard({ title: 'New Card' }, 1);

			expect(chain.insert).toHaveBeenCalledWith({
				title: 'New Card',
				list_id: 1,
				position: 0,
			});
			expect(result.data?.position).toBe(0);
		});

		it('creates a card at next position', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const maxPosPromise = Promise.resolve({ data: { position: 5 }, error: null });
			chain.select.mockReturnValue(chain);
			chain.eq.mockReturnValue(chain);
			chain.order.mockReturnValue(chain);
			chain.limit.mockReturnValue(chain);
			chain.single.mockResolvedValueOnce(maxPosPromise);

			const insertPromise = Promise.resolve({ data: { ...mockCard, position: 6 }, error: null });
			chain.insert.mockReturnValue(chain);
			chain.select.mockReturnValue(chain);
			chain.single.mockResolvedValueOnce(insertPromise);

			const result = await createCard({ title: 'New Card' }, 1);

			expect(chain.insert).toHaveBeenCalledWith({
				title: 'New Card',
				list_id: 1,
				position: 6,
			});
		});

		it('returns error on insert failure', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			chain.select.mockReturnValue(chain);
			chain.eq.mockReturnValue(chain);
			chain.order.mockReturnValue(chain);
			chain.limit.mockReturnValue(chain);
			chain.single.mockResolvedValueOnce(Promise.resolve({ data: null, error: null }));

			chain.insert.mockReturnValue(chain);
			chain.select.mockReturnValue(chain);
			chain.single.mockResolvedValueOnce(
				Promise.resolve({ data: null, error: new Error('Insert error') })
			);

			const result = await createCard({ title: 'New Card' }, 1);
			expect(result.data).toBeNull();
			expect(result.error).toEqual(new Error('Insert error'));
		});
	});

	describe('updateCard', () => {
		it('updates a card', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const updated = { ...mockCard, title: 'Updated' };
			const promise = Promise.resolve({ data: updated, error: null });
			chain.update.mockReturnValue(chain);
			chain.eq.mockReturnValue(chain);
			chain.select.mockReturnValue(chain);
			chain.single.mockReturnValue(promise);

			const result = await updateCard(1, { title: 'Updated' });

			expect(chain.update).toHaveBeenCalledWith({ title: 'Updated' });
			expect(chain.eq).toHaveBeenCalledWith('id', 1);
			expect(result.data?.title).toBe('Updated');
		});

		it('returns error', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			chain.update.mockReturnValue(chain);
			chain.eq.mockReturnValue(chain);
			chain.select.mockReturnValue(chain);
			chain.single.mockResolvedValue(
				Promise.resolve({ data: null, error: new Error('Update error') })
			);

			const result = await updateCard(1, { title: 'Updated' });
			expect(result.error).toEqual(new Error('Update error'));
		});
	});

	describe('moveCard', () => {
		it('moves card to new position in same list', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			chain.select.mockReturnValue(chain);
			chain.eq.mockReturnValue(chain);
			chain.in = jest.fn(() => chain);
			chain.order = jest.fn(() => chain);

			// First single: get current card
			chain.single.mockResolvedValueOnce(
				Promise.resolve({ data: { id: 1, list_id: 1, position: 0 }, error: null })
			);

			// in().order(): get all cards
			const inPromise = Promise.resolve({
				data: [
					{ id: 1, list_id: 1, position: 0 },
					{ id: 2, list_id: 1, position: 1 },
					{ id: 3, list_id: 1, position: 2 },
				],
				error: null,
			});
			chain.in.mockReturnValue(chain);
			chain.order.mockReturnValue(inPromise);

			// Two updates needed
			chain.update.mockReturnValue(chain);
			chain.eq.mockReturnValue(Promise.resolve({ error: null }));

			// Final select
			const finalPromise = Promise.resolve({
				data: { ...mockCard, list_id: 1, position: 2 },
				error: null,
			});
			chain.select.mockReturnValue(chain);
			chain.eq.mockReturnValue(chain);
			chain.single.mockResolvedValueOnce(finalPromise);

			const result = await moveCard(1, 1, 2);

			expect(result.data?.position).toBe(2);
		});

		it('moves card to another list', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			chain.select.mockReturnValue(chain);
			chain.eq.mockReturnValue(chain);
			chain.in = jest.fn(() => chain);
			chain.order = jest.fn(() => chain);

			chain.single.mockResolvedValueOnce(
				Promise.resolve({ data: { id: 1, list_id: 1, position: 0 }, error: null })
			);

			const inPromise = Promise.resolve({
				data: [
					{ id: 1, list_id: 1, position: 0 },
					{ id: 2, list_id: 2, position: 0 },
				],
				error: null,
			});
			chain.in.mockReturnValue(chain);
			chain.order.mockReturnValue(inPromise);

			chain.update.mockReturnValue(chain);
			chain.eq.mockReturnValue(Promise.resolve({ error: null }));

			const finalPromise = Promise.resolve({
				data: { ...mockCard, list_id: 2, position: 0 },
				error: null,
			});
			chain.select.mockReturnValue(chain);
			chain.eq.mockReturnValue(chain);
			chain.single.mockResolvedValueOnce(finalPromise);

			const result = await moveCard(1, 2, 0);

			expect(result.data?.list_id).toBe(2);
		});

		it('returns null when position unchanged', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			chain.select.mockReturnValue(chain);
			chain.eq.mockReturnValue(chain);
			chain.single.mockResolvedValueOnce(
				Promise.resolve({ data: { id: 1, list_id: 1, position: 0 }, error: null })
			);

			const result = await moveCard(1, 1, 0);

			expect(result.data).toBeNull();
			expect(result.error).toBeNull();
		});

		it('returns error on fetch failure', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			chain.select.mockReturnValue(chain);
			chain.eq.mockReturnValue(chain);
			chain.single.mockResolvedValueOnce(
				Promise.resolve({ data: null, error: new Error('Fetch error') })
			);

			const result = await moveCard(1, 2, 0);

			expect(result.data).toBeNull();
			expect(result.error).toEqual(new Error('Fetch error'));
		});
	});

	describe('updateCardPosition', () => {
		it('updates position', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const promise = Promise.resolve({ data: { ...mockCard, position: 5 }, error: null });
			chain.update.mockReturnValue(chain);
			chain.eq.mockReturnValue(chain);
			chain.select.mockReturnValue(chain);
			chain.single.mockReturnValue(promise);

			const result = await updateCardPosition(1, 5);

			expect(chain.update).toHaveBeenCalledWith({ position: 5 });
			expect(result.data?.position).toBe(5);
		});
	});

	describe('deleteCard', () => {
		it('deletes card and its attachments', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			(getKanbanFileByCardId as jest.Mock).mockResolvedValue({ data: mockFiles, error: null });
			(deleteKanbanFile as jest.Mock).mockResolvedValue({ success: true, error: null });

			chain.delete.mockReturnValue(chain);
			chain.eq.mockResolvedValue(Promise.resolve({ error: null }));

			const result = await deleteCard(1);

			expect(getKanbanFileByCardId).toHaveBeenCalledWith(1);
			expect(deleteKanbanFile).toHaveBeenCalledWith(1);
			expect(chain.delete).toHaveBeenCalled();
			expect(chain.eq).toHaveBeenCalledWith('id', 1);
			expect(result.data).toBeNull();
			expect(result.error).toBeNull();
		});

		it('returns error when getKanbanFileByCardId fails', async () => {
			(getKanbanFileByCardId as jest.Mock).mockResolvedValue({
				data: null,
				error: new Error('Fetch error'),
			});

			const result = await deleteCard(1);

			expect(result.data).toBeNull();
			expect(result.error).toEqual(new Error('Fetch error'));
		});

		it('returns error when deleteKanbanFile fails', async () => {
			(getKanbanFileByCardId as jest.Mock).mockResolvedValue({ data: mockFiles, error: null });
			(deleteKanbanFile as jest.Mock).mockResolvedValue({
				success: false,
				error: new Error('Delete error'),
			});

			const result = await deleteCard(1);

			expect(result.data).toBeNull();
			expect(result.error).toEqual(new Error('Delete error'));
		});
	});

	describe('completeCard', () => {
		it('completes a card', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const completed = { ...mockCard, completed_at: expect.any(String) };
			const promise = Promise.resolve({ data: completed, error: null });
			chain.update.mockReturnValue(chain);
			chain.eq.mockReturnValue(chain);
			chain.select.mockReturnValue(chain);
			chain.single.mockReturnValue(promise);

			const result = await completeCard(1);

			expect(chain.update).toHaveBeenCalledWith({ completed_at: expect.any(String) });
			expect(result.data).toEqual(completed);
		});
	});

	describe('uncompleteCard', () => {
		it('uncompletes a card', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const uncompleted = { ...mockCard, completed_at: null };
			const promise = Promise.resolve({ data: uncompleted, error: null });
			chain.update.mockReturnValue(chain);
			chain.eq.mockReturnValue(chain);
			chain.select.mockReturnValue(chain);
			chain.single.mockReturnValue(promise);

			const result = await uncompleteCard(1);

			expect(chain.update).toHaveBeenCalledWith({ completed_at: null });
			expect(result.data).toEqual(uncompleted);
		});
	});
});
