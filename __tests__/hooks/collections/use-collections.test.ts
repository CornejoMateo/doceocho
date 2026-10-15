import { renderHook } from '@testing-library/react';
import { useCollections } from '@/hooks/collections/use-collections';
import { useCollectionPaymentTab } from '@/hooks/collection-payment/use-collection-payment-tab';
import {
	createCollection,
	deleteCollection,
	listCollections,
	updateCollection,
} from '@/lib/collections/collections';
import {
	createTransaction,
	deleteTransaction,
	listBalanceTransactionsForYear,
	updateTransaction,
} from '@/lib/balances/balance_transactions';
import { getBalancesByClientId } from '@/lib/balances/balances';
import { listClients } from '@/lib/clients/clients';

jest.mock('@/hooks/collection-payment/use-collection-payment-tab', () => ({
	useCollectionPaymentTab: jest.fn((config) => config),
}));
jest.mock('@/lib/collections/collections', () => ({
	listCollections: jest.fn(),
	createCollection: jest.fn(),
	updateCollection: jest.fn(),
	deleteCollection: jest.fn(),
}));
jest.mock('@/lib/balances/balance_transactions', () => ({
	createTransaction: jest.fn(),
	updateTransaction: jest.fn(),
	deleteTransaction: jest.fn(),
	listBalanceTransactionsForYear: jest.fn(),
}));
jest.mock('@/lib/balances/balances', () => ({
	getBalancesByClientId: jest.fn(),
}));
jest.mock('@/lib/clients/clients', () => ({
	listClients: jest.fn(),
}));

