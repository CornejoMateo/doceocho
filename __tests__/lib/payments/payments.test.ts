import {
	createPayment,
	createPaymentWithWithholding,
	deletePayment,
	listPayments,
	listPaymentsByExpenseIds,
	updatePayment,
} from '@/lib/payments/payments';
import { getSupabaseClient } from '@/lib/supabase-client';

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: jest.fn(),
}));

function setup(result: { data?: any; error?: any }) {
	const chain: Record<string, any> = {};
	[
		'select',
		'gte',
		'lt',
		'order',
		'eq',
		'in',
		'insert',
		'update',
		'delete',
		'single',
		'range',
	].forEach((m) => {
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
					category_id: 10,
					amount: 1000,
					works: { name: 'Obra Norte' },
					cash_flow_categories: { name: 'Materiales' },
					payment_methods: { name: 'Transferencia' },
					bank_accounts: { name: 'Cuenta principal', bank: 'Banco Nación' },
					expenses: null,
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
					expenses: null,
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

		it('flattens the joined expense fields when the payment is linked to one', async () => {
			const rows = [
				{
					id: 3,
					expense_id: 42,
					work_id: null,
					category_id: null,
					amount: 500,
					works: null,
					cash_flow_categories: null,
					payment_methods: { name: 'Efectivo' },
					bank_accounts: null,
					expenses: {
						date: '2026-04-01',
						voucher_number: '0001-00000456',
						description: 'Compra de cemento',
						total_amount: 500,
					},
				},
			];
			setup({ data: rows });

			const res = await listPayments({ year: 2026 });

			expect(res.data?.[0]).toEqual(
				expect.objectContaining({
					expense_id: 42,
					expense_date: '2026-04-01',
					expense_voucher_number: '0001-00000456',
					expense_description: 'Compra de cemento',
					expense_total_amount: 500,
				})
			);
		});

		it('maps a payment with no linked expense to null expense fields', async () => {
			const rows = [
				{
					id: 4,
					expense_id: null,
					work_id: null,
					category_id: null,
					amount: 500,
					works: null,
					cash_flow_categories: null,
					payment_methods: { name: 'Efectivo' },
					bank_accounts: null,
					expenses: null,
				},
			];
			setup({ data: rows });

			const res = await listPayments({ year: 2026 });

			expect(res.data?.[0]).toEqual(
				expect.objectContaining({
					expense_id: null,
					expense_date: null,
					expense_voucher_number: null,
					expense_description: null,
					expense_total_amount: null,
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
				expense_id: null,
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
				expense_id: null,
			});

			expect(chain.insert).toHaveBeenCalledWith(
				expect.objectContaining({ receipt_number: null, description: null })
			);
		});

		it('forwards expense_id when the payment is linked to an expense', async () => {
			const { chain } = setup({ data: { id: 1 } });

			await createPayment({
				date: '2026-05-10',
				receipt_number: null,
				work_id: null,
				category_id: null,
				description: null,
				amount: 1000,
				payment_method_id: 2,
				bank_account_id: null,
				expense_id: 42,
			});

			expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({ expense_id: 42 }));
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
				expense_id: null,
			});

			expect(res).toEqual({ data: null, error: err });
		});
	});

	describe('createPaymentWithWithholding', () => {
		function setupRpc(result: { data?: any; error?: any }) {
			const rpc = jest.fn().mockResolvedValue({ data: null, error: null, ...result });
			(getSupabaseClient as jest.Mock).mockReturnValue({ rpc });
			return { rpc };
		}

		it('calls create_payment_with_withholding with the exact param names, normalizing the payment', async () => {
			const { rpc } = setupRpc({ data: { id: 10 } });

			await createPaymentWithWithholding(
				{
					date: '2026-05-10',
					receipt_number: '  R-0001  ',
					work_id: null,
					category_id: 10,
					description: '  Cemento  ',
					amount: 1000,
					payment_method_id: 2,
					bank_account_id: null,
					expense_id: 42,
				},
				{ tax_regime: '  Régimen general  ', rate: 0.02, imputed_amount: 1000 }
			);

			expect(rpc).toHaveBeenCalledWith('create_payment_with_withholding', {
				p_date: '2026-05-10',
				p_receipt_number: 'R-0001',
				p_work_id: null,
				p_category_id: 10,
				p_description: 'Cemento',
				p_amount: 1000,
				p_payment_method_id: 2,
				p_bank_account_id: null,
				p_expense_id: 42,
				p_tax_regime: 'Régimen general',
				p_rate: 0.02,
				p_imputed_amount: 1000,
				p_period: null,
				p_notes: null,
			});
		});

		it('forwards an explicit period and notes, trimmed', async () => {
			const { rpc } = setupRpc({ data: { id: 11 } });

			await createPaymentWithWithholding(
				{
					date: '2026-05-10',
					receipt_number: null,
					work_id: null,
					category_id: null,
					description: null,
					amount: 500,
					payment_method_id: null,
					bank_account_id: null,
					expense_id: 7,
				},
				{
					tax_regime: 'Regimen',
					rate: 0.05,
					imputed_amount: 500,
					period: '2026-05',
					notes: '  nota  ',
				}
			);

			expect(rpc).toHaveBeenCalledWith(
				'create_payment_with_withholding',
				expect.objectContaining({ p_period: '2026-05', p_notes: 'nota' })
			);
		});

		it('returns the created payment in the same shape as createPayment', async () => {
			setupRpc({ data: { id: 12 } });

			const res = await createPaymentWithWithholding(
				{
					date: '2026-05-10',
					receipt_number: null,
					work_id: null,
					category_id: null,
					description: null,
					amount: 500,
					payment_method_id: null,
					bank_account_id: null,
					expense_id: 7,
				},
				{ tax_regime: 'Regimen', rate: 0.05, imputed_amount: 500 }
			);

			expect(res).toEqual({ data: { id: 12 }, error: null });
		});

		it('passes Supabase errors through', async () => {
			const err = { message: 'El régimen de la retención es obligatorio' };
			setupRpc({ error: err });

			const res = await createPaymentWithWithholding(
				{
					date: '2026-05-10',
					receipt_number: null,
					work_id: null,
					category_id: null,
					description: null,
					amount: 500,
					payment_method_id: null,
					bank_account_id: null,
					expense_id: 7,
				},
				{ tax_regime: '', rate: 0.05, imputed_amount: 500 }
			);

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
				expense_id: null,
			});

			expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ receipt_number: 'R-2' }));
			expect(chain.eq).toHaveBeenCalledWith('id', 5);
		});

		it('forwards expense_id when linking an existing payment to an expense', async () => {
			const { chain } = setup({ data: { id: 5 } });

			await updatePayment(5, {
				date: '2026-05-10',
				receipt_number: null,
				work_id: null,
				category_id: null,
				description: null,
				amount: 2000,
				payment_method_id: 2,
				bank_account_id: null,
				expense_id: 7,
			});

			expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ expense_id: 7 }));
		});
	});

	describe('deletePayment', () => {
		function setupDelete(opts: { rpcData?: string[] | null; rpcError?: any; storageError?: any }) {
			const rpc = jest
				.fn()
				.mockResolvedValue({ data: opts.rpcData ?? [], error: opts.rpcError ?? null });
			const remove = jest.fn().mockResolvedValue({ error: opts.storageError ?? null });
			const storageFrom = jest.fn(() => ({ remove }));
			(getSupabaseClient as jest.Mock).mockReturnValue({ rpc, storage: { from: storageFrom } });
			return { rpc, remove, storageFrom };
		}

		it('is RPC-first: calls delete_payment_supplier with the payment id', async () => {
			const { rpc } = setupDelete({ rpcData: [] });

			expect(await deletePayment(5)).toEqual({ error: null });
			expect(rpc).toHaveBeenCalledWith('delete_payment_supplier', { p_id: 5 });
		});

		it('returns the RPC error immediately without touching storage', async () => {
			const err = { message: 'No se pudo eliminar el pago (no existe o no tenés permisos)' };
			const { remove } = setupDelete({ rpcError: err });

			expect(await deletePayment(5)).toEqual({ error: err });
			expect(remove).not.toHaveBeenCalled();
		});

		it('removes every returned storage path in the suppliers-files bucket', async () => {
			const { remove, storageFrom } = setupDelete({ rpcData: ['payments/5/a.pdf'] });

			await deletePayment(5);

			expect(storageFrom).toHaveBeenCalledWith('suppliers-files');
			expect(remove).toHaveBeenCalledWith(['payments/5/a.pdf']);
		});

		it('reports orphaned paths as a non-blocking warning when storage removal fails', async () => {
			setupDelete({ rpcData: ['payments/5/a.pdf'], storageError: { message: 'boom' } });

			const res = await deletePayment(5);

			expect(res.error).toBeNull();
			expect(res.orphanedPaths).toEqual(['payments/5/a.pdf']);
		});
	});

	describe('listPaymentsByExpenseIds', () => {
		it('returns an empty list without querying when given no ids', async () => {
			const { from } = setup({ data: [] });

			const res = await listPaymentsByExpenseIds([]);

			expect(res).toEqual({ data: [], error: null });
			expect(from).not.toHaveBeenCalled();
		});

		it('queries payments.expense_id in the given id list and flattens the joined details', async () => {
			const { chain, from } = setup({
				data: [
					{
						id: 1,
						expense_id: 11,
						work_id: null,
						category_id: null,
						payment_methods: { name: 'Efectivo' },
						bank_accounts: null,
						works: null,
						cash_flow_categories: null,
						expenses: null,
					},
				],
			});

			const res = await listPaymentsByExpenseIds([11, 12]);

			expect(from).toHaveBeenCalledWith('payments');
			expect(chain.in).toHaveBeenCalledWith('expense_id', [11, 12]);
			expect(res.data?.[0]).toEqual(expect.objectContaining({ payment_method_name: 'Efectivo' }));
		});

		it('passes errors through', async () => {
			const err = { message: 'boom' };
			setup({ error: err });

			expect(await listPaymentsByExpenseIds([11])).toEqual({ data: null, error: err });
		});
	});
});
