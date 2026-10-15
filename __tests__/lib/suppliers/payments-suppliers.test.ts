import {
	createPaymentSupplier,
	listPaymentsSuppliers,
	listPaymentsSuppliersByPurchaseIds,
	listPaymentsSuppliersForYear,
	updatePaymentSupplier,
} from '@/lib/suppliers/payments-suppliers';
import { getSupabaseClient } from '@/lib/supabase-client';

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: jest.fn(),
}));

function setup(result: { data?: any; error?: any }) {
	const chain: Record<string, any> = {};
	['select', 'eq', 'gte', 'lt', 'order', 'insert', 'update', 'single', 'range'].forEach((m) => {
		chain[m] = jest.fn(() => chain);
	});
	chain.then = (resolve: (v: any) => any) => resolve({ data: null, error: null, ...result });
	const from = jest.fn(() => chain);
	(getSupabaseClient as jest.Mock).mockReturnValue({ from });
	return { chain, from };
}

describe('lib/suppliers/payments-suppliers', () => {
	beforeEach(() => jest.clearAllMocks());

	describe('listPaymentsSuppliers', () => {
		it('orders by paid_date desc, then created_at desc', async () => {
			const { chain, from } = setup({ data: [] });

			await listPaymentsSuppliers();

			expect(from).toHaveBeenCalledWith('payments_suppliers');
			expect(chain.order).toHaveBeenNthCalledWith(1, 'paid_date', { ascending: false });
			expect(chain.order).toHaveBeenNthCalledWith(2, 'created_at', { ascending: false });
		});

		it('filters by purchase_supplier_id when provided', async () => {
			const { chain } = setup({ data: [] });

			await listPaymentsSuppliers(8);

			expect(chain.eq).toHaveBeenCalledWith('purchase_supplier_id', 8);
		});
	});

	describe('listPaymentsSuppliersByPurchaseIds', () => {
		it('orders by paid_date desc, then created_at desc, then id desc', async () => {
			const chain: Record<string, jest.Mock> = {
				select: jest.fn(() => chain),
				in: jest.fn(() => chain),
				order: jest.fn(() => chain),
				range: jest.fn(() => chain),
			};
			(chain as any).then = (resolve: (v: any) => any) => resolve({ data: [], error: null });
			const from = jest.fn(() => chain);
			(getSupabaseClient as jest.Mock).mockReturnValue({ from });

			await listPaymentsSuppliersByPurchaseIds([11]);

			expect(chain.order).toHaveBeenNthCalledWith(1, 'paid_date', { ascending: false });
			expect(chain.order).toHaveBeenNthCalledWith(2, 'created_at', { ascending: false });
			expect(chain.order).toHaveBeenNthCalledWith(3, 'id', { ascending: false });
		});
	});

	describe('listPaymentsSuppliersForYear', () => {
		it('scopes the query to paid_date within the given year and flattens joined details', async () => {
			const rows = [
				{
					id: 1,
					paid_date: '2026-06-20',
					amount_ars: 500,
					purchase_supplier_id: 8,
					notes: 'Pago a proveedor',
					purchases_suppliers: { supplier_id: 4, suppliers: { name: 'Acme SRL' } },
					works: { name: 'Obra Norte' },
					cash_flow_categories: { name: 'Materiales' },
					payment_methods: { name: 'Transferencia' },
					bank_accounts: { name: 'Cuenta principal', bank: 'Banco Nación' },
				},
			];
			const { chain, from } = setup({ data: rows });

			const res = await listPaymentsSuppliersForYear(2026);

			expect(from).toHaveBeenCalledWith('payments_suppliers');
			expect(chain.gte).toHaveBeenCalledWith('paid_date', '2026-01-01');
			expect(chain.lt).toHaveBeenCalledWith('paid_date', '2027-01-01');
			expect(chain.order).toHaveBeenNthCalledWith(3, 'id', { ascending: false });
			expect(chain.range).toHaveBeenCalledWith(0, 999);
			expect(res.data?.[0]).toEqual(
				expect.objectContaining({
					id: 1,
					supplier_id: 4,
					supplier_name: 'Acme SRL',
					work_name: 'Obra Norte',
					category_name: 'Materiales',
					payment_method_name: 'Transferencia',
					bank_account_name: 'Banco Nación - Cuenta principal',
				})
			);
		});

		it('maps a missing purchase/supplier join to safe defaults', async () => {
			const rows = [
				{
					id: 2,
					paid_date: '2026-06-20',
					amount_ars: 500,
					purchase_supplier_id: 8,
					notes: null,
					purchases_suppliers: null,
					works: null,
					cash_flow_categories: null,
					payment_methods: null,
					bank_accounts: null,
				},
			];
			setup({ data: rows });

			const res = await listPaymentsSuppliersForYear(2026);

			expect(res.data?.[0]).toEqual(
				expect.objectContaining({
					supplier_id: 0,
					supplier_name: '',
					work_name: null,
					category_name: null,
					payment_method_name: null,
					bank_account_name: null,
				})
			);
		});

		it('passes Supabase errors through', async () => {
			const err = { code: '42501', message: 'permission denied' };
			setup({ error: err });

			expect(await listPaymentsSuppliersForYear(2026)).toEqual({ data: null, error: err });
		});

		it('fetches a second page beyond the PostgREST 1000-row limit and returns every row', async () => {
			const makeRow = (id: number) => ({
				id,
				paid_date: '2026-06-20',
				amount_ars: 10,
				purchase_supplier_id: 8,
				notes: null,
				purchases_suppliers: null,
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

			const res = await listPaymentsSuppliersForYear(2026);

			expect(res.error).toBeNull();
			expect(res.data).toHaveLength(1002);
			expect(chain.range).toHaveBeenNthCalledWith(1, 0, 999);
			expect(chain.range).toHaveBeenNthCalledWith(2, 1000, 1999);
		});

		it('propagates an error raised on a non-first page', async () => {
			const fullPage = Array.from({ length: 1000 }, (_, i) => ({
				id: i + 1,
				paid_date: '2026-06-20',
				amount_ars: 10,
				purchase_supplier_id: 8,
				notes: null,
				purchases_suppliers: null,
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

			const res = await listPaymentsSuppliersForYear(2026);

			expect(res.data).toBeNull();
			expect(res.error).toEqual(err);
		});
	});

	describe('createPaymentSupplier / updatePaymentSupplier', () => {
		it('createPaymentSupplier allows omitting paid_date/receipt_number/work_id/category_id', async () => {
			const { chain } = setup({ data: { id: 1 } });

			await createPaymentSupplier({
				amount_ars: 1000,
				bank_account_id: null,
				payment_method_id: null,
				purchase_supplier_id: 8,
				notes: null,
			});

			expect(chain.insert).toHaveBeenCalledWith(
				expect.objectContaining({ amount_ars: 1000, purchase_supplier_id: 8 })
			);
		});

		it('updatePaymentSupplier scopes the update by id', async () => {
			const { chain } = setup({ data: { id: 1 } });

			await updatePaymentSupplier(1, { paid_date: '2026-06-20', amount_ars: 2000 });

			expect(chain.update).toHaveBeenCalledWith(
				expect.objectContaining({ paid_date: '2026-06-20', amount_ars: 2000 })
			);
			expect(chain.eq).toHaveBeenCalledWith('id', 1);
		});
	});
});
