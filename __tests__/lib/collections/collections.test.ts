import {
	createCollection,
	deleteCollection,
	listCollections,
	updateCollection,
} from '@/lib/collections/collections';
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

describe('lib/collections', () => {
	beforeEach(() => jest.clearAllMocks());

	describe('listCollections', () => {
		it('scopes the query to the given year and flattens the joined details', async () => {
			const rows = [
				{
					id: 1,
					date: '2026-05-10',
					work_id: 7,
					client_id: 3,
					category_id: 10,
					amount: 1000,
					works: { name: 'Obra Norte' },
					clients: { name: 'Juan', last_name: 'Perez' },
					cash_flow_categories: { name: 'Cuota' },
					payment_methods: { name: 'Transferencia' },
					bank_accounts: { name: 'Cuenta principal', bank: 'Banco Nación' },
				},
			];
			const { chain, from } = setup({ data: rows });

			const res = await listCollections({ year: 2026 });

			expect(from).toHaveBeenCalledWith('collections');
			expect(chain.gte).toHaveBeenCalledWith('date', '2026-01-01');
			expect(chain.lt).toHaveBeenCalledWith('date', '2027-01-01');
			expect(res.data?.[0]).toEqual(
				expect.objectContaining({
					work_name: 'Obra Norte',
					client_name: 'Juan Perez',
					category_name: 'Cuota',
					payment_method_name: 'Transferencia',
					bank_account_name: 'Banco Nación - Cuenta principal',
				})
			);
		});

		it('maps a null category and null bank account to null display fields', async () => {
			const rows = [
				{
					id: 2,
					work_id: null,
					client_id: 4,
					category_id: null,
					amount: 500,
					works: null,
					clients: null,
					cash_flow_categories: null,
					payment_methods: { name: 'Efectivo' },
					bank_accounts: null,
				},
			];
			setup({ data: rows });

			const res = await listCollections({ year: 2026 });

			expect(res.data?.[0]).toEqual(
				expect.objectContaining({
					work_name: null,
					client_name: '',
					category_name: null,
					payment_method_name: 'Efectivo',
					bank_account_name: null,
				})
			);
		});

		it('passes Supabase errors through', async () => {
			const err = { code: '42501', message: 'permission denied' };
			setup({ error: err });

			expect(await listCollections({ year: 2026 })).toEqual({ data: null, error: err });
		});
	});

	describe('createCollection', () => {
		it('trims receipt_number and description before inserting', async () => {
			const { chain } = setup({ data: { id: 1 } });

			await createCollection({
				date: '2026-05-10',
				receipt_number: '  R-0001  ',
				work_id: null,
				client_id: 3,
				category_id: 10,
				description: '  Cuota 1  ',
				amount: 1000,
				payment_method_id: 2,
				bank_account_id: null,
			});

			expect(chain.insert).toHaveBeenCalledWith(
				expect.objectContaining({ receipt_number: 'R-0001', description: 'Cuota 1' })
			);
		});

		it('normalizes a blank receipt_number and description to null', async () => {
			const { chain } = setup({ data: { id: 1 } });

			await createCollection({
				date: '2026-05-10',
				receipt_number: '   ',
				work_id: null,
				client_id: 3,
				category_id: null,
				description: '   ',
				amount: 1000,
				payment_method_id: 2,
				bank_account_id: null,
			});

			expect(chain.insert).toHaveBeenCalledWith(
				expect.objectContaining({ receipt_number: null, description: null })
			);
		});

		it('passes Supabase errors through', async () => {
			const err = { code: '23505', message: 'duplicate key' };
			setup({ error: err });

			const res = await createCollection({
				date: '2026-05-10',
				receipt_number: null,
				work_id: null,
				client_id: 3,
				category_id: null,
				description: null,
				amount: 1000,
				payment_method_id: 2,
				bank_account_id: null,
			});

			expect(res).toEqual({ data: null, error: err });
		});
	});

	describe('updateCollection', () => {
		it('normalizes the input and scopes the update by id', async () => {
			const { chain } = setup({ data: { id: 5 } });

			await updateCollection(5, {
				date: '2026-05-10',
				receipt_number: '  R-2  ',
				work_id: null,
				client_id: 3,
				category_id: null,
				description: null,
				amount: 2000,
				payment_method_id: 2,
				bank_account_id: 4,
			});

			expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ receipt_number: 'R-2' }));
			expect(chain.eq).toHaveBeenCalledWith('id', 5);
		});
	});

	describe('deleteCollection', () => {
		it('succeeds when the row was actually deleted', async () => {
			setup({ data: [{ id: 5 }] });

			expect(await deleteCollection(5)).toEqual({ error: null });
		});

		it('returns a blocked-by-RLS error when no row comes back (not found or no permission)', async () => {
			setup({ data: [] });

			const res = await deleteCollection(5);

			expect(res.error).toEqual({
				message: 'No se pudo eliminar el cobro (no existe o no tenés permisos)',
			});
		});

		it('passes Supabase errors through instead of the RLS guard message', async () => {
			const err = { code: '42501', message: 'permission denied' };
			setup({ error: err });

			expect(await deleteCollection(5)).toEqual({ error: err });
		});
	});
});
