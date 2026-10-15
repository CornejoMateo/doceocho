import {
	listPaymentMethods,
	createPaymentMethod,
	updatePaymentMethod,
	deletePaymentMethod,
	PaymentMethodInput,
} from '@/lib/payment-methods/payment-methods';
import { getSupabaseClient } from '@/lib/supabase-client';

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: jest.fn(),
}));

function setup(result: { data?: any; error?: any }) {
	const chain: Record<string, any> = {};
	['select', 'order', 'eq', 'insert', 'update', 'delete', 'single'].forEach((m) => {
		chain[m] = jest.fn(() => chain);
	});
	chain.then = (resolve: (v: any) => any) => resolve({ data: null, error: null, ...result });
	const from = jest.fn(() => chain);
	(getSupabaseClient as jest.Mock).mockReturnValue({ from });
	return { chain, from };
}

const input: PaymentMethodInput = {
	name: 'Transferencia bancaria',
	is_active: true,
};

describe('lib/payment-methods', () => {
	beforeEach(() => jest.clearAllMocks());

	describe('listPaymentMethods', () => {
		it('selects all rows ordered by name', async () => {
			const rows = [{ id: 1 }];
			const { chain, from } = setup({ data: rows });
			const res = await listPaymentMethods();
			expect(from).toHaveBeenCalledWith('payment_methods');
			expect(chain.select).toHaveBeenCalledWith('*');
			expect(chain.order).toHaveBeenCalledWith('name', { ascending: true });
			expect(res).toEqual({ data: rows, error: null });
		});

		it('passes Supabase errors through', async () => {
			const err = { code: '42501', message: 'permission denied' };
			setup({ error: err });
			expect((await listPaymentMethods()).error).toBe(err);
		});
	});

	describe('createPaymentMethod', () => {
		it('passes the payload straight through and returns data/error', async () => {
			const { chain } = setup({ data: { id: 4, ...input } });
			const res = await createPaymentMethod(input);
			expect(chain.insert).toHaveBeenCalledWith(input);
			expect(chain.select).toHaveBeenCalled();
			expect(chain.single).toHaveBeenCalled();
			expect(res.data).toMatchObject({ id: 4 });
		});

		it('forwards a partial payload unmodified, without injecting id/created_at', async () => {
			const { chain } = setup({ data: { id: 4 } });
			const partial: PaymentMethodInput = { name: 'pm', is_active: true };
			await createPaymentMethod(partial);
			expect(chain.insert).toHaveBeenCalledWith(partial);
			expect(chain.insert).toHaveBeenCalledWith({ name: 'pm', is_active: true });
			expect(chain.insert.mock.calls[0][0]).not.toHaveProperty('id');
			expect(chain.insert.mock.calls[0][0]).not.toHaveProperty('created_at');
		});

		it('passes Supabase errors through', async () => {
			const err = { code: '23502', message: 'not-null violation' };
			setup({ error: err });
			expect((await createPaymentMethod(input)).error).toBe(err);
		});
	});

	describe('updatePaymentMethod', () => {
		it('updates by id, selecting a single row', async () => {
			const { chain } = setup({ data: { id: 3 } });
			const res = await updatePaymentMethod(3, { is_active: false });
			expect(chain.update).toHaveBeenCalledWith({ is_active: false });
			expect(chain.eq).toHaveBeenCalledWith('id', 3);
			expect(chain.select).toHaveBeenCalled();
			expect(chain.single).toHaveBeenCalled();
			expect(res.data).toEqual({ id: 3 });
		});

		it('passes Supabase errors through', async () => {
			const err = { code: 'PGRST116', message: 'no rows returned' };
			setup({ error: err });
			expect((await updatePaymentMethod(3, { is_active: false })).error).toBe(err);
		});
	});

	describe('deletePaymentMethod', () => {
		it('deletes by id and selects the id to confirm the row was removed', async () => {
			const { chain } = setup({ data: [{ id: 9 }] });
			const res = await deletePaymentMethod(9);
			expect(chain.delete).toHaveBeenCalled();
			expect(chain.eq).toHaveBeenCalledWith('id', 9);
			expect(chain.select).toHaveBeenCalledWith('id');
			expect(res).toEqual({ error: null });
		});

		it('returns an error when no row was deleted', async () => {
			setup({ data: [] });
			const res = await deletePaymentMethod(9);
			expect(res.error.message).toBe(
				'No se pudo eliminar el método de pago (no existe o no tenés permisos)'
			);
		});

		it('returns an error when the delete resolves without rows at all', async () => {
			setup({ data: null });
			const res = await deletePaymentMethod(9);
			expect(res.error.message).toBe(
				'No se pudo eliminar el método de pago (no existe o no tenés permisos)'
			);
		});

		it('passes Supabase errors through', async () => {
			const err = { code: '42501', message: 'permission denied' };
			setup({ error: err });
			expect((await deletePaymentMethod(9)).error).toBe(err);
		});
	});
});
