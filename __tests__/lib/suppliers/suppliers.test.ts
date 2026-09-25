import {
	listSuppliers,
	createSupplier,
	updateSupplier,
	deleteSupplier,
	SupplierInput,
} from '@/lib/suppliers/suppliers';
import { getSupabaseClient } from '@/lib/supabase-client';

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: jest.fn(),
}));

/** Chainable query builder that resolves to `result` when awaited (or after .single()). */
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

const input: SupplierInput = {
	name: 'Vidrios SA',
	business_name: null,
	tax_id: '30712345678',
	whatsapp: null,
	email: null,
	category: null,
	locality: null,
	address: null,
	payment_terms_days: 30,
	notes: null,
	is_active: true,
};

describe('lib/suppliers', () => {
	beforeEach(() => jest.clearAllMocks());

	it('listSuppliers selects all ordered by name', async () => {
		const rows = [{ id: 1 }];
		const { chain, from } = setup({ data: rows });
		const res = await listSuppliers();
		expect(from).toHaveBeenCalledWith('suppliers');
		expect(chain.select).toHaveBeenCalledWith('*');
		expect(chain.order).toHaveBeenCalledWith('name', { ascending: true });
		expect(res).toEqual({ data: rows, error: null });
	});

	it('createSupplier passes the payload straight through and returns data/error', async () => {
		const { chain } = setup({ data: { id: 5, ...input } });
		const res = await createSupplier(input);
		expect(chain.insert).toHaveBeenCalledWith(input);
		expect(chain.select).toHaveBeenCalled();
		expect(chain.single).toHaveBeenCalled();
		expect(res.data).toMatchObject({ id: 5 });

		const err = { message: 'boom' };
		setup({ error: err });
		expect((await createSupplier(input)).error).toBe(err);
	});

	it('updateSupplier updates by id, selecting a single row', async () => {
		const { chain } = setup({ data: { id: 3 } });
		const res = await updateSupplier(3, { is_active: false });
		expect(chain.update).toHaveBeenCalledWith({ is_active: false });
		expect(chain.eq).toHaveBeenCalledWith('id', 3);
		expect(chain.select).toHaveBeenCalled();
		expect(chain.single).toHaveBeenCalled();
		expect(res.data).toEqual({ id: 3 });
	});

	describe('deleteSupplier', () => {
		it('deletes by id and selects the id to confirm the row was removed', async () => {
			const { chain } = setup({ data: [{ id: 9 }] });
			const res = await deleteSupplier(9);
			expect(chain.delete).toHaveBeenCalled();
			expect(chain.eq).toHaveBeenCalledWith('id', 9);
			expect(chain.select).toHaveBeenCalledWith('id');
			expect(res).toEqual({ error: null });
		});

		it('returns an error when no row was deleted', async () => {
			setup({ data: [] });
			const res = await deleteSupplier(9);
			expect(res.error.message).toBe(
				'No se pudo eliminar el proveedor (no existe o no tenés permisos)'
			);
		});

		it('passes Supabase errors through', async () => {
			const err = { code: '23503', message: 'fk' };
			setup({ error: err });
			expect((await deleteSupplier(9)).error).toBe(err);
		});
	});
});
