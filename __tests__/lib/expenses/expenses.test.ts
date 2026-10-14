import { createExpense, deleteExpense, listExpenses, updateExpense } from '@/lib/expenses/expenses';
import { getSupabaseClient } from '@/lib/supabase-client';

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: jest.fn(),
}));

function setup(result: { data?: any; error?: any }) {
	const chain: Record<string, any> = {};
	['select', 'gte', 'lt', 'order', 'eq', 'insert', 'update', 'delete', 'single'].forEach((m) => {
		chain[m] = jest.fn(() => chain);
	});
	chain.then = (resolve: (v: any) => any) => resolve({ data: null, error: null, ...result });
	const from = jest.fn(() => chain);
	(getSupabaseClient as jest.Mock).mockReturnValue({ from });
	return { chain, from };
}

describe('lib/expenses', () => {
	beforeEach(() => jest.clearAllMocks());

	describe('listExpenses', () => {
		it('scopes the query to the given year and flattens the joined details', async () => {
			const rows = [
				{
					id: 1,
					date: '2026-05-10',
					work_id: 7,
					supplier_id: 3,
					category_id: 10,
					voucher_types: { name: 'Factura A' },
					works: { name: 'Obra Norte' },
					suppliers: { name: 'Acme SRL' },
					cash_flow_categories: { name: 'Materiales' },
				},
			];
			const { chain, from } = setup({ data: rows });

			const res = await listExpenses({ year: 2026 });

			expect(from).toHaveBeenCalledWith('expenses');
			expect(chain.gte).toHaveBeenCalledWith('date', '2026-01-01');
			expect(chain.lt).toHaveBeenCalledWith('date', '2027-01-01');
			expect(res.data?.[0]).toEqual(
				expect.objectContaining({
					voucher_type_name: 'Factura A',
					work_name: 'Obra Norte',
					supplier_name: 'Acme SRL',
					category_name: 'Materiales',
				})
			);
		});

		it('falls back to empty/null display fields when a joined relation is missing', async () => {
			const rows = [
				{
					id: 2,
					work_id: null,
					supplier_id: 4,
					voucher_types: null,
					works: null,
					suppliers: null,
					cash_flow_categories: null,
				},
			];
			setup({ data: rows });

			const res = await listExpenses({ year: 2026 });

			expect(res.data?.[0]).toEqual(
				expect.objectContaining({
					voucher_type_name: '',
					work_name: null,
					supplier_name: '',
					category_name: '',
				})
			);
		});

		it('passes Supabase errors through', async () => {
			const err = { code: '42501', message: 'permission denied' };
			setup({ error: err });

			expect(await listExpenses({ year: 2026 })).toEqual({ data: null, error: err });
		});
	});

	describe('createExpense', () => {
		it('trims voucher_number and description before inserting', async () => {
			const { chain } = setup({ data: { id: 1 } });

			await createExpense({
				date: '2026-05-10',
				voucher_number: '  B-0001  ',
				voucher_type_id: 1,
				work_id: null,
				supplier_id: 3,
				category_id: 10,
				description: '  Cemento  ',
				net_amount: 1000,
				iva_percent: 21,
				iva_amount: 210,
				total_amount: 1210,
			});

			expect(chain.insert).toHaveBeenCalledWith(
				expect.objectContaining({ voucher_number: 'B-0001', description: 'Cemento' })
			);
		});

		it('normalizes a blank voucher_number and description to null', async () => {
			const { chain } = setup({ data: { id: 1 } });

			await createExpense({
				date: '2026-05-10',
				voucher_number: '   ',
				voucher_type_id: 1,
				work_id: null,
				supplier_id: 3,
				category_id: 10,
				description: '   ',
				net_amount: 1000,
				iva_percent: 0,
				iva_amount: 0,
				total_amount: 1000,
			});

			expect(chain.insert).toHaveBeenCalledWith(
				expect.objectContaining({ voucher_number: null, description: null })
			);
		});

		it('passes Supabase errors through', async () => {
			const err = { code: '23505', message: 'duplicate key' };
			setup({ error: err });

			const res = await createExpense({
				date: '2026-05-10',
				voucher_number: null,
				voucher_type_id: 1,
				work_id: null,
				supplier_id: 3,
				category_id: 10,
				description: null,
				net_amount: 1000,
				iva_percent: 0,
				iva_amount: 0,
				total_amount: 1000,
			});

			expect(res).toEqual({ data: null, error: err });
		});
	});

	describe('updateExpense', () => {
		it('normalizes the input and scopes the update by id', async () => {
			const { chain } = setup({ data: { id: 5 } });

			await updateExpense(5, {
				date: '2026-05-10',
				voucher_number: '  C-2  ',
				voucher_type_id: 1,
				work_id: null,
				supplier_id: 3,
				category_id: 10,
				description: null,
				net_amount: 2000,
				iva_percent: 21,
				iva_amount: 420,
				total_amount: 2420,
			});

			expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ voucher_number: 'C-2' }));
			expect(chain.eq).toHaveBeenCalledWith('id', 5);
		});
	});

	describe('deleteExpense', () => {
		it('succeeds when the row was actually deleted', async () => {
			setup({ data: [{ id: 5 }] });

			expect(await deleteExpense(5)).toEqual({ error: null });
		});

		it('returns a blocked-by-RLS error when no row comes back (not found or no permission)', async () => {
			setup({ data: [] });

			const res = await deleteExpense(5);

			expect(res.error).toEqual({
				message: 'No se pudo eliminar el gasto (no existe o no tenés permisos)',
			});
		});

		it('passes Supabase errors through instead of the RLS guard message', async () => {
			const err = { code: '42501', message: 'permission denied' };
			setup({ error: err });

			expect(await deleteExpense(5)).toEqual({ error: err });
		});
	});
});
