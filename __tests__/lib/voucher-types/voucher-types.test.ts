import {
	createVoucherType,
	deactivateVoucherType,
	listVoucherTypes,
	reactivateVoucherType,
	updateVoucherType,
} from '@/lib/voucher-types/voucher-types';
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

describe('lib/voucher-types', () => {
	beforeEach(() => jest.clearAllMocks());

	describe('listVoucherTypes', () => {
		it('orders by name ascending', async () => {
			const rows = [{ id: 1, name: 'Factura A', is_active: true }];
			const { chain, from } = setup({ data: rows });

			const res = await listVoucherTypes();

			expect(from).toHaveBeenCalledWith('voucher_types');
			expect(chain.order).toHaveBeenCalledWith('name', { ascending: true });
			expect(res).toEqual({ data: rows, error: null });
		});

		it('passes Supabase errors through', async () => {
			const err = { code: '42501', message: 'permission denied' };
			setup({ error: err });

			expect(await listVoucherTypes()).toEqual({ data: null, error: err });
		});
	});

	describe('createVoucherType', () => {
		it('trims the name before inserting', async () => {
			const { chain } = setup({ data: { id: 1 } });

			await createVoucherType({ name: '  Factura A  ' });

			expect(chain.insert).toHaveBeenCalledWith({ name: 'Factura A' });
		});

		it('passes Supabase errors through', async () => {
			const err = { code: '23505', message: 'duplicate key' };
			setup({ error: err });

			expect(await createVoucherType({ name: 'Factura A' })).toEqual({ data: null, error: err });
		});
	});

	describe('updateVoucherType', () => {
		it('trims the name and scopes the update by id', async () => {
			const { chain } = setup({ data: { id: 5 } });

			await updateVoucherType(5, { name: '  Factura B  ' });

			expect(chain.update).toHaveBeenCalledWith({ name: 'Factura B' });
			expect(chain.eq).toHaveBeenCalledWith('id', 5);
		});
	});

	describe('deactivateVoucherType', () => {
		it('sets is_active to false', async () => {
			const { chain } = setup({ data: { id: 5, is_active: false } });

			await deactivateVoucherType(5);

			expect(chain.update).toHaveBeenCalledWith({ is_active: false });
			expect(chain.eq).toHaveBeenCalledWith('id', 5);
		});
	});

	describe('reactivateVoucherType', () => {
		it('sets is_active to true', async () => {
			const { chain } = setup({ data: { id: 5, is_active: true } });

			await reactivateVoucherType(5);

			expect(chain.update).toHaveBeenCalledWith({ is_active: true });
			expect(chain.eq).toHaveBeenCalledWith('id', 5);
		});
	});
});
