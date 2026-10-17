import { createPayment, deletePayment, listPayments, updatePayment } from '@/lib/payments/payments';
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

describe('lib/payments', () => {
	beforeEach(() => jest.clearAllMocks());

	describe('listPayments', () => {
		it('scopes the query to the given year and flattens the joined details', async () => {
			const rows = [
				{
					id: 1,
					date: '2026-05-10',
					work_id: 7,
					category_id: 10,
					amount: 1000,
					works: { name: 'Obra Norte' },
					cash_flow_categories: { name: 'Materiales' },
					payment_methods: { name: 'Transferencia' },
					bank_accounts: { name: 'Cuenta principal', bank: 'Banco Nación' },
				},
			];
			const { chain, from } = setup({ data: rows });

			const res = await listPayments({ year: 2026 });

			expect(from).toHaveBeenCalledWith('payments');
			expect(chain.gte).toHaveBeenCalledWith('date', '2026-01-01');
			expect(chain.lt).toHaveBeenCalledWith('date', '2027-01-01');
			expect(res.data?.[0]).toEqual(
				expect.objectContaining({
					work_name: 'Obra Norte',
					category_name: 'Materiales',
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
					category_id: null,
					amount: 500,
					works: null,
					cash_flow_categories: null,
					payment_methods: { name: 'Efectivo' },
					bank_accounts: null,
				},
			];
			setup({ data: rows });

			const res = await listPayments({ year: 2026 });

			expect(res.data?.[0]).toEqual(
				expect.objectContaining({
					work_name: null,
					category_name: null,
					payment_method_name: 'Efectivo',
					bank_account_name: null,
				})
			);
		});

		it('passes Supabase errors through', async () => {
			const err = { code: '42501', message: 'permission denied' };
			setup({ error: err });

			expect(await listPayments({ year: 2026 })).toEqual({ data: null, error: err });
		});

		it('fetches a second page beyond the PostgREST 1000-row limit and returns every row', async () => {
			const makeRow = (id: number) => ({
				id,
				amount: 10,
				works: null,
				cash_flow_categories: null,
				payment_methods: null,
				bank_accounts: null,
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

			const res = await listPayments({ year: 2026 });

			expect(res.error).toBeNull();
			expect(res.data).toHaveLength(1002);
			expect(chain.range).toHaveBeenNthCalledWith(1, 0, 999);
			expect(chain.range).toHaveBeenNthCalledWith(2, 1000, 1999);
		});

		it('propagates an error raised on a non-first page', async () => {
			const fullPage = Array.from({ length: 1000 }, (_, i) => ({
				id: i + 1,
				amount: 10,
				works: null,
				cash_flow_categories: null,
				payment_methods: null,
				bank_accounts: null,
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

			const res = await listPayments({ year: 2026 });

			expect(res.data).toBeNull();
			expect(res.error).toEqual(err);
		});
	});

	describe('createPayment', () => {
		it('trims receipt_number and description before inserting', async () => {
			const { chain } = setup({ data: { id: 1 } });

			await createPayment({
				date: '2026-05-10',
				receipt_number: '  R-0001  ',
				work_id: null,
				category_id: 10,
				description: '  Cemento  ',
				amount: 1000,
				payment_method_id: 2,
				bank_account_id: null,
			});

			expect(chain.insert).toHaveBeenCalledWith(
				expect.objectContaining({ receipt_number: 'R-0001', description: 'Cemento' })
			);
		});

		it('normalizes a blank receipt_number and description to null', async () => {
			const { chain } = setup({ data: { id: 1 } });

			await createPayment({
				date: '2026-05-10',
				receipt_number: '   ',
				work_id: null,
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

			const res = await createPayment({
				date: '2026-05-10',
				receipt_number: null,
				work_id: null,
				category_id: null,
				description: null,
				amount: 1000,
				payment_method_id: 2,
				bank_account_id: null,
			});

			expect(res).toEqual({ data: null, error: err });
		});
	});

	describe('updatePayment', () => {
		it('normalizes the input and scopes the update by id', async () => {
			const { chain } = setup({ data: { id: 5 } });

			await updatePayment(5, {
				date: '2026-05-10',
				receipt_number: '  R-2  ',
				work_id: null,
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

	describe('deletePayment', () => {
		it('succeeds when the row was actually deleted', async () => {
			setup({ data: [{ id: 5 }] });

			expect(await deletePayment(5)).toEqual({ error: null });
		});

		it('returns a blocked-by-RLS error when no row comes back (not found or no permission)', async () => {
			setup({ data: [] });

			const res = await deletePayment(5);

			expect(res.error).toEqual({
				message: 'No se pudo eliminar el pago (no existe o no tenés permisos)',
			});
		});

		it('passes Supabase errors through instead of the RLS guard message', async () => {
			const err = { code: '42501', message: 'permission denied' };
			setup({ error: err });

			expect(await deletePayment(5)).toEqual({ error: err });
		});
	});
});
