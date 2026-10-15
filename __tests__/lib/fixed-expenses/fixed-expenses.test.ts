import {
	listFixedExpenses,
	createFixedExpense,
	deactivateFixedExpense,
	reactivateFixedExpense,
} from '@/lib/fixed-expenses/fixed-expenses';
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

describe('lib/fixed-expenses', () => {
	beforeEach(() => jest.clearAllMocks());

	describe('listFixedExpenses', () => {
		it('flattens the joined category into a category_name field', async () => {
			const rows = [
				{
					id: 1,
					category_id: 10,
					description: 'Alquiler',
					cash_flow_categories: { name: 'Alquiler oficina' },
				},
			];
			const { from } = setup({ data: rows });
			const res = await listFixedExpenses();
			expect(from).toHaveBeenCalledWith('fixed_expenses');
			expect(res).toEqual({
				data: [
					{ id: 1, category_id: 10, description: 'Alquiler', category_name: 'Alquiler oficina' },
				],
				error: null,
			});
		});

		it('passes Supabase errors through', async () => {
			const err = { code: '42501', message: 'permission denied' };
			setup({ error: err });
			expect(await listFixedExpenses()).toEqual({ data: null, error: err });
		});
	});

	describe('createFixedExpense', () => {
		it('trims the description before inserting', async () => {
			const { chain } = setup({ data: { id: 1 } });
			await createFixedExpense({ category_id: 2, amount: 1000, description: '  Alquiler  ' });
			expect(chain.insert).toHaveBeenCalledWith({
				category_id: 2,
				amount: 1000,
				description: 'Alquiler',
			});
		});
	});

	describe('deactivateFixedExpense', () => {
		it('sets is_active to false', async () => {
			const { chain } = setup({ data: { id: 5, is_active: false } });
			await deactivateFixedExpense(5);
			expect(chain.update).toHaveBeenCalledWith({ is_active: false });
			expect(chain.eq).toHaveBeenCalledWith('id', 5);
		});
	});

	describe('reactivateFixedExpense', () => {
		it('sets is_active to true', async () => {
			const { chain } = setup({ data: { id: 5, is_active: true } });
			await reactivateFixedExpense(5);
			expect(chain.update).toHaveBeenCalledWith({ is_active: true });
			expect(chain.eq).toHaveBeenCalledWith('id', 5);
		});
	});
});
