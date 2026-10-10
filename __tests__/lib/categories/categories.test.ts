import {
	listCategories,
	createCategory,
	updateCategory,
	deactivateCategory,
	reactivateCategory,
} from '@/lib/categories/categories';
import { getSupabaseClient } from '@/lib/supabase-client';

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: jest.fn(),
}));

function setup(result: { data?: any; error?: any }) {
	const chain: Record<string, any> = {};
	['select', 'order', 'eq', 'insert', 'update', 'single'].forEach((m) => {
		chain[m] = jest.fn(() => chain);
	});
	chain.then = (resolve: (v: any) => any) => resolve({ data: null, error: null, ...result });
	const from = jest.fn(() => chain);
	(getSupabaseClient as jest.Mock).mockReturnValue({ from });
	return { chain, from };
}

describe('lib/categories', () => {
	beforeEach(() => jest.clearAllMocks());

	describe('listCategories', () => {
		it('filters by kind and orders by name', async () => {
			const rows = [{ id: 1, kind: 'income' }];
			const { chain, from } = setup({ data: rows });
			const res = await listCategories('income');
			expect(from).toHaveBeenCalledWith('cash_flow_categories');
			expect(chain.eq).toHaveBeenCalledWith('kind', 'income');
			expect(chain.order).toHaveBeenCalledWith('name', { ascending: true });
			expect(res).toEqual({ data: rows, error: null });
		});

		it('passes Supabase errors through', async () => {
			const err = { code: '42501', message: 'permission denied' };
			setup({ error: err });
			expect((await listCategories('expense')).error).toBe(err);
		});
	});

	describe('createCategory', () => {
		it('trims the name and sends the kind', async () => {
			const { chain } = setup({ data: { id: 1 } });
			await createCategory({ name: '  Transporte  ', kind: 'expense' });
			expect(chain.insert).toHaveBeenCalledWith({ name: 'Transporte', kind: 'expense' });
		});

		it('passes Supabase errors through', async () => {
			const err = { code: '23502', message: 'not-null violation' };
			setup({ error: err });
			const res = await createCategory({ name: 'Ventas', kind: 'income' });
			expect(res.error).toBe(err);
		});
	});

	describe('updateCategory', () => {
		it('trims the name and updates by id', async () => {
			const { chain } = setup({ data: { id: 3 } });
			await updateCategory(3, { name: '  Ventas  ' });
			expect(chain.update).toHaveBeenCalledWith({ name: 'Ventas' });
			expect(chain.eq).toHaveBeenCalledWith('id', 3);
		});
	});

	describe('deactivateCategory', () => {
		it('sets is_active to false', async () => {
			const { chain } = setup({ data: { id: 5, is_active: false } });
			await deactivateCategory(5);
			expect(chain.update).toHaveBeenCalledWith({ is_active: false });
			expect(chain.eq).toHaveBeenCalledWith('id', 5);
		});
	});

	describe('reactivateCategory', () => {
		it('sets is_active to true', async () => {
			const { chain } = setup({ data: { id: 5, is_active: true } });
			await reactivateCategory(5);
			expect(chain.update).toHaveBeenCalledWith({ is_active: true });
			expect(chain.eq).toHaveBeenCalledWith('id', 5);
		});
	});
});
