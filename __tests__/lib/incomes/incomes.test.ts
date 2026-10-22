import { createIncome, deleteIncome, listIncomes, updateIncome } from '@/lib/incomes/incomes';
import { getSupabaseClient } from '@/lib/supabase-client';

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: jest.fn(),
}));

function setup(result: { data?: any; error?: any }) {
	const chain: Record<string, any> = {};
	['select', 'gte', 'lt', 'order', 'eq', 'insert', 'update', 'delete', 'single', 'range'].forEach(
		(m) => {
			chain[m] = jest.fn(() => chain);
		}
	);
	chain.then = (resolve: (v: any) => any) => resolve({ data: null, error: null, ...result });
	const from = jest.fn(() => chain);
	(getSupabaseClient as jest.Mock).mockReturnValue({ from });
	return { chain, from };
}

describe('lib/incomes', () => {
	beforeEach(() => jest.clearAllMocks());

	describe('listIncomes', () => {
		it('scopes the query to the given year and flattens the joined details', async () => {
			const rows = [
				{
					id: 1,
					date: '2026-05-10',
					voucher_number: 'A-0001',
					voucher_type_id: 1,
					work_id: 7,
					client_id: 3,
					category_id: 10,
					kind: 'income',
					description: 'Anticipo',
					net_amount: 1000,
					iva_percent: 21,
					iva_amount: 210,
					total_amount: 1210,
					voucher_types: { name: 'Factura A' },
					works: { name: 'Obra Norte' },
					clients: { name: 'Juan', last_name: 'Perez' },
					cash_flow_categories: { name: 'Anticipos' },
				},
			];
			const { chain, from } = setup({ data: rows });

			const res = await listIncomes({ year: 2026 });

			expect(from).toHaveBeenCalledWith('incomes');
			expect(chain.gte).toHaveBeenCalledWith('date', '2026-01-01');
			expect(chain.lt).toHaveBeenCalledWith('date', '2027-01-01');
			expect(res.data?.[0]).toEqual(
				expect.objectContaining({
					id: 1,
					voucher_type_name: 'Factura A',
					work_name: 'Obra Norte',
					client_name: 'Juan Perez',
					category_name: 'Anticipos',
				})
			);
		});

		it('falls back to empty/null display fields when a joined relation is missing', async () => {
			const rows = [
				{
					id: 2,
					work_id: null,
					client_id: 4,
					net_amount: 500,
					voucher_types: null,
					works: null,
					clients: null,
					cash_flow_categories: null,
				},
			];
			setup({ data: rows });

			const res = await listIncomes({ year: 2026 });

			expect(res.data?.[0]).toEqual(
				expect.objectContaining({
					voucher_type_name: '',
					work_name: null,
					client_name: '',
					category_name: '',
				})
			);
		});

		it('passes Supabase errors through without mapping', async () => {
			const err = { code: '42501', message: 'permission denied' };
			setup({ error: err });

			expect(await listIncomes({ year: 2026 })).toEqual({ data: null, error: err });
		});

		it('fetches a second page beyond the PostgREST 1000-row limit and returns every row', async () => {
			const makeRow = (id: number) => ({
				id,
				total_amount: 10,
				voucher_types: null,
				works: null,
				clients: null,
				cash_flow_categories: null,
			});
			const fullPage = Array.from({ length: 1000 }, (_, i) => makeRow(i + 1));
			const shortPage = [makeRow(1001), makeRow(1002)];

			const chain: Record<string, jest.Mock> = {};
			['select', 'gte', 'lt', 'order'].forEach((m) => {
				chain[m] = jest.fn(() => chain);
			});
			let call = 0;
			chain.range = jest.fn(() => chain);
			(chain as any).then = (resolve: (v: any) => any) => {
				call += 1;
				return resolve(
					call === 1 ? { data: fullPage, error: null } : { data: shortPage, error: null }
				);
			};
			const from = jest.fn(() => chain);
			(getSupabaseClient as jest.Mock).mockReturnValue({ from });

			const res = await listIncomes({ year: 2026 });

			expect(res.error).toBeNull();
			expect(res.data).toHaveLength(1002);
			expect(chain.range).toHaveBeenNthCalledWith(1, 0, 999);
			expect(chain.range).toHaveBeenNthCalledWith(2, 1000, 1999);
		});

		it('propagates an error raised on a non-first page', async () => {
			const fullPage = Array.from({ length: 1000 }, (_, i) => ({
				id: i + 1,
				total_amount: 10,
				voucher_types: null,
				works: null,
				clients: null,
				cash_flow_categories: null,
			}));
			const err = { message: 'boom' };

			const chain: Record<string, jest.Mock> = {};
			['select', 'gte', 'lt', 'order'].forEach((m) => {
				chain[m] = jest.fn(() => chain);
			});
			let call = 0;
			chain.range = jest.fn(() => chain);
			(chain as any).then = (resolve: (v: any) => any) => {
				call += 1;
				return resolve(call === 1 ? { data: fullPage, error: null } : { data: null, error: err });
			};
			const from = jest.fn(() => chain);
			(getSupabaseClient as jest.Mock).mockReturnValue({ from });

			const res = await listIncomes({ year: 2026 });

			expect(res.data).toBeNull();
			expect(res.error).toEqual(err);
		});
	});

	describe('createIncome', () => {
		it('trims voucher_number and description before inserting', async () => {
			const { chain } = setup({ data: { id: 1 } });

			await createIncome({
				date: '2026-05-10',
				voucher_number: '  A-0001  ',
				voucher_type_id: 1,
				work_id: null,
				client_id: 3,
				category_id: 10,
				description: '  Anticipo  ',
				net_amount: 1000,
				iva_percent: 21,
				iva_amount: 210,
				total_amount: 1210,
				payment_method_id: null,
				bank_account_id: null,
			});

			expect(chain.insert).toHaveBeenCalledWith(
				expect.objectContaining({ voucher_number: 'A-0001', description: 'Anticipo' })
			);
		});

		it('normalizes a blank voucher_number and description to null', async () => {
			const { chain } = setup({ data: { id: 1 } });

			await createIncome({
				date: '2026-05-10',
				voucher_number: '   ',
				voucher_type_id: 1,
				work_id: null,
				client_id: 3,
				category_id: 10,
				description: '   ',
				net_amount: 1000,
				iva_percent: 0,
				iva_amount: 0,
				total_amount: 1000,
				payment_method_id: null,
				bank_account_id: null,
			});

			expect(chain.insert).toHaveBeenCalledWith(
				expect.objectContaining({ voucher_number: null, description: null })
			);
		});

		it('passes Supabase errors through', async () => {
			const err = { code: '23505', message: 'duplicate key' };
			setup({ error: err });

			const res = await createIncome({
				date: '2026-05-10',
				voucher_number: null,
				voucher_type_id: 1,
				work_id: null,
				client_id: 3,
				category_id: 10,
				description: null,
				net_amount: 1000,
				iva_percent: 0,
				iva_amount: 0,
				total_amount: 1000,
				payment_method_id: null,
				bank_account_id: null,
			});

			expect(res).toEqual({ data: null, error: err });
		});
	});

	describe('updateIncome', () => {
		it('normalizes the input and scopes the update by id', async () => {
			const { chain } = setup({ data: { id: 5 } });

			await updateIncome(5, {
				date: '2026-05-10',
				voucher_number: '  B-2  ',
				voucher_type_id: 1,
				work_id: null,
				client_id: 3,
				category_id: 10,
				description: null,
				net_amount: 2000,
				iva_percent: 21,
				iva_amount: 420,
				total_amount: 2420,
				payment_method_id: null,
				bank_account_id: null,
			});

			expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ voucher_number: 'B-2' }));
			expect(chain.eq).toHaveBeenCalledWith('id', 5);
		});
	});

	describe('deleteIncome', () => {
		it('succeeds when the row was actually deleted', async () => {
			setup({ data: [{ id: 5 }] });

			expect(await deleteIncome(5)).toEqual({ error: null });
		});

		it('returns a blocked-by-RLS error when no row comes back (not found or no permission)', async () => {
			setup({ data: [] });

			const res = await deleteIncome(5);

			expect(res.error).toEqual({
				message: 'No se pudo eliminar el ingreso (no existe o no tenés permisos)',
			});
		});

		it('treats a null data response the same as an empty one', async () => {
			setup({ data: null });

			const res = await deleteIncome(5);

			expect(res.error).toEqual({
				message: 'No se pudo eliminar el ingreso (no existe o no tenés permisos)',
			});
		});

		it('passes Supabase errors through instead of the RLS guard message', async () => {
			const err = { code: '42501', message: 'permission denied' };
			setup({ error: err });

			expect(await deleteIncome(5)).toEqual({ error: err });
		});
	});
});
