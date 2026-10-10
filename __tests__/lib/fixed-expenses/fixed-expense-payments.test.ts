import {
	deleteFixedExpensePayment,
	listFixedExpensePayments,
	markFixedExpensePaid,
	unmarkFixedExpensePaid,
	updateFixedExpensePayment,
} from '@/lib/fixed-expenses/fixed-expense-payments';
import { getSupabaseClient } from '@/lib/supabase-client';

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: jest.fn(),
}));

function setup(result: { data?: any; error?: any }) {
	const rpc = jest.fn().mockResolvedValue({ data: null, error: null, ...result });
	(getSupabaseClient as jest.Mock).mockReturnValue({ rpc });
	return { rpc };
}

function setupQuery(result: { data?: any; error?: any }) {
	const chain: Record<string, any> = {};
	['select', 'gte', 'lt', 'order'].forEach((m) => {
		chain[m] = jest.fn(() => chain);
	});
	chain.then = (resolve: (v: any) => any) => resolve({ data: null, error: null, ...result });
	const from = jest.fn(() => chain);
	(getSupabaseClient as jest.Mock).mockReturnValue({ from });
	return { chain, from };
}

describe('lib/fixed-expenses/fixed-expense-payments', () => {
	beforeEach(() => jest.clearAllMocks());

	describe('markFixedExpensePaid', () => {
		it('calls the RPC with mapped p_ params and maps the returned row', async () => {
			const row = {
				id: 1,
				created_at: '2026-10-10T00:00:00Z',
				fixed_expense_id: 5,
				paid_date: '2026-10-10',
				period: '2026-10-01',
				net_amount: 1000,
				iva_percent: 21,
				iva_amount: 210,
				total_amount: 1210,
				payment_method_id: 2,
				bank_account_id: null,
			};
			const { rpc } = setup({ data: [row] });

			const res = await markFixedExpensePaid({
				fixed_expense_id: 5,
				paid_date: '2026-10-10',
				period: '2026-10-01',
				net_amount: 1000,
				iva_percent: 21,
				payment_method_id: 2,
				bank_account_id: null,
			});

			expect(rpc).toHaveBeenCalledWith('mark_fixed_expense_paid', {
				p_fixed_expense_id: 5,
				p_paid_date: '2026-10-10',
				p_period: '2026-10-01',
				p_net_amount: 1000,
				p_iva_percent: 21,
				p_payment_method_id: 2,
				p_bank_account_id: null,
			});
			expect(res).toEqual({ data: row, error: null });
		});

		it('passes Supabase errors through', async () => {
			const err = { code: '23505', message: 'duplicate key' };
			setup({ error: err });

			const res = await markFixedExpensePaid({
				fixed_expense_id: 5,
				paid_date: '2026-10-10',
				period: '2026-10-01',
				net_amount: 1000,
				iva_percent: 0,
				payment_method_id: 2,
				bank_account_id: null,
			});

			expect(res).toEqual({ data: null, error: err });
		});
	});

	describe('unmarkFixedExpensePaid', () => {
		it('calls the RPC with the fixed expense id', async () => {
			const row = { id: 9, fixed_expense_id: 5 };
			const { rpc } = setup({ data: [row] });

			await unmarkFixedExpensePaid(5);

			expect(rpc).toHaveBeenCalledWith('unmark_fixed_expense_paid', {
				p_fixed_expense_id: 5,
			});
		});

		it('passes Supabase errors through', async () => {
			const err = { code: '42501', message: 'permission denied' };
			setup({ error: err });

			expect(await unmarkFixedExpensePaid(5)).toEqual({ data: null, error: err });
		});
	});

	describe('updateFixedExpensePayment', () => {
		it('calls the RPC with mapped p_ params and maps the returned row', async () => {
			const row = {
				id: 1,
				created_at: '2026-10-10T00:00:00Z',
				fixed_expense_id: 5,
				paid_date: '2026-10-11',
				period: '2026-09-01',
				net_amount: 2000,
				iva_percent: 10.5,
				iva_amount: 210,
				total_amount: 2210,
				payment_method_id: 3,
				bank_account_id: 4,
			};
			const { rpc } = setup({ data: [row] });

			const res = await updateFixedExpensePayment({
				payment_id: 1,
				paid_date: '2026-10-11',
				period: '2026-09-01',
				net_amount: 2000,
				iva_percent: 10.5,
				payment_method_id: 3,
				bank_account_id: 4,
			});

			expect(rpc).toHaveBeenCalledWith('update_fixed_expense_payment', {
				p_payment_id: 1,
				p_paid_date: '2026-10-11',
				p_period: '2026-09-01',
				p_net_amount: 2000,
				p_iva_percent: 10.5,
				p_payment_method_id: 3,
				p_bank_account_id: 4,
			});
			expect(res).toEqual({ data: row, error: null });
		});

		it('passes Supabase errors through', async () => {
			const err = { code: '23505', message: 'duplicate key' };
			setup({ error: err });

			const res = await updateFixedExpensePayment({
				payment_id: 1,
				paid_date: '2026-10-11',
				period: '2026-09-01',
				net_amount: 2000,
				iva_percent: 0,
				payment_method_id: 3,
				bank_account_id: null,
			});

			expect(res).toEqual({ data: null, error: err });
		});

		it('treats an empty result as an error instead of a silent success', async () => {
			setup({ data: [] });

			const res = await updateFixedExpensePayment({
				payment_id: 1,
				paid_date: '2026-10-11',
				period: '2026-09-01',
				net_amount: 2000,
				iva_percent: 0,
				payment_method_id: 3,
				bank_account_id: null,
			});

			expect(res.data).toBeNull();
			expect(res.error).toBeTruthy();
		});
	});

	describe('deleteFixedExpensePayment', () => {
		it('calls the RPC with the payment id', async () => {
			const { rpc } = setup({ data: null });

			await deleteFixedExpensePayment(1);

			expect(rpc).toHaveBeenCalledWith('delete_fixed_expense_payment', {
				p_payment_id: 1,
			});
		});

		it('passes Supabase errors through', async () => {
			const err = { code: '42501', message: 'permission denied' };
			setup({ error: err });

			expect(await deleteFixedExpensePayment(1)).toEqual({ error: err });
		});
	});

	describe('listFixedExpensePayments', () => {
		it('queries the period range for the given year and flattens the joined details', async () => {
			const rows = [
				{
					id: 1,
					created_at: '2026-10-10T00:00:00Z',
					fixed_expense_id: 5,
					paid_date: '2026-10-10',
					period: '2026-10-01',
					net_amount: 1000,
					iva_percent: 21,
					iva_amount: 210,
					total_amount: 1210,
					payment_method_id: 2,
					bank_account_id: 3,
					fixed_expenses: {
						description: 'Alquiler mensual',
						category_id: 10,
						cash_flow_categories: { name: 'Alquiler oficina' },
					},
					payment_methods: { name: 'Transferencia' },
					bank_accounts: { name: 'Cuenta principal', bank: 'Banco Nación' },
				},
			];
			const { chain, from } = setupQuery({ data: rows });

			const res = await listFixedExpensePayments({ year: 2026 });

			expect(from).toHaveBeenCalledWith('fixed_expense_payments');
			expect(chain.gte).toHaveBeenCalledWith('period', '2026-01-01');
			expect(chain.lt).toHaveBeenCalledWith('period', '2027-01-01');
			expect(res).toEqual({
				data: [
					{
						id: 1,
						created_at: '2026-10-10T00:00:00Z',
						fixed_expense_id: 5,
						paid_date: '2026-10-10',
						period: '2026-10-01',
						net_amount: 1000,
						iva_percent: 21,
						iva_amount: 210,
						total_amount: 1210,
						payment_method_id: 2,
						bank_account_id: 3,
						description: 'Alquiler mensual',
						category_id: 10,
						category_name: 'Alquiler oficina',
						payment_method_name: 'Transferencia',
						bank_account_label: 'Banco Nación - Cuenta principal',
					},
				],
				error: null,
			});
		});

		it('maps a null bank account to a null label', async () => {
			const rows = [
				{
					id: 1,
					fixed_expense_id: 5,
					net_amount: 1000,
					iva_amount: 0,
					total_amount: 1000,
					fixed_expenses: { description: 'Internet', category_id: 7, cash_flow_categories: null },
					payment_methods: { name: 'Efectivo' },
					bank_accounts: null,
				},
			];
			setupQuery({ data: rows });

			const res = await listFixedExpensePayments({ year: 2026 });

			expect(res.data?.[0].bank_account_label).toBeNull();
			expect(res.data?.[0].category_name).toBe('');
		});

		it('passes Supabase errors through', async () => {
			const err = { code: '42501', message: 'permission denied' };
			setupQuery({ error: err });

			expect(await listFixedExpensePayments({ year: 2026 })).toEqual({ data: null, error: err });
		});
	});
});