describe('useCollections', () => {
	beforeEach(() => jest.clearAllMocks());

	it('configures useCollectionPaymentTab with the collection category kind, partyOptional, linkedLabel and labels', () => {
		renderHook(() => useCollections() as any);

		expect(useCollectionPaymentTab).toHaveBeenCalledWith(
			expect.objectContaining({
				categoryKind: 'collection',
				partyOptional: true,
				linkedLabel: 'Cuenta',
				labels: expect.objectContaining({ entityLabel: 'cobro', createdToast: 'Cobro creado' }),
			})
		);
	});

	describe('listEntries', () => {
		it('merges general collections and client-sourced collections (balance_transactions), sorted by date desc', async () => {
			(listCollections as jest.Mock).mockResolvedValue({
				data: [
					{
						id: 1,
						date: '2026-05-10',
						receipt_number: 'R-1',
						work_id: 7,
						work_name: 'Obra Norte',
						category_id: 10,
						category_name: 'Cuota',
						description: 'Cobro general',
						amount: 1000,
						payment_method_id: 2,
						payment_method_name: 'Transferencia',
						bank_account_id: null,
						bank_account_name: null,
					},
				],
				error: null,
			});
			(listBalanceTransactionsForYear as jest.Mock).mockResolvedValue({
				data: [
					{
						id: 1,
						balance_id: 8,
						date: '2026-06-20',
						receipt_number: null,
						work_id: null,
						work_name: null,
						category_id: null,
						category_name: null,
						notes: 'Cobro cliente',
						amount: 500,
						payment_method_id: 3,
						payment_method_name: 'Efectivo',
						bank_account_id: null,
						bank_account_name: null,
						client_id: 4,
						client_name: 'Juan Perez',
					},
				],
				error: null,
			});
			const { result } = renderHook(() => useCollections() as any);

			const res = await result.current.listEntries(2026);

			expect(listCollections).toHaveBeenCalledWith({ year: 2026 });
			expect(listBalanceTransactionsForYear).toHaveBeenCalledWith(2026);
			expect(res.data).toHaveLength(2);
			// Client-sourced collection is dated later, so it comes first.
			expect(res.data?.[0]).toEqual(
				expect.objectContaining({
					id: 1,
					date: '2026-06-20',
					source: 'client',
					party_id: 4,
					party_name: 'Juan Perez',
					balance_id: 8,
					description: 'Cobro cliente',
					amount: 500,
				})
			);
			expect(res.data?.[1]).toEqual(
				expect.objectContaining({
					id: 1,
					date: '2026-05-10',
					source: 'general',
					party_id: null,
					party_name: null,
					balance_id: null,
				})
			);
		});

		it('tie-breaks by source when date, created_at and id are all equal across sources', async () => {
			(listCollections as jest.Mock).mockResolvedValue({
				data: [
					{
						id: 5,
						date: '2026-05-10',
						receipt_number: null,
						work_id: null,
						work_name: null,
						category_id: null,
						category_name: null,
						description: 'General',
						amount: 100,
						payment_method_id: 2,
						payment_method_name: 'Transferencia',
						bank_account_id: null,
						bank_account_name: null,
					},
				],
				error: null,
			});
			(listBalanceTransactionsForYear as jest.Mock).mockResolvedValue({
				data: [
					{
						id: 5,
						balance_id: 8,
						date: '2026-05-10',
						receipt_number: null,
						work_id: null,
						work_name: null,
						category_id: null,
						category_name: null,
						notes: 'Cliente',
						amount: 100,
						payment_method_id: 3,
						payment_method_name: 'Efectivo',
						bank_account_id: null,
						bank_account_name: null,
						client_id: 4,
						client_name: 'Juan Perez',
					},
				],
				error: null,
			});
			const { result } = renderHook(() => useCollections() as any);

			const res = await result.current.listEntries(2026);

			expect(res.data).toHaveLength(2);
			// 'client'.localeCompare('general') < 0, so the client-sourced entry comes first.
			expect(res.data?.[0].source).toBe('client');
			expect(res.data?.[1].source).toBe('general');
		});

		it('passes through a general-collections error without calling the client source', async () => {
			const err = { message: 'boom' };
			(listCollections as jest.Mock).mockResolvedValue({ data: null, error: err });
			(listBalanceTransactionsForYear as jest.Mock).mockResolvedValue({ data: [], error: null });
			const { result } = renderHook(() => useCollections() as any);

			expect(await result.current.listEntries(2026)).toEqual({ data: null, error: err });
		});

		it('passes through a client-sourced collections error', async () => {
			const err = { message: 'boom' };
			(listCollections as jest.Mock).mockResolvedValue({ data: [], error: null });
			(listBalanceTransactionsForYear as jest.Mock).mockResolvedValue({ data: null, error: err });
			const { result } = renderHook(() => useCollections() as any);

			expect(await result.current.listEntries(2026)).toEqual({ data: null, error: err });
		});
	});

	describe('createEntry', () => {
		it('routes to collections when no party/account is set', async () => {
			(createCollection as jest.Mock).mockResolvedValue({ error: null });
			const { result } = renderHook(() => useCollections() as any);

			await result.current.createEntry({
				date: '2026-05-10',
				receipt_number: null,
				work_id: null,
				party_id: null,
				balance_id: null,
				category_id: 10,
				description: null,
				amount: 1000,
				payment_method_id: 2,
				payment_method_name: 'Transferencia',
				bank_account_id: null,
			});

			expect(createCollection).toHaveBeenCalled();
			expect(createTransaction).not.toHaveBeenCalled();
		});

		it('routes to balance_transactions when party and account are set, filling payment_method text and notes', async () => {
			(createTransaction as jest.Mock).mockResolvedValue({ error: null });
			const { result } = renderHook(() => useCollections() as any);

			await result.current.createEntry({
				date: '2026-05-10',
				receipt_number: 'R-1',
				work_id: null,
				party_id: 3,
				balance_id: 8,
				category_id: null,
				description: 'Cuota mensual',
				amount: 1000,
				payment_method_id: 2,
				payment_method_name: 'Transferencia',
				bank_account_id: null,
			});

			expect(createTransaction).toHaveBeenCalledWith(
				expect.objectContaining({
					balance_id: 8,
					amount: 1000,
					payment_method: 'Transferencia',
					payment_method_id: 2,
					notes: 'Cuota mensual',
					quote_usd: null,
					usd_amount: null,
				})
			);
			expect(createCollection).not.toHaveBeenCalled();
		});
	});

	describe('updateEntry', () => {
		it('routes to updateCollection for a general-origin entry', async () => {
			(updateCollection as jest.Mock).mockResolvedValue({ error: null });
			const { result } = renderHook(() => useCollections() as any);
			const entry = { id: 9, source: 'general' } as any;

			await result.current.updateEntry(
				9,
				{
					date: '2026-05-10',
					receipt_number: null,
					work_id: null,
					party_id: null,
					category_id: 10,
					description: null,
					amount: 1000,
					payment_method_id: 2,
					payment_method_name: 'Transferencia',
					bank_account_id: null,
				},
				entry
			);

			expect(updateCollection).toHaveBeenCalledWith(9, expect.objectContaining({ amount: 1000 }));
			expect(updateTransaction).not.toHaveBeenCalled();
		});

		it('routes to updateTransaction for a client-origin entry', async () => {
			(updateTransaction as jest.Mock).mockResolvedValue({ error: null });
			const { result } = renderHook(() => useCollections() as any);
			const entry = { id: 9, source: 'client' } as any;

			await result.current.updateEntry(
				9,
				{
					date: '2026-05-10',
					receipt_number: null,
					work_id: null,
					party_id: 3,
					balance_id: 8,
					category_id: null,
					description: 'Nota',
					amount: 1000,
					payment_method_id: 2,
					payment_method_name: 'Efectivo',
					bank_account_id: null,
				},
				entry
			);

			expect(updateTransaction).toHaveBeenCalledWith(
				9,
				expect.objectContaining({ balance_id: 8, amount: 1000 })
			);
			expect(updateCollection).not.toHaveBeenCalled();
		});
	});

	describe('deleteEntry', () => {
		it('routes to deleteCollection for a general-origin entry', async () => {
			const { result } = renderHook(() => useCollections() as any);

			await result.current.deleteEntry(9, { source: 'general' });

			expect(deleteCollection).toHaveBeenCalledWith(9);
			expect(deleteTransaction).not.toHaveBeenCalled();
		});

		it('routes to deleteTransaction (which also cleans up balance files) for a client-origin entry', async () => {
			(deleteTransaction as jest.Mock).mockResolvedValue({ data: null, error: null });
			const { result } = renderHook(() => useCollections() as any);

			await result.current.deleteEntry(9, { source: 'client' });

			expect(deleteTransaction).toHaveBeenCalledWith(9);
			expect(deleteCollection).not.toHaveBeenCalled();
		});
	});

	describe('listParties', () => {
		it('maps clients to {id, name} joining name and last_name', async () => {
			(listClients as jest.Mock).mockResolvedValue({
				data: [{ id: 3, name: 'Juan', last_name: 'Perez' }],
				error: null,
			});
			const { result } = renderHook(() => useCollections() as any);

			const res = await result.current.listParties();

			expect(res.data).toEqual([{ id: 3, name: 'Juan Perez' }]);
		});

		it('falls back to a placeholder name when the client has no name at all', async () => {
			(listClients as jest.Mock).mockResolvedValue({
				data: [{ id: 4, name: '', last_name: '' }],
				error: null,
			});
			const { result } = renderHook(() => useCollections() as any);

			const res = await result.current.listParties();

			expect(res.data).toEqual([{ id: 4, name: 'Cliente sin nombre' }]);
		});

		it('passes errors through', async () => {
			const err = { message: 'boom' };
			(listClients as jest.Mock).mockResolvedValue({ data: null, error: err });
			const { result } = renderHook(() => useCollections() as any);

			expect(await result.current.listParties()).toEqual({ data: null, error: err });
		});
	});

	describe('loadAccounts', () => {
		it("maps a client's balances to {id, name} options, resolving obra/presupuesto, start date and notes", async () => {
			(getBalancesByClientId as jest.Mock).mockResolvedValue({
				data: [
					{
						id: 8,
						start_date: '2026-01-15',
						notes: 'Cuenta principal de la obra',
						budget: {
							number: 'P-001',
							folder_budget: { work: { name: 'Casa Norte', locality: '', address: '' } },
						},
					},
				],
				error: null,
			});
			const { result } = renderHook(() => useCollections() as any);

			const res = await result.current.loadAccounts(3);

			expect(getBalancesByClientId).toHaveBeenCalledWith(3);
			expect(res.data).toHaveLength(1);
			expect(res.data?.[0].id).toBe(8);
			expect(res.data?.[0].name).toContain('Casa Norte');
			expect(res.data?.[0].name).toContain('15/01/2026');
		});

		it('falls back to a generic label when nothing can be resolved', async () => {
			(getBalancesByClientId as jest.Mock).mockResolvedValue({
				data: [{ id: 9, start_date: null, notes: null, budget: null }],
				error: null,
			});
			const { result } = renderHook(() => useCollections() as any);

			const res = await result.current.loadAccounts(3);

			expect(res.data).toEqual([{ id: 9, name: 'Cuenta #9' }]);
		});

		it('passes errors through', async () => {
			const err = { message: 'boom' };
			(getBalancesByClientId as jest.Mock).mockResolvedValue({ data: null, error: err });
			const { result } = renderHook(() => useCollections() as any);

			expect(await result.current.loadAccounts(3)).toEqual({ data: null, error: err });
		});
	});
});
