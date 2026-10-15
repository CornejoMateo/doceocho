import { renderHook } from '@testing-library/react';
import { useIncomes } from '@/hooks/incomes/use-incomes';
import { useIncomeExpenseTab } from '@/hooks/income-expense/use-income-expense-tab';
import { createIncome, deleteIncome, listIncomes, updateIncome } from '@/lib/incomes/incomes';
import { listClients } from '@/lib/clients/clients';

jest.mock('@/hooks/income-expense/use-income-expense-tab', () => ({
	useIncomeExpenseTab: jest.fn((config) => config),
}));
jest.mock('@/lib/incomes/incomes', () => ({
	listIncomes: jest.fn(),
	createIncome: jest.fn(),
	updateIncome: jest.fn(),
	deleteIncome: jest.fn(),
}));
jest.mock('@/lib/clients/clients', () => ({
	listClients: jest.fn(),
}));

describe('useIncomes', () => {
	beforeEach(() => jest.clearAllMocks());

	it('configures useIncomeExpenseTab with the income category kind and labels', () => {
		renderHook(() => useIncomes() as any);

		expect(useIncomeExpenseTab).toHaveBeenCalledWith(
			expect.objectContaining({
				categoryKind: 'income',
				labels: expect.objectContaining({ entityLabel: 'ingreso', createdToast: 'Ingreso creado' }),
			})
		);
	});

	it('listEntries maps IncomeWithDetails rows to IncomeExpenseEntry, using client as the party', async () => {
		(listIncomes as jest.Mock).mockResolvedValue({
			data: [
				{
					id: 1,
					date: '2026-05-10',
					voucher_number: 'A-1',
					voucher_type_id: 1,
					voucher_type_name: 'Factura A',
					work_id: 7,
					work_name: 'Obra Norte',
					client_id: 3,
					client_name: 'Juan Perez',
					category_id: 10,
					category_name: 'Anticipos',
					description: 'Anticipo',
					net_amount: 1000,
					iva_percent: 21,
					iva_amount: 210,
					total_amount: 1210,
				},
			],
			error: null,
		});
		const { result } = renderHook(() => useIncomes() as any);

		const res = await result.current.listEntries(2026);

		expect(listIncomes).toHaveBeenCalledWith({ year: 2026 });
		expect(res.data?.[0]).toEqual(
			expect.objectContaining({ id: 1, party_id: 3, party_name: 'Juan Perez' })
		);
	});

	it('listEntries passes errors through without mapping', async () => {
		const err = { message: 'boom' };
		(listIncomes as jest.Mock).mockResolvedValue({ data: null, error: err });
		const { result } = renderHook(() => useIncomes() as any);

		expect(await result.current.listEntries(2026)).toEqual({ data: null, error: err });
	});

	it('createEntry maps party_id back to client_id', async () => {
		(createIncome as jest.Mock).mockResolvedValue({ error: null });
		const { result } = renderHook(() => useIncomes() as any);

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

		expect(createIncome).toHaveBeenCalledWith(expect.objectContaining({ client_id: 3 }));
	});

	it('updateEntry maps party_id back to client_id and forwards the id', async () => {
		(updateIncome as jest.Mock).mockResolvedValue({ error: null });
		const { result } = renderHook(() => useIncomes() as any);

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

		expect(updateIncome).toHaveBeenCalledWith(9, expect.objectContaining({ client_id: 3 }));
	});

	it('deleteEntry delegates directly to deleteIncome', () => {
		const { result } = renderHook(() => useIncomes() as any);

		expect(result.current.deleteEntry).toBe(deleteIncome);
	});

	it('listParties maps clients to {id, name} joining name and last_name', async () => {
		(listClients as jest.Mock).mockResolvedValue({
			data: [{ id: 3, name: 'Juan', last_name: 'Perez' }],
			error: null,
		});
		const { result } = renderHook(() => useIncomes() as any);

		const res = await result.current.listParties();

		expect(res.data).toEqual([{ id: 3, name: 'Juan Perez' }]);
	});

	it('listParties falls back to a placeholder name when the client has no name at all', async () => {
		(listClients as jest.Mock).mockResolvedValue({
			data: [{ id: 4, name: '', last_name: '' }],
			error: null,
		});
		const { result } = renderHook(() => useIncomes() as any);

		const res = await result.current.listParties();

		expect(res.data).toEqual([{ id: 4, name: 'Cliente sin nombre' }]);
	});

	it('listParties passes errors through', async () => {
		const err = { message: 'boom' };
		(listClients as jest.Mock).mockResolvedValue({ data: null, error: err });
		const { result } = renderHook(() => useIncomes() as any);

		expect(await result.current.listParties()).toEqual({ data: null, error: err });
	});
});
