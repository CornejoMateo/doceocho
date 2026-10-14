import { renderHook } from '@testing-library/react';
import { useCollections } from '@/hooks/collections/use-collections';
import { useCollectionPaymentTab } from '@/hooks/collection-payment/use-collection-payment-tab';
import {
	createCollection,
	deleteCollection,
	listCollections,
	updateCollection,
} from '@/lib/collections/collections';
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
jest.mock('@/lib/clients/clients', () => ({
	listClients: jest.fn(),
}));

describe('useCollections', () => {
	beforeEach(() => jest.clearAllMocks());

	it('configures useCollectionPaymentTab with the collection category kind and labels', () => {
		renderHook(() => useCollections() as any);

		expect(useCollectionPaymentTab).toHaveBeenCalledWith(
			expect.objectContaining({
				categoryKind: 'collection',
				labels: expect.objectContaining({ entityLabel: 'cobro', createdToast: 'Cobro creado' }),
			})
		);
	});

	it('listEntries maps CollectionWithDetails rows to CollectionPaymentEntry, using client as the party', async () => {
		(listCollections as jest.Mock).mockResolvedValue({
			data: [
				{
					id: 1,
					date: '2026-05-10',
					receipt_number: 'R-1',
					work_id: 7,
					work_name: 'Obra Norte',
					client_id: 3,
					client_name: 'Juan Perez',
					category_id: 10,
					category_name: 'Cuota',
					description: 'Cuota 1',
					amount: 1000,
					payment_method_id: 2,
					payment_method_name: 'Transferencia',
					bank_account_id: null,
					bank_account_name: null,
				},
			],
			error: null,
		});
		const { result } = renderHook(() => useCollections() as any);

		const res = await result.current.listEntries(2026);

		expect(listCollections).toHaveBeenCalledWith({ year: 2026 });
		expect(res.data?.[0]).toEqual(
			expect.objectContaining({ id: 1, party_id: 3, party_name: 'Juan Perez' })
		);
	});

	it('listEntries passes errors through without mapping', async () => {
		const err = { message: 'boom' };
		(listCollections as jest.Mock).mockResolvedValue({ data: null, error: err });
		const { result } = renderHook(() => useCollections() as any);

		expect(await result.current.listEntries(2026)).toEqual({ data: null, error: err });
	});

	it('createEntry maps party_id back to client_id', async () => {
		(createCollection as jest.Mock).mockResolvedValue({ error: null });
		const { result } = renderHook(() => useCollections() as any);

		await result.current.createEntry({
			date: '2026-05-10',
			receipt_number: null,
			work_id: null,
			party_id: 3,
			category_id: 10,
			description: null,
			amount: 1000,
			payment_method_id: 2,
			bank_account_id: null,
		});

		expect(createCollection).toHaveBeenCalledWith(expect.objectContaining({ client_id: 3 }));
	});

	it('updateEntry maps party_id back to client_id and forwards the id', async () => {
		(updateCollection as jest.Mock).mockResolvedValue({ error: null });
		const { result } = renderHook(() => useCollections() as any);

		await result.current.updateEntry(9, {
			date: '2026-05-10',
			receipt_number: null,
			work_id: null,
			party_id: 3,
			category_id: 10,
			description: null,
			amount: 1000,
			payment_method_id: 2,
			bank_account_id: null,
		});

		expect(updateCollection).toHaveBeenCalledWith(9, expect.objectContaining({ client_id: 3 }));
	});

	it('deleteEntry delegates directly to deleteCollection', () => {
		const { result } = renderHook(() => useCollections() as any);

		expect(result.current.deleteEntry).toBe(deleteCollection);
	});

	it('listParties maps clients to {id, name} joining name and last_name', async () => {
		(listClients as jest.Mock).mockResolvedValue({
			data: [{ id: 3, name: 'Juan', last_name: 'Perez' }],
			error: null,
		});
		const { result } = renderHook(() => useCollections() as any);

		const res = await result.current.listParties();

		expect(res.data).toEqual([{ id: 3, name: 'Juan Perez' }]);
	});

	it('listParties falls back to a placeholder name when the client has no name at all', async () => {
		(listClients as jest.Mock).mockResolvedValue({
			data: [{ id: 4, name: '', last_name: '' }],
			error: null,
		});
		const { result } = renderHook(() => useCollections() as any);

		const res = await result.current.listParties();

		expect(res.data).toEqual([{ id: 4, name: 'Cliente sin nombre' }]);
	});

	it('listParties passes errors through', async () => {
		const err = { message: 'boom' };
		(listClients as jest.Mock).mockResolvedValue({ data: null, error: err });
		const { result } = renderHook(() => useCollections() as any);

		expect(await result.current.listParties()).toEqual({ data: null, error: err });
	});
});
