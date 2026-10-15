import { renderHook } from '@testing-library/react';
import { useExpenses } from '@/hooks/expenses/use-expenses';
import { useIncomeExpenseTab } from '@/hooks/income-expense/use-income-expense-tab';
import { createExpense, deleteExpense, listExpenses, updateExpense } from '@/lib/expenses/expenses';
import { listSuppliers } from '@/lib/suppliers/suppliers';

jest.mock('@/hooks/income-expense/use-income-expense-tab', () => ({
	useIncomeExpenseTab: jest.fn((config) => config),
}));
jest.mock('@/lib/expenses/expenses', () => ({
	listExpenses: jest.fn(),
	createExpense: jest.fn(),
	updateExpense: jest.fn(),
	deleteExpense: jest.fn(),
}));
jest.mock('@/lib/suppliers/suppliers', () => ({
	listSuppliers: jest.fn(),
}));

describe('useExpenses', () => {
	beforeEach(() => jest.clearAllMocks());

	it('configures useIncomeExpenseTab with the expense category kind and labels', () => {
		renderHook(() => useExpenses() as any);

		expect(useIncomeExpenseTab).toHaveBeenCalledWith(
			expect.objectContaining({
				categoryKind: 'expense',
				labels: expect.objectContaining({ entityLabel: 'gasto', createdToast: 'Gasto creado' }),
			})
		);
	});

	it('listEntries maps ExpenseWithDetails rows to IncomeExpenseEntry, using supplier as the party', async () => {
		(listExpenses as jest.Mock).mockResolvedValue({
			data: [
				{
					id: 1,
					date: '2026-05-10',
					voucher_number: 'B-1',
					voucher_type_id: 1,
					voucher_type_name: 'Factura A',
					work_id: 7,
					work_name: 'Obra Norte',
					supplier_id: 3,
					supplier_name: 'Acme SRL',
					category_id: 10,
					category_name: 'Materiales',
					description: 'Cemento',
					net_amount: 1000,
					iva_percent: 21,
					iva_amount: 210,
					total_amount: 1210,
				},
			],
			error: null,
		});
		const { result } = renderHook(() => useExpenses() as any);

		const res = await result.current.listEntries(2026);

		expect(listExpenses).toHaveBeenCalledWith({ year: 2026 });
		expect(res.data?.[0]).toEqual(
			expect.objectContaining({ id: 1, party_id: 3, party_name: 'Acme SRL' })
		);
	});

	it('listEntries passes errors through without mapping', async () => {
		const err = { message: 'boom' };
		(listExpenses as jest.Mock).mockResolvedValue({ data: null, error: err });
		const { result } = renderHook(() => useExpenses() as any);

		expect(await result.current.listEntries(2026)).toEqual({ data: null, error: err });
	});

	it('createEntry maps party_id back to supplier_id', async () => {
		(createExpense as jest.Mock).mockResolvedValue({ error: null });
		const { result } = renderHook(() => useExpenses() as any);

		await result.current.createEntry({
			date: '2026-05-10',
			voucher_number: null,
			voucher_type_id: 1,
			work_id: null,
			party_id: 3,
			category_id: 10,
			description: null,
			net_amount: 1000,
			iva_percent: 21,
			iva_amount: 210,
			total_amount: 1210,
		});

		expect(createExpense).toHaveBeenCalledWith(expect.objectContaining({ supplier_id: 3 }));
	});

	it('updateEntry maps party_id back to supplier_id and forwards the id', async () => {
		(updateExpense as jest.Mock).mockResolvedValue({ error: null });
		const { result } = renderHook(() => useExpenses() as any);

		await result.current.updateEntry(9, {
			date: '2026-05-10',
			voucher_number: null,
			voucher_type_id: 1,
			work_id: null,
			party_id: 3,
			category_id: 10,
			description: null,
			net_amount: 1000,
			iva_percent: 21,
			iva_amount: 210,
			total_amount: 1210,
		});

		expect(updateExpense).toHaveBeenCalledWith(9, expect.objectContaining({ supplier_id: 3 }));
	});

	it('deleteEntry delegates directly to deleteExpense', () => {
		const { result } = renderHook(() => useExpenses() as any);

		expect(result.current.deleteEntry).toBe(deleteExpense);
	});

	it('listParties maps suppliers to {id, name}', async () => {
		(listSuppliers as jest.Mock).mockResolvedValue({
			data: [{ id: 3, name: 'Acme SRL' }],
			error: null,
		});
		const { result } = renderHook(() => useExpenses() as any);

		const res = await result.current.listParties();

		expect(res.data).toEqual([{ id: 3, name: 'Acme SRL' }]);
	});

	it('listParties passes errors through', async () => {
		const err = { message: 'boom' };
		(listSuppliers as jest.Mock).mockResolvedValue({ data: null, error: err });
		const { result } = renderHook(() => useExpenses() as any);

		expect(await result.current.listParties()).toEqual({ data: null, error: err });
	});
});
