import { createPayment, deletePayment, listPayments, updatePayment } from '@/lib/payments/payments';
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

describe('lib/payments', () => {
	beforeEach(() => jest.clearAllMocks());

	describe('listPayments', () => {
		it('scopes the query to the given year and flattens the joined details', async () => {
			const rows = [
				{
					id: 1,
					date: '2026-05-10',
					work_id: 7,
					supplier_id: 3,
					category_id: 10,
					amount: 1000,
					works: { name: 'Obra Norte' },
					suppliers: { name: 'Acme SRL' },
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
					supplier_name: 'Acme SRL',
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
					supplier_id: 4,
					category_id: null,
					amount: 500,
					works: null,
					suppliers: null,
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
					supplier_name: '',
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
	});

	describe('createPayment', () => {
		it('trims receipt_number and description before inserting', async () => {
			const { chain } = setup({ data: { id: 1 } });

			await createPayment({
				date: '2026-05-10',
				receipt_number: '  R-0001  ',
				work_id: null,
				supplier_id: 3,
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
				supplier_id: 3,
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
				supplier_id: 3,
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
				supplier_id: 3,
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
